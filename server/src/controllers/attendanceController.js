import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { AttendanceSession } from '../models/AttendanceSession.js';
import { Classroom } from '../models/Classroom.js';
import { User } from '../models/User.js';
import { AttendanceAuditLog } from '../models/AttendanceAuditLog.js';
import { matchFaceAgainstCandidates } from '../services/faceMatcherService.js';
import { syncSessionMetrics } from '../services/absenceWorkerService.js';

/**
 * @route POST /api/attendance/mark-face
 * @desc Verify facial embedding and mark attendance atomically for the active session
 */
export const markFaceAttendance = async (req, res, next) => {
  try {
    const { sessionId, classroomId, facialEmbedding, identifiedStudentId, confidence = 97.5, livenessVerified = true } = req.body;

    if (!sessionId || !classroomId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and Classroom ID are required.',
      });
    }

    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Attendance session not found.' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Attendance session is currently ${session.status.toUpperCase()}. Live check-in is not open.`,
      });
    }

    const classroom = await Classroom.findById(classroomId).populate('students', '_id name userId email');
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found.' });
    }

    const eligibleStudentIds = classroom.students.map((s) => s._id.toString());

    let targetStudent = null;
    let matchConfidence = confidence;

    if (identifiedStudentId) {
      // Direct student match passed from camera scanner or student self check-in
      targetStudent = classroom.students.find(
        (s) => s._id.toString() === identifiedStudentId || s.userId === identifiedStudentId
      );
    } else if (facialEmbedding && Array.isArray(facialEmbedding)) {
      // Match against biometric embeddings stored in database
      const matchResult = await matchFaceAgainstCandidates(facialEmbedding, eligibleStudentIds);
      if (!matchResult.matchedUserId) {
        return res.status(404).json({
          success: false,
          message: 'Face not recognized or student not enrolled in this classroom.',
        });
      }
      targetStudent = classroom.students.find(
        (s) => s._id.toString() === matchResult.matchedUserId.toString()
      );
      matchConfidence = matchResult.confidence;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Facial embedding vector or student identifier is required.',
      });
    }

    if (!targetStudent) {
      return res.status(403).json({
        success: false,
        message: 'Student is not assigned to this classroom session.',
      });
    }

    // Atomic find-and-modify / upsert to prevent race conditions across multiple requests
    const now = new Date();
    const existingRecord = await AttendanceRecord.findOne({
      studentId: targetStudent._id,
      sessionId: session._id,
      classroomId: classroom._id,
      date: session.date,
    });

    if (existingRecord && existingRecord.status === 'Present') {
      return res.status(200).json({
        success: true,
        alreadyMarked: true,
        message: `Attendance already marked for ${targetStudent.name} at ${new Date(existingRecord.checkInTime).toLocaleTimeString()}.`,
        record: existingRecord,
        student: {
          _id: targetStudent._id,
          name: targetStudent.name,
          userId: targetStudent.userId,
        },
      });
    }

    const updatedRecord = await AttendanceRecord.findOneAndUpdate(
      {
        studentId: targetStudent._id,
        sessionId: session._id,
        classroomId: classroom._id,
        date: session.date,
      },
      {
        $set: {
          sessionNumber: session.sessionNumber,
          status: 'Present',
          checkInTime: now,
          recognitionConfidence: parseFloat(matchConfidence.toFixed(2)),
          verificationMethod: 'Face Recognition',
          livenessVerified: Boolean(livenessVerified),
          markedBy: req.user._id,
          ipAddress: req.ip || '127.0.0.1',
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    // Sync live metrics for session
    await syncSessionMetrics(session._id);

    return res.status(200).json({
      success: true,
      alreadyMarked: false,
      message: `Verified: ${targetStudent.name} (${targetStudent.userId}) marked PRESENT.`,
      student: {
        _id: targetStudent._id,
        name: targetStudent.name,
        userId: targetStudent.userId,
      },
      record: updatedRecord,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/attendance/correct/:recordId
 * @desc Admin only: Edit Present/Absent status with mandatory correction reason and audit logging
 */
export const correctAttendance = async (req, res, next) => {
  try {
    const { recordId } = req.params;
    const { updatedStatus, correctionReason } = req.body;

    if (!['Present', 'Absent'].includes(updatedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'Present' or 'Absent'.",
      });
    }

    if (!correctionReason || correctionReason.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'A valid correction reason is required for audit logs.',
      });
    }

    let record = await AttendanceRecord.findById(recordId)
      .populate('studentId')
      .populate('sessionId')
      .populate('classroomId');

    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    const previousStatus = record.status;
    record.status = updatedStatus;
    record.isCorrected = true;
    record.correctedBy = req.user._id;
    record.correctionReason = correctionReason.trim();
    if (updatedStatus === 'Present' && !record.checkInTime) {
      record.checkInTime = new Date();
    }
    record.verificationMethod = 'Admin Manual Override';
    await record.save();

    // Create Audit Log Entry
    await AttendanceAuditLog.create({
      attendanceRecordId: record._id,
      studentId: record.studentId._id,
      classroomId: record.classroomId._id,
      sessionId: record.sessionId._id,
      date: record.date,
      previousStatus,
      updatedStatus,
      administratorId: req.user._id,
      correctionReason: correctionReason.trim(),
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'] || '',
    });

    // Re-sync session summary metrics
    await syncSessionMetrics(record.sessionId._id);

    return res.status(200).json({
      success: true,
      message: `Attendance corrected from ${previousStatus} to ${updatedStatus} for ${record.studentId.name}.`,
      record,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/attendance/student/:studentId?
 * @desc Get attendance summary and history for a student
 */
export const getStudentAttendanceHistory = async (req, res, next) => {
  try {
    let targetStudentId = req.user._id;

    if (req.user.role === 'admin' && req.params.studentId) {
      const student = await User.findOne({
        $or: [{ _id: req.params.studentId.match(/^[0-9a-fA-F]{24}$/) ? req.params.studentId : null }, { userId: req.params.studentId }],
      });
      if (student) targetStudentId = student._id;
    }

    const records = await AttendanceRecord.find({ studentId: targetStudentId })
      .populate('classroomId', 'name classroomId roomNumber')
      .populate('sessionId', 'sessionNumber sessionName startTime endTime')
      .sort({ date: -1, createdAt: -1 });

    const totalEligible = records.length;
    const presentCount = records.filter((r) => r.status === 'Present').length;
    const absentCount = records.filter((r) => r.status === 'Absent').length;
    const percentage = totalEligible > 0 ? (presentCount / totalEligible) * 100 : 0;

    return res.status(200).json({
      success: true,
      summary: {
        totalEligible,
        presentCount,
        absentCount,
        percentage: parseFloat(percentage.toFixed(1)),
      },
      records,
    });
  } catch (error) {
    next(error);
  }
};
