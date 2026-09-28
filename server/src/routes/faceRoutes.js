import express from 'express';
import { enrollFace, getFaceStatus, resetFaceProfile, resetAllFaceProfiles } from '../controllers/faceController.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

router.use(protect);

router.post('/enroll', enrollFace);
router.delete('/reset-all', authorize('admin'), resetAllFaceProfiles);
router.get('/status/:userId?', getFaceStatus);
router.delete('/reset/:userId?', resetFaceProfile);

export default router;

