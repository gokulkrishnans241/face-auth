import { AttendanceSession } from '../models/AttendanceSession.js';
import { Classroom } from '../models/Classroom.js';
import { AttendanceRecord } from '../models/AttendanceRecord.js';

/**
 * Process a specific session to finalize Absent records for students who did not mark attendance
 * @param {string} sessionId 
 * @returns {Promise<{ presentCount: number, absentCount: number, totalProcessed: number }>}
 */
export const processSessionAbsence = async (sessionId) => {
  const session = await AttendanceSession.findById(sessionId).populate('classroomId');
  if (!session) {
    throw new Error('Attendance session not found');
  }

  const classroom = await Classroom.findById(session.classroomId._id).populate('students');
  if (!classroom) {
    throw new Error('Classroom not found for session');
  }

  const eligibleStudentIds = classroom.students.map((s) => s._id);
  session.totalEligibleStudents = eligibleStudentIds.length;

  let presentCount = 0;
  let absentCount = 0;

  for (const student of classroom.students) {
    // Find or create record atomically using findOneAndUpdate with upsert
    let record = await AttendanceRecord.findOne({
      studentId: student._id,
      sessionId: session._id,
      classroomId: classroom._id,
      date: session.date,
    });

    if (!record) {
      // If session is completed or auto-processing, create an Absent record
      record = await AttendanceRecord.create({
        studentId: student._id,
        sessionId: session._id,
        classroomId: classroom._id,
        date: session.date,
        sessionNumber: session.sessionNumber,
        status: 'Absent',
        verificationMethod: 'Automated Post-Deadline Absence',
      });
      absentCount++;
    } else {
      if (record.status === 'Present') {
        presentCount++;
      } else if (record.status === 'Not Yet Marked') {
        // Mark as Absent once session closes
        record.status = 'Absent';
        record.verificationMethod = 'Automated Post-Deadline Absence';
        await record.save();
        absentCount++;
      } else if (record.status === 'Absent') {
        absentCount++;
      }
    }
  }

  // Update session stats
  session.presentCount = presentCount;
  session.absentCount = absentCount;
  session.autoAbsenceProcessed = true;
  await session.save();

  return {
    presentCount,
    absentCount,
    totalEligible: eligibleStudentIds.length,
  };
};

/**
 * Recalculate session totals accurately from live records
 */
export const syncSessionMetrics = async (sessionId) => {
  const session = await AttendanceSession.findById(sessionId);
  if (!session) return;

  const classroom = await Classroom.findById(session.classroomId);
  const eligibleCount = classroom?.students?.length || 0;

  const presentCount = await AttendanceRecord.countDocuments({
    sessionId: session._id,
    status: 'Present',
  });

  const absentCount = await AttendanceRecord.countDocuments({
    sessionId: session._id,
    status: 'Absent',
  });

  session.totalEligibleStudents = eligibleCount;
  session.presentCount = presentCount;
  session.absentCount = absentCount;
  await session.save();

  return { presentCount, absentCount, eligibleCount };
};
