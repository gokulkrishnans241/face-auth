import express from 'express';
import { enrollFace, getFaceStatus, resetFaceProfile } from '../controllers/faceController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.post('/enroll', enrollFace);
router.get('/status/:userId?', getFaceStatus);
router.delete('/reset/:userId?', resetFaceProfile);

export default router;
