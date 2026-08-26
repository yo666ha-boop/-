const crypto = require('crypto');

const DEFAULT_ORIGINS = [
  'https://yo666ha-boop.github.io',
  'https://ai-shogi-yaneuraou-iphone.vercel.app',
  'https://ai-shogi-yaneuraou-iphone-yo666ha-7357s-projects.vercel.app'
];
const MAX_BODY_BYTES = 512 * 1024;
const KEY_PREFIX = 'ai-shogi:game:v1:';

function allowedOrigins() {
  const extra = String(process.env.SHOGI_CLOUD_ALLOWED_ORIGINS || '')
    .split(',').map(v => v.trim()).filter(Boolean);
  return new Set([...DEFAULT_ORIGINS, ...extra]);
}

function setCors(req, res) {
  const origin = String(req.headers.origin || '');
  const allowed = allowedOrigins();
  if (origin && allowed.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  res.setHeader('Cache-Control', 'no-store');
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function getSyncKey(req) {
  const auth = String(req.headers.authorization || '');
  const m = auth.match(/^Bearer\s+([A-Za-z0-9_-]{24,128})$/);
  return m ? m[1] : '';
}

function redisKey(syncKey) {
  const digest = crypto.createHash('sha256').update(syncKey, 'utf8').digest('hex');
  return KEY_PREFIX + digest;
}

async function redisCommand(command) {
  const base = String(process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || '');
  if (!base || !token) throw new Error('cloud storage is not configured');
  const response = await fetch(base, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.error) {
    throw new Error(data?.error || `redis ${response.status}`);
  }
  return data.result;
}

function validPayload(p) {
  const st = p && p.st;
  return !!(p && p.version === 1 && st && Array.isArray(st.b) && st.b.length === 81 && st.h && Array.isArray(st.log));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let size = 0;
  const parts = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error('payload too large'), { status: 413 });
    parts.push(chunk);
  }
  if (!parts.length) return {};
  return JSON.parse(Buffer.concat(parts).toString('utf8'));
}

const CAS_SCRIPT = `
local current = redis.call('GET', KEYS[1])
local base = tonumber(ARGV[1]) or 0
if current then
  local obj = cjson.decode(current)
  local rev = tonumber(obj.revision) or 0
  if rev ~= base then return {'CONFLICT', current} end
elseif base ~= 0 then
  return {'CONFLICT', ''}
end
local nextRev = base + 1
local rec = {
  revision = nextRev,
  updatedAt = tonumber(ARGV[4]),
  deviceId = ARGV[3],
  payload = cjson.decode(ARGV[2])
}
local encoded = cjson.encode(rec)
redis.call('SET', KEYS[1], encoded)
return {'OK', encoded}
`;

module.exports = async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const origin = String(req.headers.origin || '');
  if (origin && !allowedOrigins().has(origin)) return json(res, 403, { ok: false, error: 'origin_not_allowed' });

  const syncKey = getSyncKey(req);
  if (!syncKey) return json(res, 401, { ok: false, error: 'invalid_sync_key' });
  const key = redisKey(syncKey);

  try {
    if (req.method === 'GET') {
      const raw = await redisCommand(['GET', key]);
      if (!raw) return json(res, 200, { ok: true, record: null });
      const record = JSON.parse(raw);
      return json(res, 200, { ok: true, record });
    }

    if (req.method === 'PUT') {
      const body = await readBody(req);
      const baseRevision = Number(body.baseRevision);
      const deviceId = String(body.deviceId || '').slice(0, 96);
      const payload = body.payload;
      if (!Number.isInteger(baseRevision) || baseRevision < 0 || !deviceId || !validPayload(payload)) {
        return json(res, 400, { ok: false, error: 'invalid_request' });
      }
      const serialized = JSON.stringify(payload);
      if (Buffer.byteLength(serialized, 'utf8') > MAX_BODY_BYTES) return json(res, 413, { ok: false, error: 'payload_too_large' });
      const result = await redisCommand(['EVAL', CAS_SCRIPT, '1', key, String(baseRevision), serialized, deviceId, String(Date.now())]);
      const status = Array.isArray(result) ? result[0] : '';
      const raw = Array.isArray(result) ? result[1] : '';
      if (status === 'CONFLICT') {
        return json(res, 409, { ok: false, error: 'revision_conflict', record: raw ? JSON.parse(raw) : null });
      }
      if (status !== 'OK' || !raw) throw new Error('unexpected storage response');
      return json(res, 200, { ok: true, record: JSON.parse(raw) });
    }

    res.setHeader('Allow', 'GET,PUT,OPTIONS');
    return json(res, 405, { ok: false, error: 'method_not_allowed' });
  } catch (error) {
    const status = Number(error.status) || 503;
    return json(res, status, { ok: false, error: status === 503 ? 'cloud_unavailable' : error.message });
  }
};
