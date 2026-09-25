import mongoose from 'mongoose';

const sessionSlotSchema = new mongoose.Schema({
  sessionNumber: { type: Number, required: true },
  sessionName: { type: String, required: true },
  startTime: { type: String, required: true }, // e.g. "09:00"
  endTime: { type: String, required: true },   // e.g. "10:00"
  attendanceOpeningTime: { type: String, default: "08:55" },
  attendanceDeadline: { type: String, default: "09:20" },
  assignedFaculty: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  subjectName: { type: String, default: 'Core Lecture' },
  isEnabled: { type: Boolean, default: true },
});

const classroomSchema = new mongoose.Schema(
  {
    classroomId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      default: 'Computer Science & Engineering',
    },
    course: {
      type: String,
      default: 'B.Tech CSE',
    },
    semester: {
      type: String,
      default: 'Semester VI',
    },
    assignedFaculty: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    capacity: {
      type: Number,
      default: 60,
    },
    status: {
      type: String,
      enum: ['active', 'maintenance', 'inactive'],
      default: 'active',
      index: true,
    },
    defaultSessionCount: {
      type: Number,
      enum: [6, 7],
      default: 7,
    },
    timetableSlots: [sessionSlotSchema],
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const Classroom = mongoose.model('Classroom', classroomSchema);
