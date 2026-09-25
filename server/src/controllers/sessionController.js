import { AttendanceSession } from '../models/AttendanceSession.js';
import { Classroom } from '../models/Classroom.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { processSessionAbsence, syncSessionMetrics } from '../services/absenceWorkerService.js';
import { format } from 'date-fns';

/**
 * Standard 7-session college schedule template
 */
export const DEFAULT_SESSION_TIMETABLE = [
  { sessionNumber: 1, sessionName: 'Period 1: Distributed Systems', startTime: '09:00', endTime: '10:00', attendanceOpeningTime: '08:55', attendanceDeadline: '09:20' },
  { sessionNumber: 2, sessionName: 'Period 2: Compiler Design', startTime: '10:00', endTime: '11:00', attendanceOpeningTime: '09:55', attendanceDeadline: '10:20' },
  { sessionNumber: 3, sessionName: 'Period 3: Artificial Intelligence', startTime: '11:15', endTime: '12:15', attendanceOpeningTime: '11:10', attendanceDeadline: '11:35' },
  { sessionNumber: 4, sessionName: 'Period 4: Computer Networks', startTime: '12:15', endTime: '13:15', attendanceOpeningTime: '12:10', attendanceDeadline: '12:35' },
  { sessionNumber: 5, sessionName: 'Period 5: Machine Learning Lab', startTime: '14:00', endTime: '15:00', attendanceOpeningTime: '13:55', attendanceDeadline: '14:20' },
  { sessionNumber: 6, sessionName: 'Period 6: Cloud Computing', startTime: '15:00', endTime: '16:00', attendanceOpeningTime: '14:55', attendanceDeadline: '15:20' },
  { sessionNumber: 7, sessionName: 'Period 7: Project & Seminar', startTime: '16:00', endTime: '17:00', attendanceOpeningTime: '15:55', attendanceDeadline: '16:20' },
];

/**
 * @route GET /api/sessions
 * @desc Get sessions by date and optional classroom filter
 */
export const getSessions = async (req, res, next) => {
  try {
    const { date, classroomId, status } = req.query;
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');

    const filter = { date: targetDate };
    if (classroomId) filter.classroomId = classroomId;
    if (status) filter.status = status;

    if (req.user.role === 'faculty') {
      filter.assignedFaculty = req.user._id;
    }

    const sessions = await AttendanceSession.find(filter)
      .populate('classroomId', 'name classroomId roomNumber capacity department')
      .populate('assignedFaculty', 'name email userId')
      .sort({ sessionNumber: 1 });

    return res.status(200).json({
      success: true,
      date: targetDate,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/sessions/:id
 * @desc Get session details along with real-time student attendance list
 */
export const getSessionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await AttendanceSession.findById(id)
      .populate('classroomId')
      .populate('assignedFaculty', 'name email userId');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Attendance session not found.' });
    }

    // Retrieve classroom students
    const classroom = await Classroom.findById(session.classroomId._id).populate('students', 'name userId email department biometricEnrolled');

    // Retrieve all attendance records for this session
    const records = await AttendanceRecord.find({ sessionId: session._id })
      .populate('studentId', 'name userId email department biometricEnrolled')
      .populate('markedBy', 'name userId')
      .populate('correctedBy', 'name userId');

    // Build complete student status map (including Not Yet Marked)
    const recordsMap = new Map();
    records.forEach((r) => {
      if (r.studentId) {
        recordsMap.set(r.studentId._id.toString(), r);
      }
    });

    const studentsAttendanceList = (classroom?.students || []).map((student) => {
      const rec = recordsMap.get(student._id.toString());
      return {
        student: {
          _id: student._id,
          name: student.name,
          userId: student.userId,
          email: student.email,
          biometricEnrolled: student.biometricEnrolled,
        },
        status: rec ? rec.status : (session.status === 'completed' ? 'Absent' : 'Not Yet Marked'),
        checkInTime: rec?.checkInTime || null,
        confidence: rec?.recognitionConfidence || 0,
        verificationMethod: rec?.verificationMethod || 'Pending',
        recordId: rec?._id || null,
        isCorrected: rec?.isCorrected || false,
        correctionReason: rec?.correctionReason || '',
      };
    });

    return res.status(200).json({
      success: true,
      session,
      students: studentsAttendanceList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/sessions/generate-daily
 * @desc Generate 6 or 7 daily sessions for all or selected classrooms for a specific date (Admin/Faculty)
 */
export const generateDailySessions = async (req, res, next) => {
  try {
    const { date, classroomId, sessionCount = 7 } = req.body;
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');

    const classroomQuery = classroomId ? { _id: classroomId } : { status: 'active' };
    const classrooms = await Classroom.find(classroomQuery);

    let createdSessions = [];

    for (const cr of classrooms) {
      const count = cr.defaultSessionCount || sessionCount || 7;
      const slots = cr.timetableSlots && cr.timetableSlots.length > 0
        ? cr.timetableSlots.slice(0, count)
        : DEFAULT_SESSION_TIMETABLE.slice(0, count);

      const defaultFaculty = cr.assignedFaculty && cr.assignedFaculty.length > 0
        ? cr.assignedFaculty[0]
        : req.user._id;

      for (const slot of slots) {
        const sessionId = `SESS-${targetDate.replace(/-/g, '')}-${cr.classroomId}-P${slot.sessionNumber}`;

        const existing = await AttendanceSession.findOne({
          classroomId: cr._id,
          date: targetDate,
          sessionNumber: slot.sessionNumber,
        });

        if (!existing) {
          const newSession = await AttendanceSession.create({
            sessionId,
            classroomId: cr._id,
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
            totalEligibleStudents: cr.students ? cr.students.length : 0,
          });
          createdSessions.push(newSession);
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: `Generated daily sessions for date: ${targetDate}`,
      count: createdSessions.length,
      sessions: createdSessions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/sessions/:id/start
 * @desc Start an attendance session (opens camera/scanning)
 */
export const startSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await AttendanceSession.findById(id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    // Role check: Admin or assigned faculty
    if (req.user.role === 'faculty' && session.assignedFaculty.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this session.' });
    }

    session.status = 'active';
    session.openedAt = new Date();
    await session.save();

    return res.status(200).json({
      success: true,
      message: 'Attendance session is now ACTIVE. Face recognition scanning enabled.',
      session,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/sessions/:id/close
 * @desc End/close an attendance session and auto-calculate Absent records
 */
export const closeSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await AttendanceSession.findById(id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    session.status = 'completed';
    session.closedAt = new Date();
    await session.save();

    // Auto calculate absences
    const stats = await processSessionAbsence(session._id);

    return res.status(200).json({
      success: true,
      message: 'Attendance session completed. Unmarked students recorded as Absent.',
      stats,
      session,
    });
  } catch (error) {
    next(error);
  }
};
