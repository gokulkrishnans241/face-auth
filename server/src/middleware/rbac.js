export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' is not authorized to access this resource.`,
      });
    }

    next();
  };
};

// Check if faculty has access to a specific classroom
export const facultyClassroomAccess = (req, res, next) => {
  if (req.user.role === 'admin') {
    return next(); // Admins have universal access across all 7 classrooms
  }

  const classroomId = req.params.classroomId || req.body.classroomId || req.query.classroomId;

  if (!classroomId) {
    return next();
  }

  const assigned = req.user.assignedClassrooms.some(
    (cr) => cr._id.toString() === classroomId.toString() || cr.classroomId === classroomId
  );

  if (!assigned) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied. You are not assigned to this classroom.',
    });
  }

  next();
};
