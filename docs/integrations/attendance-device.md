# Biometric / Fingerprint Attendance — Device Integration

This lets a fingerprint/biometric attendance machine (e.g. ZKTeco) feed
attendance straight into Uttoron. The app runs on Vercel (cloud); the machine
sits on your office LAN. A cloud function can't reach a LAN device directly, so
a tiny **local bridge agent** runs on an office PC: it reads punches from the
machine and POSTs them to a secure ingestion API, which maps each punch to a
student and records attendance.

```
[Fingerprint machine] --LAN--> [Bridge agent on office PC] --HTTPS--> [Uttoron API] --> Attendance
```

Everything is **device-agnostic**: the API accepts a normalized punch, so any
machine works as long as the agent can read it (sample agent included).

## One-time setup

1. **Enable ingestion (server).** Set a long random secret on the server
   (Vercel → Project → Environment Variables):
   ```
   ATTENDANCE_DEVICE_KEY=<a long random secret>
   ```
   Until this is set the ingestion endpoint stays **disabled** (returns 503), so
   it is never an open write endpoint. Optional tuning:
   ```
   ATTENDANCE_MORNING_START=09:00
   ATTENDANCE_EVENING_START=16:00
   ATTENDANCE_LATE_GRACE_MIN=15
   ```

2. **Enroll students.** Each person has an enrollment id on the machine (e.g.
   fingerprint slot `42`). Map it to the student once:
   ```
   POST /api/integrations/attendance/enroll        (admin login)
   { "student_id": 123, "device_user_id": "42" }
   ```
   (A punch for an unmapped id is still stored — just marked `unmapped` — so you
   never lose data; map it later and re-send if needed.)

3. **Run the bridge agent** on an office PC on the same network as the machine
   (see `tools/attendance-agent/`).

## Ingestion API

`POST /api/integrations/attendance/punch`
Header: `X-Device-Key: <ATTENDANCE_DEVICE_KEY>`
Body (single or batch):
```json
{ "punches": [
  { "device_user_id": "42", "timestamp": "2026-10-11T09:03:00+06:00", "direction": "in", "device_id": "gate-1" }
] }
```
- `device_user_id` (required) — the id on the machine.
- `timestamp` (required) — ISO 8601 (include the timezone offset, or UTC `Z`).
- `direction` (optional) — `in` / `out`.
- `device_id` (optional) — identifies the machine if you have several.

Response:
```json
{ "message": "Punches processed",
  "data": { "received": 1, "stored": 1, "duplicates": 0, "unmapped": 0, "created": 1, "updated": 0, "errors": 0 } }
```

**Idempotent:** re-sending the same punch (same `device_id`+`device_user_id`+
`timestamp`) is a no-op (`duplicates`), and a second punch in the same session
updates the Attendance row (punch-out) instead of creating a duplicate.

**Review:** `GET /api/integrations/attendance/punches?status=unmapped` (admin)
lists recent punches so you can spot unmapped ids.

## How a punch becomes attendance
- Date & time are computed in Asia/Dhaka.
- Session: before noon → `morning`, else `evening`.
- Status: on time (≤ session start + grace) → `present`, else `late`.
- Batch/course come from the student's current batch.
- Keyed by (student, batch, date, session) so it's safe to re-run.

Tune the session/late rules via the env vars above once the machine is in place
and your real schedule is confirmed. Raw punches are always kept, so attendance
can be re-derived if the rules change.

## Security
- The endpoint requires `X-Device-Key`; keep that secret off any client/browser
  (only the agent on the office PC has it).
- Use HTTPS (the production URL) so the key isn't sent in the clear.
- Rotate the key by changing `ATTENDANCE_DEVICE_KEY` (comma-separate to allow
  more than one site/device).
