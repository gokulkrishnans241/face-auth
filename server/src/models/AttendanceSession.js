import mongoose from 'mongoose';

const attendanceSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
      required: true,
      index: true,
    },
    sessionNumber: {
      type: Number,
      required: true,
      min: 1,
      max: 7,
    },
    sessionName: {
      type: String,
      required: true,
      trim: true,
    },
    subjectName: {
      type: String,
      default: 'General Lecture',
    },
    date: {
      type: String, // Format: YYYY-MM-DD for reliable timezone-safe queries
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true, // e.g. "09:00"
    },
    endTime: {
      type: String,
      required: true, // e.g. "10:00"
    },
    attendanceOpeningTime: {
      type: String,
      required: true, // e.g. "08:55"
    },
    attendanceDeadline: {
      type: String,
      required: true, // e.g. "09:20"
    },
    assignedFaculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    totalEligibleStudents: {
      type: Number,
      default: 0,
    },
    presentCount: {
      type: Number,
      default: 0,
    },
    absentCount: {
      type: Number,
      default: 0,
    },
    autoAbsenceProcessed: {
      type: Boolean,
      default: false,
    },
    openedAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate sessions on the same classroom, date, and period number
attendanceSessionSchema.index({ classroomId: 1, date: 1, sessionNumber: 1 }, { unique: true });

export const AttendanceSession = mongoose.model('AttendanceSession', attendanceSessionSchema);
