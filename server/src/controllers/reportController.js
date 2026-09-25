import { AttendanceRecord } from '../models/AttendanceRecord.js';
import { AttendanceSession } from '../models/AttendanceSession.js';
import { Classroom } from '../models/Classroom.js';
import { User } from '../models/User.js';
import { generateAttendanceWorkbook } from '../services/excelService.js';
import { format } from 'date-fns';

/**
 * @route GET /api/reports/dashboard-stats
 * @desc Get aggregated attendance statistics for Admin & Faculty dashboards
 */
export const getDashboardStats = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');

    let classroomFilter = {};
    if (req.user.role === 'faculty') {
      classroomFilter = { assignedFaculty: req.user._id };
    }

    const classrooms = await Classroom.find(classroomFilter).populate('students');
    const classroomIds = classrooms.map((c) => c._id);

    // Sessions for target date
    const sessions = await AttendanceSession.find({
      date: targetDate,
      classroomId: { $in: classroomIds },
    }).populate('classroomId', 'name classroomId roomNumber');

    // Attendance records for target date
    const records = await AttendanceRecord.find({
      date: targetDate,
      classroomId: { $in: classroomIds },
    });

    const totalStudentsSet = new Set();
    classrooms.forEach((c) => {
      c.students.forEach((s) => totalStudentsSet.add(s._id.toString()));
    });

    const totalUniqueStudents = totalStudentsSet.size;
    const totalPresent = records.filter((r) => r.status === 'Present').length;
    const totalAbsent = records.filter((r) => r.status === 'Absent').length;
    const totalRecords = totalPresent + totalAbsent;
    const overallPercentage = totalRecords > 0 ? (totalPresent / totalRecords) * 100 : 0;

    // Classroom-wise breakdowns for all 7 classrooms
    const classroomSummaries = classrooms.map((cr) => {
      const crRecords = records.filter((r) => r.classroomId.toString() === cr._id.toString());
      const crSessions = sessions.filter((s) => s.classroomId?._id?.toString() === cr._id.toString());
      const crPresent = crRecords.filter((r) => r.status === 'Present').length;
      const crAbsent = crRecords.filter((r) => r.status === 'Absent').length;
      const crTotal = crPresent + crAbsent;
      const crPercentage = crTotal > 0 ? (crPresent / crTotal) * 100 : 0;

      return {
        _id: cr._id,
        classroomId: cr.classroomId,
        name: cr.name,
        roomNumber: cr.roomNumber,
        department: cr.department,
        assignedStudentsCount: cr.students ? cr.students.length : 0,
        sessionsCount: crSessions.length,
        presentCount: crPresent,
        absentCount: crAbsent,
        percentage: parseFloat(crPercentage.toFixed(1)),
      };
    });

    // Session-wise breakdowns
    const sessionSummaries = sessions.map((sess) => {
      const sRecords = records.filter((r) => r.sessionId.toString() === sess._id.toString());
      const sPresent = sRecords.filter((r) => r.status === 'Present').length;
      const sAbsent = sRecords.filter((r) => r.status === 'Absent').length;
      const notYetMarked = Math.max(0, sess.totalEligibleStudents - (sPresent + sAbsent));
      const sTotal = sPresent + sAbsent;
      const sPercentage = sTotal > 0 ? (sPresent / sTotal) * 100 : 0;

      return {
        _id: sess._id,
        sessionId: sess.sessionId,
        sessionNumber: sess.sessionNumber,
        sessionName: sess.sessionName,
        classroomName: sess.classroomId?.name || 'Classroom',
        startTime: sess.startTime,
        endTime: sess.endTime,
        status: sess.status,
        totalEligibleStudents: sess.totalEligibleStudents,
        presentCount: sPresent,
        absentCount: sAbsent,
        notYetMarkedCount: notYetMarked,
        percentage: parseFloat(sPercentage.toFixed(1)),
      };
    });

    return res.status(200).json({
      success: true,
      date: targetDate,
      summary: {
        totalClassrooms: classrooms.length,
        totalScheduledSessions: sessions.length,
        totalUniqueStudents,
        totalPresentRecords: totalPresent,
        totalAbsentRecords: totalAbsent,
        overallPercentage: parseFloat(overallPercentage.toFixed(1)),
      },
      classroomSummaries,
      sessionSummaries,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/reports/excel
 * @desc Generate and download professional multi-sheet Excel attendance report (.xlsx)
 */
export const exportAttendanceExcel = async (req, res, next) => {
  try {
    const { startDate, endDate, classroomId, sessionId, department } = req.query;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const queryStartDate = startDate || todayStr;
    const queryEndDate = endDate || todayStr;

    let classroomFilter = {};
    if (req.user.role === 'faculty') {
      classroomFilter = { assignedFaculty: req.user._id };
    }
    if (classroomId) {
      classroomFilter._id = classroomId;
    }

    const classrooms = await Classroom.find(classroomFilter).populate('students');
    const classroomIds = classrooms.map((c) => c._id);

    // Build filter for AttendanceRecords
    const recordFilter = {
      date: { $gte: queryStartDate, $lte: queryEndDate },
      classroomId: { $in: classroomIds },
    };
    if (sessionId) recordFilter.sessionId = sessionId;

    const records = await AttendanceRecord.find(recordFilter)
      .populate('studentId', 'name userId email department')
      .populate('classroomId', 'name classroomId roomNumber')
      .populate('sessionId', 'sessionNumber sessionName startTime endTime')
      .populate('markedBy', 'name userId')
      .populate('correctedBy', 'name userId')
      .sort({ date: -1, sessionNumber: 1 });

    const sessions = await AttendanceSession.find({
      date: { $gte: queryStartDate, $lte: queryEndDate },
      classroomId: { $in: classroomIds },
    }).populate('classroomId', 'name classroomId');

    // 1. Compile Daily Summary Data
    const dailyMap = new Map();
    sessions.forEach((sess) => {
      const key = `${sess.date}_${sess.classroomId?._id}`;
      if (!dailyMap.has(key)) {
        dailyMap.set(key, {
          date: sess.date,
          classroomName: sess.classroomId?.name,
          classroomId: sess.classroomId?.classroomId,
          totalStudents: sess.totalEligibleStudents,
          totalSessions: 0,
          totalPresent: 0,
          totalAbsent: 0,
        });
      }
      const item = dailyMap.get(key);
      item.totalSessions += 1;
    });

    records.forEach((rec) => {
      const key = `${rec.date}_${rec.classroomId?._id}`;
      if (dailyMap.has(key)) {
        const item = dailyMap.get(key);
        if (rec.status === 'Present') item.totalPresent += 1;
        if (rec.status === 'Absent') item.totalAbsent += 1;
      }
    });

    const dailySummary = Array.from(dailyMap.values()).map((d) => {
      const total = d.totalPresent + d.totalAbsent;
      return {
        ...d,
        percentage: total > 0 ? (d.totalPresent / total) * 100 : 0,
      };
    });

    // 2. Compile Session Summary Data
    const sessionSummary = sessions.map((s) => {
      const sRecords = records.filter((r) => r.sessionId?._id?.toString() === s._id.toString());
      const presentCount = sRecords.filter((r) => r.status === 'Present').length;
      const absentCount = sRecords.filter((r) => r.status === 'Absent').length;
      const total = presentCount + absentCount;
      return {
        date: s.date,
        classroomName: s.classroomId?.name,
        sessionNumber: s.sessionNumber,
        sessionName: s.sessionName,
        startTime: s.startTime,
        endTime: s.endTime,
        totalEligibleStudents: s.totalEligibleStudents,
        presentCount,
        absentCount,
        percentage: total > 0 ? (presentCount / total) * 100 : 0,
      };
    });

    // 3. Detailed Records
    const detailedRecords = records.map((r) => ({
      studentUserId: r.studentId?.userId || 'N/A',
      studentName: r.studentId?.name || 'Unknown',
      department: r.studentId?.department || 'CSE',
      classroomName: r.classroomId?.name || 'Classroom',
      date: r.date,
      sessionNumber: r.sessionNumber,
      sessionName: r.sessionId?.sessionName || `Period ${r.sessionNumber}`,
      checkInTime: r.checkInTime,
      status: r.status,
      updatedBy: r.isCorrected ? `Admin: ${r.correctedBy?.name || 'Admin'}` : r.verificationMethod,
      correctionReason: r.correctionReason,
    }));

    // 4. Student Summary
    const studentMap = new Map();
    records.forEach((r) => {
      if (!r.studentId) return;
      const sId = r.studentId._id.toString();
      if (!studentMap.has(sId)) {
        studentMap.set(sId, {
          studentUserId: r.studentId.userId,
          studentName: r.studentId.name,
          classroomName: r.classroomId?.name,
          totalEligibleSessions: 0,
          presentCount: 0,
          absentCount: 0,
        });
      }
      const sData = studentMap.get(sId);
      sData.totalEligibleSessions += 1;
      if (r.status === 'Present') sData.presentCount += 1;
      if (r.status === 'Absent') sData.absentCount += 1;
    });

    const studentSummary = Array.from(studentMap.values()).map((s) => ({
      ...s,
      percentage: s.totalEligibleSessions > 0 ? (s.presentCount / s.totalEligibleSessions) * 100 : 0,
    }));

    // Generate Workbook
    const workbook = await generateAttendanceWorkbook({
      dailySummary,
      sessionSummary,
      detailedRecords,
      studentSummary,
    });

    const filename = `Attendance_Report_${queryStartDate}_to_${queryEndDate}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};
