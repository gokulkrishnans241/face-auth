import mongoose from 'mongoose';

const faceProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    userIdentifier: {
      type: String,
      required: true,
      index: true,
    },
    facialEmbedding: {
      type: [Number], // 128-d or 512-d floating point facial descriptor vector
      required: true,
      select: false, // Hidden by default from normal queries for privacy & biometric protection
    },
    faceSamplesCount: {
      type: Number,
      default: 1,
    },
    biometricConsentStatus: {
      type: Boolean,
      default: false,
      required: true,
    },
    consentTimestamp: {
      type: Date,
    },
    consentIpAddress: {
      type: String,
    },
    enrollmentStatus: {
      type: String,
      enum: ['enrolled', 'pending', 'reset', 'revoked'],
      default: 'enrolled',
      index: true,
    },
    imageQualityScore: {
      type: Number,
      default: 0.95,
    },
    lastEnrolledAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify descriptor match using Euclidean distance
faceProfileSchema.methods.calculateDistance = function (queryEmbedding) {
  if (!this.facialEmbedding || !queryEmbedding || this.facialEmbedding.length !== queryEmbedding.length) {
    return 1.0;
  }
  let sum = 0;
  for (let i = 0; i < this.facialEmbedding.length; i++) {
    const diff = this.facialEmbedding[i] - queryEmbedding[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

export const FaceProfile = mongoose.model('FaceProfile', faceProfileSchema);
