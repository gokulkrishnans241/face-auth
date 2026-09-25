import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { AttendanceSession } from '../models/AttendanceSession.js';
import { Classroom } from '../models/Classroom.js';
import { User } from '../models/User.js';
import { AttendanceAuditLog } from '../models/AttendanceAuditLog.js';
import { matchFaceAgainstCandidates } from '../services/faceMatcherService.js';
import { syncSessionMetrics } from '../services/absenceWorkerService.js';
import { DEFAULT_SESSION_TIMETABLE } from './sessionController.js';
import { format } from 'date-fns';

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
 * @route POST /api/attendance/toggle-status
 * @desc Quick 1-click toggle or update Present/Absent for any student (Faculty & Admin)
 */
export const toggleStudentAttendanceStatus = async (req, res, next) => {
  try {
    const { sessionId, studentId, targetStatus, reason } = req.body;

    if (!sessionId || !studentId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID and Student ID are required.',
      });
    }

    const session = await AttendanceSession.findById(sessionId).populate('classroomId');
    if (!session) {
      return res.status(404).json({ success: false, message: 'Attendance session not found.' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    // Find existing record for this student and session
    let record = await AttendanceRecord.findOne({
      studentId: student._id,
      sessionId: session._id,
      classroomId: session.classroomId._id,
      date: session.date,
    });

    let newStatus = targetStatus;
    if (!newStatus) {
      // Toggle current status
      newStatus = record?.status === 'Present' ? 'Absent' : 'Present';
    }

    if (!['Present', 'Absent'].includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'Present' or 'Absent'.",
      });
    }

    const previousStatus = record?.status || 'Not Yet Marked';
    const now = new Date();
    const verificationMethod =
      req.user.role === 'admin' ? 'Admin Manual Override' : 'Faculty Authorized Check';
    const defaultReason = reason || `${req.user.role === 'admin' ? 'Admin' : 'Faculty'} manual update (${newStatus})`;

    if (record) {
      record.status = newStatus;
      if (newStatus === 'Present' && !record.checkInTime) {
        record.checkInTime = now;
      }
      record.isCorrected = true;
      record.correctedBy = req.user._id;
      record.correctionReason = defaultReason;
      record.verificationMethod = verificationMethod;
      await record.save();
    } else {
      record = await AttendanceRecord.create({
        studentId: student._id,
        sessionId: session._id,
        classroomId: session.classroomId._id,
        date: session.date,
        sessionNumber: session.sessionNumber,
        status: newStatus,
        checkInTime: newStatus === 'Present' ? now : null,
        verificationMethod,
        markedBy: req.user._id,
        isCorrected: true,
        correctedBy: req.user._id,
        correctionReason: defaultReason,
      });
    }

    // Create Audit Log Entry
    try {
      await AttendanceAuditLog.create({
        attendanceRecordId: record._id,
        studentId: student._id,
        classroomId: session.classroomId._id,
        sessionId: session._id,
        date: session.date,
        previousStatus,
        updatedStatus: newStatus,
        administratorId: req.user._id,
        correctionReason: defaultReason,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'] || '',
      });
    } catch (auditErr) {
      console.warn('Audit log write error:', auditErr.message);
    }

    // Sync metrics for session
    await syncSessionMetrics(session._id);

    return res.status(200).json({
      success: true,
      message: `${student.name} marked as ${newStatus}.`,
      status: newStatus,
      record,
      student: {
        _id: student._id,
        name: student.name,
        userId: student.userId,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/attendance/classroom-period-matrix
 * @desc Get complete Period 1-7 matrix and summaries for a classroom and date (Admin & Faculty)
 */
export const getClassroomPeriodMatrix = async (req, res, next) => {
  try {
    const { classroomId, date } = req.query;
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');

    if (!classroomId) {
      return res.status(400).json({ success: false, message: 'Classroom ID is required.' });
    }

    const classroom = await Classroom.findById(classroomId)
      .populate('students', '_id name userId email department biometricEnrolled')
      .populate('assignedFaculty', '_id name email userId');

    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found.' });
    }

    // Ensure 7 daily periods exist for this date
    let sessions = await AttendanceSession.find({
      classroomId: classroom._id,
      date: targetDate,
    }).sort({ sessionNumber: 1 });

    if (sessions.length === 0) {
      // Auto-generate 7 daily sessions
      const count = classroom.defaultSessionCount || 7;
      const slots =
        classroom.timetableSlots && classroom.timetableSlots.length > 0
          ? classroom.timetableSlots.slice(0, count)
          : DEFAULT_SESSION_TIMETABLE.slice(0, count);

      const defaultFaculty =
        classroom.assignedFaculty && classroom.assignedFaculty.length > 0
          ? classroom.assignedFaculty[0]._id
          : req.user._id;

      for (const slot of slots) {
        const sessionId = `SESS-${targetDate.replace(/-/g, '')}-${classroom.classroomId}-P${slot.sessionNumber}`;
        const newSession = await AttendanceSession.create({
          sessionId,
          classroomId: classroom._id,
          sessionNumber: slot.sessionNumber,
          sessionName: slot.sessionName || `Period ${slot.sessionNumber}`,
          subjectName: slot.subjectName || 'Core Subject',
          date: targetDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          attendanceOpeningTime: slot.attendanceOpeningTime,
          attendanceDeadline: slot.attendanceDeadline,
          assignedFaculty: slot.assignedFaculty || defaultFaculty,
          status: 'scheduled',
          totalEligibleStudents: classroom.students ? classroom.students.length : 0,
        });
        sessions.push(newSession);
      }
    }

    // Fetch all attendance records for these sessions
    const sessionIds = sessions.map((s) => s._id);
    const records = await AttendanceRecord.find({
      sessionId: { $in: sessionIds },
      classroomId: classroom._id,
      date: targetDate,
    }).populate('studentId', '_id name userId email department');

    // Build record lookup map: key = `${studentId}_${sessionId}`
    const recordMap = new Map();
    records.forEach((r) => {
      if (r.studentId) {
        const key = `${r.studentId._id.toString()}_${r.sessionId.toString()}`;
        recordMap.set(key, r);
      }
    });

    // Build student rows with all periods
    const studentsMatrix = (classroom.students || []).map((student) => {
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalNotMarked = 0;

      const periodStatuses = sessions.map((sess) => {
        const key = `${student._id.toString()}_${sess._id.toString()}`;
        const rec = recordMap.get(key);

        let status = 'Not Yet Marked';
        if (rec) {
          status = rec.status;
        } else if (sess.status === 'completed') {
          status = 'Absent';
        }

        if (status === 'Present') totalPresent += 1;
        else if (status === 'Absent') totalAbsent += 1;
        else totalNotMarked += 1;

        return {
          sessionNumber: sess.sessionNumber,
          sessionId: sess._id,
          sessionName: sess.sessionName,
          subjectName: sess.subjectName,
          startTime: sess.startTime,
          endTime: sess.endTime,
          status,
          checkInTime: rec?.checkInTime || null,
          recordId: rec?._id || null,
          verificationMethod: rec?.verificationMethod || 'None',
          isCorrected: rec?.isCorrected || false,
        };
      });

      const totalMarked = totalPresent + totalAbsent;
      const percentage = totalMarked > 0 ? (totalPresent / totalMarked) * 100 : 0;

      return {
        _id: student._id,
        userId: student.userId,
        name: student.name,
        email: student.email,
        department: student.department,
        biometricEnrolled: student.biometricEnrolled,
        periods: periodStatuses,
        summary: {
          totalPresent,
          totalAbsent,
          totalNotMarked,
          percentage: parseFloat(percentage.toFixed(1)),
        },
      };
    });

    // Build detailed period-wise summaries (Period 1: Present list, Absent list; Period 2: ...)
    const periodSummaries = sessions.map((sess) => {
      const presentStudents = [];
      const absentStudents = [];
      const unmarkedStudents = [];

      (classroom.students || []).forEach((student) => {
        const key = `${student._id.toString()}_${sess._id.toString()}`;
        const rec = recordMap.get(key);

        const studentInfo = {
          _id: student._id,
          userId: student.userId,
          name: student.name,
          email: student.email,
          checkInTime: rec?.checkInTime || null,
          recordId: rec?._id || null,
        };

        if (rec?.status === 'Present') {
          presentStudents.push(studentInfo);
        } else if (rec?.status === 'Absent' || sess.status === 'completed') {
          absentStudents.push(studentInfo);
        } else {
          unmarkedStudents.push(studentInfo);
        }
      });

      const total = presentStudents.length + absentStudents.length;
      const rate = total > 0 ? (presentStudents.length / total) * 100 : 0;

      return {
        sessionId: sess._id,
        sessionNumber: sess.sessionNumber,
        sessionName: sess.sessionName,
        subjectName: sess.subjectName,
        startTime: sess.startTime,
        endTime: sess.endTime,
        status: sess.status,
        totalEligible: classroom.students ? classroom.students.length : 0,
        presentCount: presentStudents.length,
        absentCount: absentStudents.length,
        unmarkedCount: unmarkedStudents.length,
        attendancePercentage: parseFloat(rate.toFixed(1)),
        presentStudents,
        absentStudents,
        unmarkedStudents,
      };
    });

    return res.status(200).json({
      success: true,
      classroom: {
        _id: classroom._id,
        classroomId: classroom.classroomId,
        name: classroom.name,
        roomNumber: classroom.roomNumber,
        department: classroom.department,
        capacity: classroom.capacity,
        totalStudents: classroom.students?.length || 0,
        assignedFaculty: classroom.assignedFaculty,
      },
      date: targetDate,
      periods: sessions.map((s) => ({
        _id: s._id,
        sessionNumber: s.sessionNumber,
        sessionName: s.sessionName,
        subjectName: s.subjectName,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
      })),
      students: studentsMatrix,
      periodSummaries,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/attendance/correct/:recordId
 * @desc Edit Present/Absent status with mandatory correction reason and audit logging (Admin & Faculty)
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
    record.verificationMethod =
      req.user.role === 'admin' ? 'Admin Manual Override' : 'Faculty Authorized Check';
    await record.save();

    // Create Audit Log Entry
    try {
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
    } catch (auditErr) {
      console.warn('Audit log write error:', auditErr.message);
    }

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
