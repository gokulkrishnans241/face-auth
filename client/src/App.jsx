import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Common Components
import Navbar from './components/common/Navbar';

// Pages
import Login from './pages/Login';
import NotFound from './pages/NotFound';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ClassroomManagement from './pages/admin/ClassroomManagement';
import SessionTimetable from './pages/admin/SessionTimetable';
import FacultyManagement from './pages/admin/FacultyManagement';
import StudentManagement from './pages/admin/StudentManagement';
import AttendanceEditor from './pages/admin/AttendanceEditor';
import ReportsCenter from './pages/admin/ReportsCenter';
import AuditLogs from './pages/admin/AuditLogs';

// Faculty Pages
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import FacultyAttendanceSession from './pages/faculty/FacultyAttendanceSession';
import FacultyReports from './pages/faculty/FacultyReports';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentEnrollFace from './pages/student/StudentEnrollFace';
import StudentReports from './pages/student/StudentReports';

// Protected App Layout Wrapper (Clean, No Sidebar Layout)
const AppLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
          <span className="text-xs font-medium text-slate-400">Loading SmartFace Portal...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Role-Based Route Guard
const RequireRole = ({ allowedRoles = [] }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) {
    // Redirect to user's authorized home
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'faculty') return <Navigate to="/faculty" replace />;
    return <Navigate to="/student" replace />;
  }

  return <Outlet />;
};

// Root index redirector based on authenticated user role
const RootRedirector = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'faculty') return <Navigate to="/faculty" replace />;
  return <Navigate to="/student" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<Login />} />

          {/* Root Redirector */}
          <Route path="/" element={<RootRedirector />} />

          {/* Protected Main Layout */}
          <Route element={<AppLayout />}>
            {/* Administrator Routes */}
            <Route element={<RequireRole allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/classrooms" element={<ClassroomManagement />} />
              <Route path="/admin/timetable" element={<SessionTimetable />} />
              <Route path="/admin/faculty" element={<FacultyManagement />} />
              <Route path="/admin/students" element={<StudentManagement />} />
              <Route path="/admin/attendance-editor" element={<AttendanceEditor />} />
              <Route path="/admin/reports" element={<ReportsCenter />} />
              <Route path="/admin/audit-logs" element={<AuditLogs />} />
            </Route>

            {/* Faculty Routes */}
            <Route element={<RequireRole allowedRoles={['faculty', 'admin']} />}>
              <Route path="/faculty" element={<FacultyDashboard />} />
              <Route path="/faculty/attendance" element={<FacultyAttendanceSession />} />
              <Route path="/faculty/reports" element={<FacultyReports />} />
            </Route>

            {/* Student Routes */}
            <Route element={<RequireRole allowedRoles={['student', 'admin']} />}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/enroll" element={<StudentEnrollFace />} />
              <Route path="/student/reports" element={<StudentReports />} />
            </Route>
          </Route>

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
