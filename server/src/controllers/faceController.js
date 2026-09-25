import { FaceProfile } from '../models/FaceProfile.js';
import { User } from '../models/User.js';

/**
 * @route POST /api/face/enroll
 * @desc Enroll or update biometric face profile with consent validation
 */
export const enrollFace = async (req, res, next) => {
  try {
    const { userId, facialEmbedding, biometricConsent, imageQualityScore = 0.95 } = req.body;

    // A student can enroll their own face, or an admin can enroll for any user
    const targetUserId = (req.user.role === 'admin' && userId) ? userId : req.user._id;

    if (!biometricConsent) {
      return res.status(400).json({
        success: false,
        message: 'Biometric consent is required to process facial recognition data.',
      });
    }

    if (!facialEmbedding || !Array.isArray(facialEmbedding) || facialEmbedding.length < 16) {
      return res.status(400).json({
        success: false,
        message: 'Invalid facial embedding descriptor. Please ensure clear lighting and centered face.',
      });
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Upsert face profile
    let faceProfile = await FaceProfile.findOne({ userId: user._id });

    if (faceProfile) {
      faceProfile.facialEmbedding = facialEmbedding;
      faceProfile.faceSamplesCount = (faceProfile.faceSamplesCount || 1) + 1;
      faceProfile.biometricConsentStatus = true;
      faceProfile.consentTimestamp = new Date();
      faceProfile.consentIpAddress = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
      faceProfile.enrollmentStatus = 'enrolled';
      faceProfile.imageQualityScore = imageQualityScore;
      faceProfile.lastEnrolledAt = new Date();
      await faceProfile.save();
    } else {
      faceProfile = await FaceProfile.create({
        userId: user._id,
        userIdentifier: user.userId,
        facialEmbedding,
        faceSamplesCount: 1,
        biometricConsentStatus: true,
        consentTimestamp: new Date(),
        consentIpAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
        enrollmentStatus: 'enrolled',
        imageQualityScore,
      });
    }

    // Update user profile flag
    user.biometricEnrolled = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Facial biometric profile successfully registered for ${user.name} (${user.userId}).`,
      enrollment: {
        userId: user.userId,
        name: user.name,
        enrollmentStatus: 'enrolled',
        lastEnrolledAt: faceProfile.lastEnrolledAt,
        qualityScore: imageQualityScore,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/face/status/:userId?
 * @desc Check biometric enrollment status for current user or specified user
 */
export const getFaceStatus = async (req, res, next) => {
  try {
    const targetUserId = (req.user.role === 'admin' && req.params.userId) ? req.params.userId : req.user._id;

    const profile = await FaceProfile.findOne({
      $or: [{ userId: targetUserId }, { userIdentifier: targetUserId }],
    });

    if (!profile) {
      return res.status(200).json({
        success: true,
        isEnrolled: false,
        status: 'pending',
      });
    }

    return res.status(200).json({
      success: true,
      isEnrolled: profile.enrollmentStatus === 'enrolled',
      status: profile.enrollmentStatus,
      lastEnrolledAt: profile.lastEnrolledAt,
      consentTimestamp: profile.consentTimestamp,
      samplesCount: profile.faceSamplesCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route DELETE /api/face/reset/:userId?
 * @desc Revoke consent and delete biometric embedding data (Student or Admin)
 */
export const resetFaceProfile = async (req, res, next) => {
  try {
    const targetUserId = (req.user.role === 'admin' && req.params.userId) ? req.params.userId : req.user._id;

    const user = await User.findOne({
      $or: [{ _id: targetUserId.match(/^[0-9a-fA-F]{24}$/) ? targetUserId : null }, { userId: targetUserId }],
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await FaceProfile.deleteMany({ userId: user._id });

    user.biometricEnrolled = false;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `Biometric facial profile and consent deleted for ${user.name}.`,
    });
  } catch (error) {
    next(error);
  }
};
