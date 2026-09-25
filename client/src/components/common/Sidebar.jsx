import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  Users,
  GraduationCap,
  FileEdit,
  FileSpreadsheet,
  History,
  ScanFace,
  FileText,
  UserCheck,
  Sparkles,
} from 'lucide-react';

export const Sidebar = () => {
  const { isAdmin, isFaculty, isStudent } = useAuth();

  const adminNav = [
    { label: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: '7 Classrooms', path: '/admin/classrooms', icon: Building2 },
    { label: 'Sessions & Timetable', path: '/admin/timetable', icon: CalendarDays },
    { label: 'Faculty Accounts', path: '/admin/faculty', icon: Users },
    { label: 'Student Management', path: '/admin/students', icon: GraduationCap },
    { label: 'Attendance Corrections', path: '/admin/attendance-editor', icon: FileEdit },
    { label: 'Reports & Excel Export', path: '/admin/reports', icon: FileSpreadsheet },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: History },
  ];

  const facultyNav = [
    { label: 'Faculty Dashboard', path: '/faculty', icon: LayoutDashboard },
    { label: 'Live Face Attendance', path: '/faculty/attendance', icon: ScanFace },
    { label: 'Classroom Reports', path: '/faculty/reports', icon: FileSpreadsheet },
  ];

  const studentNav = [
    { label: 'My Dashboard', path: '/student', icon: LayoutDashboard },
    { label: 'Biometric Enrollment', path: '/student/enroll', icon: ScanFace },
    { label: 'Attendance History', path: '/student/reports', icon: FileText },
  ];

  const navItems = isAdmin ? adminNav : isFaculty ? facultyNav : studentNav;

  return (
    <aside className="w-64 shrink-0 hidden lg:block border-r border-slate-800/80 bg-slate-950/60 min-h-[calc(100vh-4rem)] p-4">
      <div className="mb-4 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="font-semibold text-slate-300">PORTAL NAVIGATION</span>
        <span className="text-teal-400 font-mono text-[10px]">v1.0-PROD</span>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin' || item.path === '/faculty' || item.path === '/student'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 shadow-sm shadow-teal-500/10 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/70 border border-transparent'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-8 p-3 rounded-xl bg-gradient-to-br from-slate-900 to-slate-900/40 border border-slate-800/60">
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-300 mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Biometric Protection</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Embeddings are encrypted & stored with consent timestamps. Never transmitted as raw images.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
