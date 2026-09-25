import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  Users,
  GraduationCap,
  ScanFace,
  Sparkles,
} from 'lucide-react';

export const Sidebar = () => {
  const { isAdmin, isFaculty, isStudent } = useAuth();

  // Clean, focused navigation
  const adminNav = [
    { label: 'Student Enrollment', path: '/admin/students', icon: GraduationCap },
    { label: 'Faculty Enrollment', path: '/admin/faculty', icon: Users },
    { label: 'Classroom Summary (7 Classes)', path: '/admin/classrooms', icon: Building2 },
  ];

  const facultyNav = [
    { label: 'Take Live Attendance', path: '/faculty/attendance', icon: ScanFace },
    { label: 'Classroom Summary (Periods 1-7)', path: '/faculty/reports', icon: Building2 },
  ];

  const studentNav = [
    { label: 'Biometric Enrollment', path: '/student/enroll', icon: ScanFace },
    { label: 'Attendance History', path: '/student/reports', icon: Building2 },
  ];

  const navItems = isAdmin ? adminNav : isFaculty ? facultyNav : studentNav;

  return (
    <aside className="w-64 shrink-0 hidden lg:block border-r border-slate-800/80 bg-slate-950/60 min-h-[calc(100vh-4rem)] p-4">
      <div className="mb-4 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="font-semibold text-slate-300">
          {isAdmin ? 'ADMIN PORTAL' : isFaculty ? 'FACULTY PORTAL' : 'STUDENT PORTAL'}
        </span>
        <span className="text-teal-400 font-mono text-[10px]">ACTIVE</span>
      </div>

      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/40 shadow-sm shadow-teal-500/10 font-bold'
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

      <div className="mt-8 p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/40 border border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-semibold text-teal-300 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>Biometric Protection</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          100% human face presence verification & encrypted 128-d biometric matching enabled.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
