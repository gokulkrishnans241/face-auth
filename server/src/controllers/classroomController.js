import { Classroom } from '../models/Classroom.js';
import { User } from '../models/User.js';

/**
 * @route GET /api/classrooms
 * @desc Get all classrooms (Admins see all 7; Faculty see assigned)
 */
export const getClassrooms = async (req, res, next) => {
  try {
    let filter = {};

    if (req.user.role === 'faculty') {
      filter = { assignedFaculty: req.user._id };
    } else if (req.user.role === 'student') {
      filter = { students: req.user._id };
    }

    const classrooms = await Classroom.find(filter)
      .populate('assignedFaculty', 'name email userId department')
      .populate('students', 'name email userId biometricEnrolled')
      .sort({ classroomId: 1 });

    return res.status(200).json({
      success: true,
      count: classrooms.length,
      classrooms,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/classrooms/:id
 * @desc Get single classroom details
 */
export const getClassroomById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const classroom = await Classroom.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { classroomId: id.toUpperCase() }],
    })
      .populate('assignedFaculty', 'name email userId department')
      .populate('students', 'name email userId department biometricEnrolled');

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Classroom not found.',
      });
    }

    // Role check for faculty
    if (req.user.role === 'faculty') {
      const isAssigned = classroom.assignedFaculty.some(
        (f) => f._id.toString() === req.user._id.toString()
      );
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this classroom.',
        });
      }
    }

    return res.status(200).json({
      success: true,
      classroom,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/classrooms
 * @desc Create a new classroom (Admin only)
 */
export const createClassroom = async (req, res, next) => {
  try {
    const { classroomId, name, roomNumber, department, course, capacity, defaultSessionCount, timetableSlots } = req.body;

    const existing = await Classroom.findOne({ classroomId: classroomId.toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Classroom with ID ${classroomId} already exists.`,
      });
    }

    const classroom = await Classroom.create({
      classroomId: classroomId.toUpperCase(),
      name,
      roomNumber: roomNumber || classroomId,
      department: department || 'Computer Science & Engineering',
      course: course || 'B.Tech CSE',
      capacity: capacity || 60,
      defaultSessionCount: defaultSessionCount || 7,
      timetableSlots: timetableSlots || [],
    });

    return res.status(201).json({
      success: true,
      message: 'Classroom created successfully.',
      classroom,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/classrooms/:id
 * @desc Update classroom configuration & timetable slots (Admin only)
 */
export const updateClassroom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name,
      roomNumber,
      department,
      course,
      capacity,
      status,
      defaultSessionCount,
      assignedFaculty,
      students,
      timetableSlots,
    } = req.body;

    const classroom = await Classroom.findById(id);
    if (!classroom) {
      return res.status(404).json({ success: false, message: 'Classroom not found.' });
    }

    if (name) classroom.name = name;
    if (roomNumber) classroom.roomNumber = roomNumber;
    if (department) classroom.department = department;
    if (course) classroom.course = course;
    if (capacity) classroom.capacity = capacity;
    if (status) classroom.status = status;
    if (defaultSessionCount) classroom.defaultSessionCount = defaultSessionCount;
    if (assignedFaculty) classroom.assignedFaculty = assignedFaculty;
    if (students) classroom.students = students;
    if (timetableSlots) classroom.timetableSlots = timetableSlots;

    await classroom.save();

    // Update students and faculty reverse relations
    if (students && students.length > 0) {
      await User.updateMany(
        { _id: { $in: students } },
        { $addToSet: { assignedClassrooms: classroom._id } }
      );
    }
    if (assignedFaculty && assignedFaculty.length > 0) {
      await User.updateMany(
        { _id: { $in: assignedFaculty } },
        { $addToSet: { assignedFaculty: classroom._id } }
      );
    }

    const updated = await Classroom.findById(classroom._id)
      .populate('assignedFaculty', 'name email userId')
      .populate('students', 'name email userId biometricEnrolled');

    return res.status(200).json({
      success: true,
      message: 'Classroom configuration updated successfully.',
      classroom: updated,
    });
  } catch (error) {
    next(error);
  }
};
