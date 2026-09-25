import express from 'express';
import { getUsers, getFacultyList, getStudentsList, createUser, updateUser, deleteUser } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

router.get('/faculty', authorize('admin', 'faculty'), getFacultyList);
router.get('/students', authorize('admin', 'faculty'), getStudentsList);
router.get('/', authorize('admin'), getUsers);
router.post('/', authorize('admin'), createUser);
router.put('/:id', authorize('admin'), updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

export default router;
