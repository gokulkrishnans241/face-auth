import express from 'express';
import {
  getSessions,
  getSessionById,
  generateDailySessions,
  startSession,
  closeSession,
} from '../controllers/sessionController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

router.get('/', getSessions);
router.get('/:id', getSessionById);
router.post('/generate-daily', authorize('admin', 'faculty'), generateDailySessions);
router.post('/:id/start', authorize('admin', 'faculty'), startSession);
router.post('/:id/close', authorize('admin', 'faculty'), closeSession);

export default router;
