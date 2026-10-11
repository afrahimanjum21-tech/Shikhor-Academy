#!/usr/bin/env node
/**
 * Uttoron — local bridge agent for a biometric/fingerprint attendance machine.
 *
 * Runs on an office PC on the SAME network as the machine. It reads punches and
 * POSTs them to the Uttoron ingestion API. Device-agnostic: swap `fromZkteco`
 * for your device's reader; the API only needs normalized punches.
 *
 * This file is NOT part of the deployed app — run it separately:
 *   1) npm init -y && npm install node-zklib        (only for a real ZKTeco)
 *   2) set env vars (below) and:  node agent.mjs --zk
 *      or test with no machine:   node agent.mjs --file sample-punches.json
 *
 * Env:
 *   UTTORON_API_URL   e.g. https://your-site.com/api/integrations/attendance/punch
 *   UTTORON_DEVICE_KEY  must equal the server's ATTENDANCE_DEVICE_KEY
 *   DEVICE_IP, DEVICE_PORT (default 4370), DEVICE_ID (optional label)
 */

const API_URL = process.env.UTTORON_API_URL;
const DEVICE_KEY = process.env.UTTORON_DEVICE_KEY;
const DEVICE_IP = process.env.DEVICE_IP || '192.168.1.201';
const DEVICE_PORT = parseInt(process.env.DEVICE_PORT || '4370', 10);
const DEVICE_ID = process.env.DEVICE_ID || 'office-1';

if (!API_URL || !DEVICE_KEY) {
  console.error('Set UTTORON_API_URL and UTTORON_DEVICE_KEY first.');
  process.exit(1);
}

// POST punches to Uttoron (batched). The API de-duplicates, so re-sends are safe.
async function postPunches(punches) {
  if (!punches.length) { console.log('No punches to send.'); return; }
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Device-Key': DEVICE_KEY },
    body: JSON.stringify({ punches }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) { console.error('Ingestion failed:', res.status, body); process.exit(1); }
  console.log('Sent', punches.length, 'punch(es):', body.data || body);
}

// Normalize to the API shape.
const toPunch = (deviceUserId, timestamp, direction) => ({
  device_id: DEVICE_ID,
  device_user_id: String(deviceUserId),
  timestamp: new Date(timestamp).toISOString(),
  direction: direction || null,
});

// --- Source A: a real ZKTeco device (needs `npm install node-zklib`) ---------
async function fromZkteco() {
  const { default: ZKLib } = await import('node-zklib'); // installed locally
  const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, 10000, 4000);
  await zk.createSocket();
  const logs = await zk.getAttendances();
  await zk.disconnect();
  // node-zklib returns { data: [{ deviceUserId, recordTime, ... }] }
  return (logs?.data || []).map((r) => toPunch(r.deviceUserId ?? r.userId, r.recordTime ?? r.timestamp));
}

// --- Source B: a JSON file (test the pipeline with NO machine) ----------------
async function fromFile(path) {
  const fs = await import('node:fs/promises');
  const rows = JSON.parse(await fs.readFile(path, 'utf8'));
  // Accept [{device_user_id, timestamp, direction?}] or [{userId, time}]
  return rows.map((r) => toPunch(r.device_user_id ?? r.userId, r.timestamp ?? r.time, r.direction));
}

async function main() {
  const args = process.argv.slice(2);
  let punches;
  if (args.includes('--file')) {
    punches = await fromFile(args[args.indexOf('--file') + 1]);
  } else if (args.includes('--zk')) {
    punches = await fromZkteco();
  } else {
    console.error('Usage: node agent.mjs --zk    OR    node agent.mjs --file punches.json');
    process.exit(1);
  }
  await postPunches(punches);
}

main().catch((e) => { console.error('Agent error:', e.message); process.exit(1); });
