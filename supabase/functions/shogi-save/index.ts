import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MAX_BODY_BYTES = 512 * 1024;
const SLOT_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const FIXED_ORIGINS = new Set([
  "https://yo666ha-boop.github.io",
  "https://ai-shogi-yaneuraou-iphone.vercel.app",
  "https://ai-shogi-yaneuraou-iphone-yo666ha-7357s-projects.vercel.app",
]);

function originAllowed(origin: string) {
  if (!origin) return true;
  if (FIXED_ORIGINS.has(origin)) return true;
  return /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);
}

function cors(origin: string) {
  const h = new Headers({
    "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  if (origin && originAllowed(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Vary", "Origin");
  }
  return h;
}

function reply(origin: string, status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: cors(origin) });
}

function syncKey(req: Request) {
  const m = (req.headers.get("authorization") || "").match(/^Bearer\s+([A-Za-z0-9_-]{24,128})$/);
  return m?.[1] || "";
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest, b => b.toString(16).padStart(2, "0")).join("");
}

function validPayload(p: any) {
  const st = p?.st;
  return !!(p && p.version === 1 && st && Array.isArray(st.b) && st.b.length === 81 && st.h && Array.isArray(st.log));
}

function normalizeSlotName(value: unknown) {
  return String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ");
}

async function rpc(name: string, body: Record<string, unknown>) {
  const base = Deno.env.get("SUPABASE_URL") || "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!base || !service) throw new Error("supabase_runtime_not_configured");
  const r = await fetch(`${base}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || data === null) throw new Error(`rpc_${name}_${r.status}`);
  return data;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  if (req.method === "OPTIONS") {
    if (!originAllowed(origin)) return reply(origin, 403, { ok: false, error: "origin_not_allowed" });
    return new Response(null, { status: 204, headers: cors(origin) });
  }
  if (!originAllowed(origin)) return reply(origin, 403, { ok: false, error: "origin_not_allowed" });

  const code = syncKey(req);
  if (!code) return reply(origin, 401, { ok: false, error: "invalid_sync_key" });
  const saveKey = await sha256Hex(code);

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("mode") || "";
      const slotId = url.searchParams.get("slot") || "";

      if (mode === "list") {
        const result = await rpc("shogi_cloud_list", { p_save_key: saveKey });
        if (result?.status !== "ok" || !Array.isArray(result.slots)) throw new Error("unexpected_list_response");
        return reply(origin, 200, { ok: true, slots: result.slots });
      }

      if (slotId) {
        if (!SLOT_ID_RE.test(slotId)) return reply(origin, 400, { ok: false, error: "invalid_slot_id" });
        const result = await rpc("shogi_cloud_get_slot", { p_save_key: saveKey, p_slot_id: slotId });
        if (result?.status !== "ok") throw new Error("unexpected_get_slot_response");
        return reply(origin, 200, { ok: true, record: result.record ?? null });
      }

      const result = await rpc("shogi_cloud_get", { p_save_key: saveKey });
      if (result?.status !== "ok") throw new Error("unexpected_get_response");
      return reply(origin, 200, { ok: true, record: result.record ?? null });
    }

    if (req.method === "PUT") {
      const text = await req.text();
      if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return reply(origin, 413, { ok: false, error: "payload_too_large" });
      let body: any;
      try { body = text ? JSON.parse(text) : {}; } catch { return reply(origin, 400, { ok: false, error: "invalid_request" }); }
      const baseRevision = Number(body.baseRevision);
      const deviceId = String(body.deviceId || "").slice(0, 96);
      const payload = body.payload;
      if (!Number.isInteger(baseRevision) || baseRevision < 0 || !deviceId || !validPayload(payload)) return reply(origin, 400, { ok: false, error: "invalid_request" });
      const payloadBytes = new TextEncoder().encode(JSON.stringify(payload)).byteLength;
      if (payloadBytes > MAX_BODY_BYTES) return reply(origin, 413, { ok: false, error: "payload_too_large" });

      const slotId = String(body.slotId || "");
      if (slotId) {
        const slotName = normalizeSlotName(body.slotName);
        if (!SLOT_ID_RE.test(slotId) || !slotName || [...slotName].length > 40) return reply(origin, 400, { ok: false, error: "invalid_slot" });
        const result = await rpc("shogi_cloud_put_slot", {
          p_save_key: saveKey,
          p_slot_id: slotId,
          p_slot_name: slotName,
          p_base_revision: baseRevision,
          p_device_id: deviceId,
          p_payload: payload,
        });
        if (result?.status === "conflict") return reply(origin, 409, { ok: false, error: "revision_conflict", record: result.record ?? null });
        if (result?.status !== "ok" || !result.record) throw new Error("unexpected_put_slot_response");
        return reply(origin, 200, { ok: true, record: result.record });
      }

      const result = await rpc("shogi_cloud_put", {
        p_save_key: saveKey,
        p_base_revision: baseRevision,
        p_device_id: deviceId,
        p_payload: payload,
      });
      if (result?.status === "conflict") return reply(origin, 409, { ok: false, error: "revision_conflict", record: result.record ?? null });
      if (result?.status !== "ok" || !result.record) throw new Error("unexpected_put_response");
      return reply(origin, 200, { ok: true, record: result.record });
    }

    return reply(origin, 405, { ok: false, error: "method_not_allowed" });
  } catch (error) {
    console.error("shogi-save", error);
    return reply(origin, 503, { ok: false, error: "cloud_unavailable" });
  }
});
