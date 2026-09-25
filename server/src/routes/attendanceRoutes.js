import express from 'express';
import {
  markFaceAttendance,
  toggleStudentAttendanceStatus,
  getClassroomPeriodMatrix,
  correctAttendance,
  getStudentAttendanceHistory,
} from '../controllers/attendanceController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

router.post('/mark-face', markFaceAttendance);
router.post('/toggle-status', authorize('admin', 'faculty'), toggleStudentAttendanceStatus);
router.get('/classroom-period-matrix', authorize('admin', 'faculty'), getClassroomPeriodMatrix);
router.put('/correct/:recordId', authorize('admin', 'faculty'), correctAttendance);
router.get('/student/:studentId?', getStudentAttendanceHistory);

export default router;
