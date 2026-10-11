import { Router } from 'express';
import { deviceAuth } from '../middleware/deviceAuth.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/role.js';
import * as AttendanceDevice from '../controllers/Integration/AttendanceDeviceController.js';

// Integration endpoints for external devices/agents. These do NOT use the user
// session — the device ingestion authenticates with a device key (see
// middleware/deviceAuth.js); the admin-facing enroll/review routes use the
// normal user auth + role.
const router = Router();

// Biometric/fingerprint attendance machine (via the local bridge agent).
router.post('/integrations/attendance/punch', deviceAuth, AttendanceDevice.ingest);

// Admin: map a student to their device enrollment id, and review raw punches.
router.post('/integrations/attendance/enroll', authenticate, authorize('admin'), AttendanceDevice.enroll);
router.get('/integrations/attendance/punches', authenticate, authorize('admin'), AttendanceDevice.listPunches);

export default router;
