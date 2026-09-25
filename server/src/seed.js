import mongoose from 'mongoose';
import dns from 'dns';
import { config } from './config/env.js';
import { User } from './models/User.js';
import { FaceProfile } from './models/FaceProfile.js';
import { Classroom } from './models/Classroom.js';
import { AttendanceSession } from './models/AttendanceSession.js';
import { AttendanceRecord } from './models/AttendanceRecord.js';
import { AttendanceAuditLog } from './models/AttendanceAuditLog.js';

// Resolve MongoDB SRV records via public DNS servers
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Ignore in restricted environments
}

const seedFreshDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB Atlas...');
    await mongoose.connect(config.mongoUri);
    console.log('[Seed] Connected to database.');

    // Clear old data for a fresh start
    await Promise.all([
      User.deleteMany({}),
      FaceProfile.deleteMany({}),
      Classroom.deleteMany({}),
      AttendanceSession.deleteMany({}),
      AttendanceRecord.deleteMany({}),
      AttendanceAuditLog.deleteMany({}),
    ]);
    console.log('[Seed] Cleared old data for fresh production setup.');

    // 1. Create Initial Administrator
    const admin = await User.create({
      userId: 'ADM001',
      name: 'College Administrator',
      email: 'admin@college.edu',
      password: 'AdminPassword@123',
      role: 'admin',
      department: 'College Academic Administration',
      accountStatus: 'active',
      phoneNumber: '+91 98765 43210',
    });
    console.log('[Seed] Admin account initialized: admin@college.edu');

    // 2. Create All 7 Official College Classrooms
    const classroomData = [
      {
        classroomId: 'CR-101',
        name: 'Room 101 - Smart Hall Alpha',
        roomNumber: '101',
        department: 'Computer Science & Engineering',
        course: 'B.Tech CSE - Section A',
        capacity: 60,
        defaultSessionCount: 7,
        assignedFaculty: [],
        students: [],
      },
      {
        classroomId: 'CR-102',
        name: 'Room 102 - Smart Hall Beta',
        roomNumber: '102',
        department: 'Computer Science & Engineering',
        course: 'B.Tech CSE - Section B',
        capacity: 60,
        defaultSessionCount: 7,
        assignedFaculty: [],
        students: [],
      },
      {
        classroomId: 'CR-103',
        name: 'Room 103 - IoT & Computing Lab',
        roomNumber: '103',
        department: 'Information Technology',
        course: 'B.Tech IT - Year III',
        capacity: 45,
        defaultSessionCount: 7,
        assignedFaculty: [],
        students: [],
      },
      {
        classroomId: 'CR-104',
        name: 'Room 104 - Artificial Intelligence Lab',
        roomNumber: '104',
        department: 'Artificial Intelligence & Data Science',
        course: 'B.Tech AI & DS - Year III',
        capacity: 45,
        defaultSessionCount: 7,
        assignedFaculty: [],
        students: [],
      },
      {
        classroomId: 'CR-105',
        name: 'Room 105 - Systems & Networks Lab',
        roomNumber: '105',
        department: 'Computer Science & Engineering',
        course: 'B.Tech CSE - Lab Group 1',
        capacity: 45,
        defaultSessionCount: 7,
        assignedFaculty: [],
        students: [],
      },
      {
        classroomId: 'CR-106',
        name: 'Room 106 - Seminar Hall East',
        roomNumber: '106',
        department: 'Electronics & Communication',
        course: 'B.Tech ECE - Final Year',
        capacity: 120,
        defaultSessionCount: 7,
        assignedFaculty: [],
        students: [],
      },
      {
        classroomId: 'CR-107',
        name: 'Room 107 - Executive Lecture Theater',
        roomNumber: '107',
        department: 'Computer Science & Engineering',
        course: 'M.Tech CSE / Advanced Electives',
        capacity: 80,
        defaultSessionCount: 7,
        assignedFaculty: [],
        students: [],
      },
    ];

    const createdClassrooms = await Classroom.create(classroomData);
    const allClassroomIds = createdClassrooms.map((c) => c._id);
    console.log('[Seed] Initialized all 7 official college classrooms (CR-101 to CR-107).');

    // 3. Create Initial Faculty Account (assigned to all 7 classrooms for immediate use)
    const faculty = await User.create({
      userId: 'FAC101',
      name: 'Prof. Rajesh Sharma',
      email: 'prof.sharma@college.edu',
      password: 'Faculty@123',
      role: 'faculty',
      department: 'Computer Science & Engineering',
      accountStatus: 'active',
      assignedClassrooms: allClassroomIds,
      phoneNumber: '+91 98765 11001',
    });

    // Assign faculty to all classrooms
    await Classroom.updateMany({}, { $addToSet: { assignedFaculty: faculty._id } });
    console.log('[Seed] Initial faculty account created: prof.sharma@college.edu (Assigned to all 7 rooms).');

    console.log('\n===============================================================');
    console.log(' FRESH DATABASE INITIALIZATION COMPLETE!');
    console.log('===============================================================');
    console.log(' Admin Login (to enroll students & faculty with camera):');
    console.log('   Email:    admin@college.edu');
    console.log('   Password: AdminPassword@123');
    console.log('---------------------------------------------------------------');
    console.log(' Faculty Login (to select Room -> Subject -> Timings & Scan):');
    console.log('   Email:    prof.sharma@college.edu');
    console.log('   Password: Faculty@123');
    console.log('===============================================================\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedFreshDatabase();
