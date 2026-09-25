import { AttendanceAuditLog } from '../models/AttendanceAuditLog.js';

/**
 * @route GET /api/audit/logs
 * @desc Get attendance modification audit logs (Admin only)
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    const { date, classroomId, studentId, limit = 50, page = 1 } = req.query;

    const filter = {};
    if (date) filter.date = date;
    if (classroomId) filter.classroomId = classroomId;
    if (studentId) filter.studentId = studentId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const logs = await AttendanceAuditLog.find(filter)
      .populate('studentId', 'name userId email department')
      .populate('classroomId', 'name classroomId roomNumber')
      .populate('sessionId', 'sessionNumber sessionName startTime endTime')
      .populate('administratorId', 'name userId email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalLogs = await AttendanceAuditLog.countDocuments(filter);

    return res.status(200).json({
      success: true,
      totalLogs,
      page: parseInt(page),
      totalPages: Math.ceil(totalLogs / parseInt(limit)),
      logs,
    });
  } catch (error) {
    next(error);
  }
};
