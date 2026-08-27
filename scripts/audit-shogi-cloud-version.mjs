import fs from 'node:fs';

const cloudPath = 'shogi-v21528/cloud-save21531.js';
const swPath = 'shogi-v21528/coi-serviceworker.js';
const cloud = fs.readFileSync(cloudPath, 'utf8');
const sw = fs.readFileSync(swPath, 'utf8');

const urlMatch = sw.match(/cloud-save21531\.js\?v=(21531[a-z0-9_-]+)/i);
const reloadMatch = sw.match(/ai-shogi-coi-reload-(21531[a-z0-9_-]+)/i);
const runtimeMatch = cloud.match(/version:\s*['"](21531[a-z0-9_-]+)['"]/i);

const values = {
  serviceWorkerCloudUrl: urlMatch?.[1] ?? null,
  serviceWorkerReloadKey: reloadMatch?.[1] ?? null,
  runtimeReportedVersion: runtimeMatch?.[1] ?? null,
};

console.log(JSON.stringify(values, null, 2));
if (Object.values(values).some(v => !v)) {
  console.error('FAIL_SHOGI_CLOUD_VERSION_MISSING');
  process.exit(1);
}
if (new Set(Object.values(values)).size !== 1) {
  console.error('FAIL_SHOGI_CLOUD_VERSION_MISMATCH');
  process.exit(2);
}
console.log('PASS_SHOGI_CLOUD_VERSION_CONSISTENT');
