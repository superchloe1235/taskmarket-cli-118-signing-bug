// Evidence probe: Taskmarket CLI 1.18.0 signs "taskmarket:market:*" but the API verifies "taskmarket:*".
// Reads YOUR OWN local keystore (same path/format as the CLI), derives the account,
// signs several candidate messages and POSTs them to the request-upload-url endpoint.
// Nothing is uploaded; on success the server only returns a pre-signed upload URL.
//
// Run (inside a project that has viem installed, e.g. wherever you installed taskmarket):
//   node probe.mjs <taskId>
//
// Requirements: taskmarket CLI 1.18.0 installed & initialized (keystore present at ~/.taskmarket/keystore.json).

import fs from 'node:fs';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
const { privateKeyToAccount } = await import('viem/accounts');

const TASK = process.argv[2];
if (!TASK) { console.error('usage: node probe.mjs <taskId>'); process.exit(1); }

const home = process.env.TASKMARKET_HOME?.trim() || path.join(os.homedir(), '.taskmarket');
const ks = JSON.parse(fs.readFileSync(path.join(home, 'keystore.json'), 'utf8'));

// 1. fetch the device encryption key (exactly like the CLI's signer does)
const res = await fetch(ks.keyServerUrl + '/api/devices/' + ks.deviceId + '/key', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ deviceId: ks.deviceId, apiToken: ks.apiToken })
});
const j = await res.json();
if (!j.deviceEncryptionKey) { console.error('no DEK:', JSON.stringify(j).slice(0, 200)); process.exit(1); }

// 2. decrypt the keystore private key (AES-256-GCM, layout: iv | tag | ciphertext)
const key = Buffer.from(j.deviceEncryptionKey, 'hex');
const blob = Buffer.from(ks.encryptedKey, 'hex');
const d = crypto.createDecipheriv('aes-256-gcm', key, blob.subarray(0, 12));
d.setAuthTag(blob.subarray(12, 28));
const pk = Buffer.concat([d.update(blob.subarray(28)), d.final()]).toString('utf8');
const acct = privateKeyToAccount(pk);
console.log('wallet address:', acct.address, '| matches keystore:', acct.address.toLowerCase() === ks.walletAddress.toLowerCase());

// 3. probe candidate messages
const body = { taskId: TASK, workerAddress: acct.address, signature: null, fileName: 'probe.txt', mimeType: 'text/plain', role: 'final', sizeBytes: 1, chainId: 8453 };
const variants = [
  ['v1 cli-format   ', `taskmarket:market:submit:${TASK}`],
  ['v2 no-market    ', `taskmarket:submit:${TASK}`],
  ['v3 with-chain   ', `taskmarket:market:submit:${TASK}:8453`],
  ['v4 plain-taskid ', TASK],
];
for (const [name, msg] of variants) {
  body.signature = await acct.signMessage({ message: msg });
  try {
    const r = await fetch(ks.keyServerUrl + '/api/tasks/' + TASK + '/submissions/request-upload-url', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const text = await r.text();
    console.log(`${name} | status ${r.status} | ${text.slice(0, 160)}`);
  } catch (e) { console.log(`${name} | FAIL ${String(e).slice(0, 120)}`); }
  await new Promise(r2 => setTimeout(r2, 1500));
}
