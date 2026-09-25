import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../config/env.js';

// Helper to generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

/**
 * @route POST /api/auth/login
 * @desc Authenticate user & get token
 */
export const login = async (req, res, next) => {
  try {
    const { emailOrUserId, password } = req.body;

    if (!emailOrUserId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email or User ID and password.',
      });
    }

    const user = await User.findOne({
      $or: [
        { email: emailOrUserId.toLowerCase().trim() },
        { userId: emailOrUserId.trim() },
      ],
    }).populate('assignedClassrooms');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated or suspended. Please contact administrator.',
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        _id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        assignedClassrooms: user.assignedClassrooms,
        biometricEnrolled: user.biometricEnrolled,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route GET /api/auth/me
 * @desc Get current authenticated user profile
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate('assignedClassrooms');
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route POST /api/auth/register
 * @desc Register a new user (Admin can register faculty/students; public student registration)
 */
export const register = async (req, res, next) => {
  try {
    const { userId, name, email, password, role, department, assignedClassrooms } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { userId: userId.trim() }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this Email or User ID already exists.',
      });
    }

    // Restrict creating admin roles to existing admins only
    const userRole = role && ['admin', 'faculty', 'student'].includes(role) ? role : 'student';
    if (userRole === 'admin' && (!req.user || req.user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only authorized administrators can assign administrator role.',
      });
    }

    const user = await User.create({
      userId: userId.trim(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: userRole,
      department: department || 'Computer Science & Engineering',
      assignedClassrooms: assignedClassrooms || [],
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: `${userRole.toUpperCase()} account created successfully.`,
      token,
      user: {
        _id: user._id,
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    next(error);
  }
};
