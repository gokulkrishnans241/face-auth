import express from 'express';
import {
  markFaceAttendance,
  correctAttendance,
  getStudentAttendanceHistory,
} from '../controllers/attendanceController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

router.post('/mark-face', markFaceAttendance);
router.put('/correct/:recordId', authorize('admin'), correctAttendance);
router.get('/student/:studentId?', getStudentAttendanceHistory);

export default router;
