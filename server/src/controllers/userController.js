import { User } from '../models/User.js';
import { Classroom } from '../models/Classroom.js';
import { FaceProfile } from '../models/FaceProfile.js';

/**
 * @route GET /api/users
 * @desc Get list of users with filter by role and department (Admin only)
 */
export const getUsers = async (req, res, next) => {
  try {
    const { role, department, status, search } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (department) filter.department = department;
    if (status) filter.accountStatus = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { userId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .populate('assignedClassrooms')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/users/faculty
 * @desc Get all faculty members
 */
export const getFacultyList = async (req, res, next) => {
  try {
    const faculty = await User.find({ role: 'faculty' })
      .populate('assignedClassrooms')
      .sort({ name: 1 });

    return res.status(200).json({
      success: true,
      faculty,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/users/students
 * @desc Get all students
 */
export const getStudentsList = async (req, res, next) => {
  try {
    const { classroomId } = req.query;
    let filter = { role: 'student' };

    if (classroomId) {
      filter.assignedClassrooms = classroomId;
    }

    const students = await User.find(filter)
      .populate('assignedClassrooms')
      .sort({ userId: 1 });

    return res.status(200).json({
      success: true,
      students,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/users
 * @desc Create faculty or student account (Admin)
 */
export const createUser = async (req, res, next) => {
  try {
    const { userId, name, email, password, role, department, assignedClassrooms, phoneNumber } = req.body;

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { userId: userId.trim() }],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this User ID or Email already exists.',
      });
    }

    const user = await User.create({
      userId: userId.trim(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password || 'College@123',
      role: role || 'student',
      department: department || 'Computer Science & Engineering',
      assignedClassrooms: assignedClassrooms || [],
      phoneNumber,
    });

    // If assigned to classrooms, update the classroom documents
    if (assignedClassrooms && assignedClassrooms.length > 0) {
      if (user.role === 'faculty') {
        await Classroom.updateMany(
          { _id: { $in: assignedClassrooms } },
          { $addToSet: { assignedFaculty: user._id } }
        );
      } else if (user.role === 'student') {
        await Classroom.updateMany(
          { _id: { $in: assignedClassrooms } },
          { $addToSet: { students: user._id } }
        );
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route PUT /api/users/:id
 * @desc Update user account details (Admin)
 */
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, department, accountStatus, assignedClassrooms, phoneNumber } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (department) user.department = department;
    if (accountStatus) user.accountStatus = accountStatus;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

    if (assignedClassrooms !== undefined) {
      user.assignedClassrooms = assignedClassrooms;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'User details updated successfully.',
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route DELETE /api/users/:id
 * @desc Delete or deactivate user account (Admin)
 */
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Also remove any linked FaceProfile
    await FaceProfile.deleteMany({ userId: user._id });

    // Remove from classrooms
    await Classroom.updateMany(
      { assignedFaculty: user._id },
      { $pull: { assignedFaculty: user._id } }
    );
    await Classroom.updateMany(
      { students: user._id },
      { $pull: { students: user._id } }
    );

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'User account and associated profiles removed.',
    });
  } catch (error) {
    next(error);
  }
};
