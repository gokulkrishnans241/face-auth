import mongoose from 'mongoose';

const attendanceRecordSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceSession',
      required: true,
      index: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      index: true,
    },
    sessionNumber: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['Present', 'Absent', 'Not Yet Marked'],
      default: 'Not Yet Marked',
      index: true,
    },
    checkInTime: {
      type: Date,
    },
    recognitionConfidence: {
      type: Number,
      default: 0, // e.g. 98.4%
    },
    verificationMethod: {
      type: String,
      enum: [
        'Face Recognition',
        'Admin Manual Override',
        'Automated Post-Deadline Absence',
        'Faculty Authorized Check',
      ],
      default: 'Face Recognition',
    },
    livenessVerified: {
      type: Boolean,
      default: true,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isCorrected: {
      type: Boolean,
      default: false,
    },
    correctedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    correctionReason: {
      type: String,
      trim: true,
    },
    ipAddress: {
      type: String,
    },
    deviceInfo: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// CRITICAL UNIQUE COMPOUND INDEX: Strictly guarantees one attendance record per student per session
attendanceRecordSchema.index(
  { studentId: 1, sessionId: 1, classroomId: 1, date: 1 },
  { unique: true }
);

// Secondary query optimization indexes
attendanceRecordSchema.index({ classroomId: 1, date: 1, status: 1 });
attendanceRecordSchema.index({ studentId: 1, date: 1 });

export const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema);
