import mongoose from 'mongoose';
import dns from 'dns';
import { config } from './config/env.js';
import { User } from './models/User.js';

// Resolve MongoDB SRV records via public DNS servers
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Ignore in restricted environments
}
import { FaceProfile } from './models/FaceProfile.js';
import { Classroom } from './models/Classroom.js';
import { AttendanceSession } from './models/AttendanceSession.js';
import { AttendanceRecord } from './models/AttendanceRecord.js';
import { AttendanceAuditLog } from './models/AttendanceAuditLog.js';
import { format } from 'date-fns';

/**
 * Generate synthetic 128-dimensional embedding vector
 */
const generateSyntheticEmbedding = (seedOffset = 0) => {
  const vector = [];
  for (let i = 0; i < 128; i++) {
    const val = Math.sin(i * 0.15 + seedOffset) * 0.4 + Math.cos(i * 0.3 - seedOffset) * 0.3;
    vector.push(parseFloat(val.toFixed(4)));
  }
  return vector;
};

const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('[Seed] Connected to database.');

    // Clear existing records
    await Promise.all([
      User.deleteMany({}),
      FaceProfile.deleteMany({}),
      Classroom.deleteMany({}),
      AttendanceSession.deleteMany({}),
      AttendanceRecord.deleteMany({}),
      AttendanceAuditLog.deleteMany({}),
    ]);
    console.log('[Seed] Cleared existing data.');

    // 1. Create Administrator
    const admin = await User.create({
      userId: 'ADM001',
      name: 'Dr. Ramesh Sharma (Dean Academic)',
      email: 'admin@college.edu',
      password: 'AdminPassword@123',
      role: 'admin',
      department: 'College Administration & Academic Affairs',
      accountStatus: 'active',
      phoneNumber: '+91 98765 43210',
    });
    console.log('[Seed] Admin account created: admin@college.edu');

    // 2. Create Faculty Members
    const facultyList = await User.create([
      {
        userId: 'FAC101',
        name: 'Prof. Rajesh Sharma',
        email: 'prof.sharma@college.edu',
        password: 'Faculty@123',
        role: 'faculty',
        department: 'Computer Science & Engineering',
        accountStatus: 'active',
        phoneNumber: '+91 98765 11001',
      },
      {
        userId: 'FAC102',
        name: 'Dr. Ananya Iyer',
        email: 'dr.ananya@college.edu',
        password: 'Faculty@123',
        role: 'faculty',
        department: 'Artificial Intelligence & Data Science',
        accountStatus: 'active',
        phoneNumber: '+91 98765 11002',
      },
      {
        userId: 'FAC103',
        name: 'Prof. Vikramaditya Rao',
        email: 'prof.vikram@college.edu',
        password: 'Faculty@123',
        role: 'faculty',
        department: 'Information Technology',
        accountStatus: 'active',
        phoneNumber: '+91 98765 11003',
      },
      {
        userId: 'FAC104',
        name: 'Dr. Priya Sundaram',
        email: 'dr.priya@college.edu',
        password: 'Faculty@123',
        role: 'faculty',
        department: 'Electronics & Communication',
        accountStatus: 'active',
        phoneNumber: '+91 98765 11004',
      },
    ]);
    console.log(`[Seed] Created ${facultyList.length} faculty accounts.`);

    // 3. Create Students (20 students)
    const rawStudents = [
      { userId: 'STU2024001', name: 'Aarav Patel', email: 'aarav.patel@student.college.edu', dept: 'Computer Science & Engineering' },
      { userId: 'STU2024002', name: 'Diya Nair', email: 'diya.nair@student.college.edu', dept: 'Computer Science & Engineering' },
      { userId: 'STU2024003', name: 'Rohan Gupta', email: 'rohan.gupta@student.college.edu', dept: 'Computer Science & Engineering' },
      { userId: 'STU2024004', name: 'Ananya Deshmukh', email: 'ananya.deshmukh@student.college.edu', dept: 'Computer Science & Engineering' },
      { userId: 'STU2024005', name: 'Karthik Rajan', email: 'karthik.rajan@student.college.edu', dept: 'Computer Science & Engineering' },
      { userId: 'STU2024006', name: 'Sneha Kulkarni', email: 'sneha.kulkarni@student.college.edu', dept: 'Computer Science & Engineering' },
      { userId: 'STU2024007', name: 'Aditya Verma', email: 'aditya.verma@student.college.edu', dept: 'Artificial Intelligence & Data Science' },
      { userId: 'STU2024008', name: 'Meera Menon', email: 'meera.menon@student.college.edu', dept: 'Artificial Intelligence & Data Science' },
      { userId: 'STU2024009', name: 'Varun Joshi', email: 'varun.joshi@student.college.edu', dept: 'Artificial Intelligence & Data Science' },
      { userId: 'STU2024010', name: 'Pooja Hegde', email: 'pooja.hegde@student.college.edu', dept: 'Artificial Intelligence & Data Science' },
      { userId: 'STU2024011', name: 'Siddharth Roy', email: 'siddharth.roy@student.college.edu', dept: 'Information Technology' },
      { userId: 'STU2024012', name: 'Kavya Soni', email: 'kavya.soni@student.college.edu', dept: 'Information Technology' },
      { userId: 'STU2024013', name: 'Nikhil Saxena', email: 'nikhil.saxena@student.college.edu', dept: 'Information Technology' },
      { userId: 'STU2024014', name: 'Tanvi Agarwal', email: 'tanvi.agarwal@student.college.edu', dept: 'Information Technology' },
      { userId: 'STU2024015', name: 'Gaurav Bhatia', email: 'gaurav.bhatia@student.college.edu', dept: 'Electronics & Communication' },
      { userId: 'STU2024016', name: 'Ishita Sen', email: 'ishita.sen@student.college.edu', dept: 'Electronics & Communication' },
      { userId: 'STU2024017', name: 'Pranav Reddy', email: 'pranav.reddy@student.college.edu', dept: 'Electronics & Communication' },
      { userId: 'STU2024018', name: 'Rhea Kapoor', email: 'rhea.kapoor@student.college.edu', dept: 'Computer Science & Engineering' },
      { userId: 'STU2024019', name: 'Harsh Vardhan', email: 'harsh.vardhan@student.college.edu', dept: 'Computer Science & Engineering' },
      { userId: 'STU2024020', name: 'Zoya Khan', email: 'zoya.khan@student.college.edu', dept: 'Computer Science & Engineering' },
    ];

    const studentDocs = [];
    for (let i = 0; i < rawStudents.length; i++) {
      const s = rawStudents[i];
      const student = await User.create({
        userId: s.userId,
        name: s.name,
        email: s.email,
        password: 'Student@123',
        role: 'student',
        department: s.dept,
        accountStatus: 'active',
        biometricEnrolled: true,
      });

      // Create biometric profile
      await FaceProfile.create({
        userId: student._id,
        userIdentifier: student.userId,
        facialEmbedding: generateSyntheticEmbedding(i * 1.5 + 0.5),
        faceSamplesCount: 3,
        biometricConsentStatus: true,
        consentTimestamp: new Date(),
        consentIpAddress: '127.0.0.1',
        enrollmentStatus: 'enrolled',
        imageQualityScore: 0.98,
      });

      studentDocs.push(student);
    }
    console.log(`[Seed] Created ${studentDocs.length} student accounts with enrolled face profiles.`);

    // 4. Create all 7 Classrooms
    const classroomData = [
      {
        classroomId: 'CR-101',
        name: 'Room 101 - Smart Hall Alpha',
        roomNumber: '101',
        department: 'Computer Science & Engineering',
        course: 'B.Tech CSE - Section A',
        capacity: 60,
        defaultSessionCount: 7,
        assignedFaculty: [facultyList[0]._id, facultyList[1]._id],
        students: studentDocs.slice(0, 10).map((s) => s._id),
      },
      {
        classroomId: 'CR-102',
        name: 'Room 102 - Smart Hall Beta',
        roomNumber: '102',
        department: 'Computer Science & Engineering',
        course: 'B.Tech CSE - Section B',
        capacity: 60,
        defaultSessionCount: 7,
        assignedFaculty: [facultyList[0]._id],
        students: studentDocs.slice(5, 15).map((s) => s._id),
      },
      {
        classroomId: 'CR-103',
        name: 'Room 103 - IoT & Computing Lab',
        roomNumber: '103',
        department: 'Information Technology',
        course: 'B.Tech IT - Year III',
        capacity: 45,
        defaultSessionCount: 6,
        assignedFaculty: [facultyList[2]._id],
        students: studentDocs.slice(10, 18).map((s) => s._id),
      },
      {
        classroomId: 'CR-104',
        name: 'Room 104 - Artificial Intelligence Lab',
        roomNumber: '104',
        department: 'Artificial Intelligence & Data Science',
        course: 'B.Tech AI & DS - Year III',
        capacity: 45,
        defaultSessionCount: 7,
        assignedFaculty: [facultyList[1]._id],
        students: studentDocs.slice(6, 16).map((s) => s._id),
      },
      {
        classroomId: 'CR-105',
        name: 'Room 105 - Systems & Networks Lab',
        roomNumber: '105',
        department: 'Computer Science & Engineering',
        course: 'B.Tech CSE - Lab Group 1',
        capacity: 45,
        defaultSessionCount: 6,
        assignedFaculty: [facultyList[2]._id, facultyList[3]._id],
        students: studentDocs.slice(0, 12).map((s) => s._id),
      },
      {
        classroomId: 'CR-106',
        name: 'Room 106 - Seminar Hall East',
        roomNumber: '106',
        department: 'Electronics & Communication',
        course: 'B.Tech ECE - Final Year',
        capacity: 120,
        defaultSessionCount: 6,
        assignedFaculty: [facultyList[3]._id],
        students: studentDocs.slice(12, 20).map((s) => s._id),
      },
      {
        classroomId: 'CR-107',
        name: 'Room 107 - Executive Lecture Theater',
        roomNumber: '107',
        department: 'Computer Science & Engineering',
        course: 'M.Tech CSE / Advanced Electives',
        capacity: 80,
        defaultSessionCount: 7,
        assignedFaculty: [facultyList[0]._id, facultyList[1]._id],
        students: studentDocs.slice(0, 8).map((s) => s._id),
      },
    ];

    const createdClassrooms = await Classroom.create(classroomData);
    console.log(`[Seed] Created all 7 Classrooms (CR-101 to CR-107).`);

    // Assign classrooms back to Faculty
    for (const cr of createdClassrooms) {
      await User.updateMany(
        { _id: { $in: cr.assignedFaculty } },
        { $addToSet: { assignedClassrooms: cr._id } }
      );
      await User.updateMany(
        { _id: { $in: cr.students } },
        { $addToSet: { assignedClassrooms: cr._id } }
      );
    }

    // 5. Generate Today's Timetable Sessions for All 7 Classrooms
    const today = format(new Date(), 'yyyy-MM-dd');
    const sessionPeriods = [
      { num: 1, name: 'Period 1: Distributed Systems', start: '09:00', end: '10:00', open: '08:55', dead: '09:20' },
      { num: 2, name: 'Period 2: Compiler Design', start: '10:00', end: '11:00', open: '09:55', dead: '10:20' },
      { num: 3, name: 'Period 3: Artificial Intelligence', start: '11:15', end: '12:15', open: '11:10', dead: '11:35' },
      { num: 4, name: 'Period 4: Computer Networks', start: '12:15', end: '13:15', open: '12:10', dead: '12:35' },
      { num: 5, name: 'Period 5: ML Lab Practice', start: '14:00', end: '15:00', open: '13:55', dead: '14:20' },
      { num: 6, name: 'Period 6: Cloud Computing', start: '15:00', end: '16:00', open: '14:55', dead: '15:20' },
      { num: 7, name: 'Period 7: Seminar & Project Review', start: '16:00', end: '17:00', open: '15:55', dead: '16:20' },
    ];

    let totalCreatedSessions = 0;
    let sampleRecordsCount = 0;

    for (let crIndex = 0; crIndex < createdClassrooms.length; crIndex++) {
      const cr = createdClassrooms[crIndex];
      const count = cr.defaultSessionCount || 7;
      const assignedStudents = cr.students;

      for (let pIndex = 0; pIndex < count; pIndex++) {
        const period = sessionPeriods[pIndex];
        const sessionId = `SESS-${today.replace(/-/g, '')}-${cr.classroomId}-P${period.num}`;

        // Make period 1 completed, period 2 active, others scheduled
        const sessionStatus = pIndex === 0 ? 'completed' : pIndex === 1 ? 'active' : 'scheduled';

        const facultyId = cr.assignedFaculty[pIndex % cr.assignedFaculty.length];

        const session = await AttendanceSession.create({
          sessionId,
          classroomId: cr._id,
          sessionNumber: period.num,
          sessionName: period.name,
          subjectName: period.name.split(':')[1]?.trim() || 'Core Lecture',
          date: today,
          startTime: period.start,
          endTime: period.end,
          attendanceOpeningTime: period.open,
          attendanceDeadline: period.dead,
          assignedFaculty: facultyId,
          status: sessionStatus,
          totalEligibleStudents: assignedStudents.length,
          openedAt: pIndex <= 1 ? new Date() : null,
          closedAt: pIndex === 0 ? new Date() : null,
        });
        totalCreatedSessions++;

        // For completed period 1 and active period 2, generate attendance records
        if (pIndex === 0) {
          // Period 1: Completed session - some Present, some Absent
          let presentCount = 0;
          let absentCount = 0;

          for (let sIdx = 0; sIdx < assignedStudents.length; sIdx++) {
            const studentId = assignedStudents[sIdx];
            const isPresent = sIdx % 4 !== 0; // ~75% attendance

            const rec = await AttendanceRecord.create({
              studentId,
              classroomId: cr._id,
              sessionId: session._id,
              date: today,
              sessionNumber: period.num,
              status: isPresent ? 'Present' : 'Absent',
              checkInTime: isPresent ? new Date(new Date().setHours(9, 5 + sIdx, 0)) : null,
              recognitionConfidence: isPresent ? 96.5 + (sIdx % 3) : 0,
              verificationMethod: isPresent ? 'Face Recognition' : 'Automated Post-Deadline Absence',
              markedBy: facultyId,
            });
            sampleRecordsCount++;
            if (isPresent) presentCount++;
            else absentCount++;
          }

          session.presentCount = presentCount;
          session.absentCount = absentCount;
          session.autoAbsenceProcessed = true;
          await session.save();
        } else if (pIndex === 1) {
          // Period 2: Active session - a few students already marked
          let presentCount = 0;
          for (let sIdx = 0; sIdx < Math.min(3, assignedStudents.length); sIdx++) {
            const studentId = assignedStudents[sIdx];
            await AttendanceRecord.create({
              studentId,
              classroomId: cr._id,
              sessionId: session._id,
              date: today,
              sessionNumber: period.num,
              status: 'Present',
              checkInTime: new Date(),
              recognitionConfidence: 98.2,
              verificationMethod: 'Face Recognition',
              markedBy: facultyId,
            });
            sampleRecordsCount++;
            presentCount++;
          }
          session.presentCount = presentCount;
          await session.save();
        }
      }
    }

    console.log(`[Seed] Created ${totalCreatedSessions} daily sessions and ${sampleRecordsCount} sample attendance records.`);

    // 6. Create a sample Audit Log record to demonstrate correction tracking
    const sampleRecord = await AttendanceRecord.findOne({ status: 'Absent' });
    if (sampleRecord) {
      await AttendanceAuditLog.create({
        attendanceRecordId: sampleRecord._id,
        studentId: sampleRecord.studentId,
        classroomId: sampleRecord.classroomId,
        sessionId: sampleRecord.sessionId,
        date: today,
        previousStatus: 'Not Yet Marked',
        updatedStatus: 'Absent',
        administratorId: admin._id,
        correctionReason: 'Automatic absence processing post session deadline',
        ipAddress: '127.0.0.1',
      });
    }

    console.log('\n===============================================================');
    console.log(' SEEDING COMPLETED SUCCESSFULLY!');
    console.log('===============================================================');
    console.log(' Admin Login:');
    console.log('   Email:    admin@college.edu');
    console.log('   User ID:  ADM001');
    console.log('   Password: AdminPassword@123');
    console.log('---------------------------------------------------------------');
    console.log(' Faculty Logins:');
    console.log('   Email:    prof.sharma@college.edu (FAC101) / Password: Faculty@123');
    console.log('   Email:    dr.ananya@college.edu   (FAC102) / Password: Faculty@123');
    console.log('   Email:    prof.vikram@college.edu (FAC103) / Password: Faculty@123');
    console.log('   Email:    dr.priya@college.edu    (FAC104) / Password: Faculty@123');
    console.log('---------------------------------------------------------------');
    console.log(' Student Login:');
    console.log('   Email:    aarav.patel@student.college.edu (STU2024001) / Password: Student@123');
    console.log('===============================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedDatabase();
