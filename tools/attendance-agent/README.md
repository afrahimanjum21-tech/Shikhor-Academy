# Attendance bridge agent

Small standalone script that reads punches from a biometric/fingerprint machine
and sends them to Uttoron. It runs on an office PC on the same LAN as the
machine — it is **not** part of the deployed app.

Full guide: `docs/integrations/attendance-device.md`.

## Quick start

```bash
# 1. (real ZKTeco device only) install the reader library here:
npm init -y && npm install node-zklib

# 2. point it at your site + the device key you set on the server:
set UTTORON_API_URL=https://your-site.com/api/integrations/attendance/punch
set UTTORON_DEVICE_KEY=the-same-secret-as-ATTENDANCE_DEVICE_KEY
set DEVICE_IP=192.168.1.201

# 3a. pull from the machine:
node agent.mjs --zk

# 3b. OR test the whole pipeline with NO machine (uses the sample file):
node agent.mjs --file sample-punches.json
```

To run it continuously (e.g. every few minutes) use Windows Task Scheduler or a
cron job. Re-sending is safe — the server de-duplicates punches.
