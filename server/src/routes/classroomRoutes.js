import express from 'express';
import {
  getClassrooms,
  getClassroomById,
  createClassroom,
  updateClassroom,
} from '../controllers/classroomController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

router.get('/', getClassrooms);
router.get('/:id', getClassroomById);
router.post('/', authorize('admin'), createClassroom);
router.put('/:id', authorize('admin'), updateClassroom);

export default router;
