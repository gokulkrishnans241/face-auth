import express from 'express';
import { getDashboardStats, exportAttendanceExcel } from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard-stats', getDashboardStats);
router.get('/excel', authorize('admin', 'faculty'), exportAttendanceExcel);

export default router;
