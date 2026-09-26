import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { NavLink, Link } from 'react-router-dom';
import {
  ScanFace,
  Clock,
  ShieldCheck,
  GraduationCap,
  UserCheck,
  LogOut,
  Sparkles,
  Building2,
  Calendar,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';

export const Navbar = () => {
  const { user, logout, isAdmin, isFaculty, isStudent } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const homePath = isAdmin ? '/admin' : isFaculty ? '/faculty' : '/student';
  const liveAttendancePath = '/faculty/attendance';
  const classSummaryPath = isAdmin ? '/admin/classrooms' : '/faculty/reports';

  const getRoleBadge = () => {
    if (isAdmin) {
      return (
        <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          ADMINISTRATOR
        </span>
      );
    }
    if (isFaculty) {
      return (
        <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
          <UserCheck className="w-3.5 h-3.5 text-teal-400" />
          FACULTY
        </span>
      );
    }
    return (
      <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
        <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
        STUDENT
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto">
        {/* Left: Brand / Logo */}
        <Link to={homePath} className="flex items-center gap-3 group">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/20 text-slate-950 group-hover:scale-105 transition-transform">
            <ScanFace className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-white font-outfit">
                SmartFace<span className="text-teal-400">Portal</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/60 rounded">
                <Sparkles className="w-2.5 h-2.5" /> LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              College of Engineering & Technology
            </p>
          </div>
        </Link>

        {/* Center: The TWO Primary Navigation Buttons (Live Attendance & Class Summary) */}
        {!isStudent ? (
          <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
            <NavLink
              to={liveAttendancePath}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 shadow-md shadow-teal-500/20 scale-105'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`
              }
            >
              <ScanFace className="w-4 h-4" />
              <span>Live Attendance</span>
            </NavLink>

            <NavLink
              to={classSummaryPath}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 shadow-md shadow-teal-500/20 scale-105'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`
              }
            >
              <Building2 className="w-4 h-4" />
              <span>Class Summary</span>
            </NavLink>
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:gap-3 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
            <NavLink
              to="/student/enroll"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 shadow-md shadow-teal-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`
              }
            >
              <ScanFace className="w-4 h-4" />
              <span>Face Enrollment</span>
            </NavLink>

            <NavLink
              to="/student/reports"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3.5 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-slate-950 shadow-md shadow-teal-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`
              }
            >
              <Building2 className="w-4 h-4" />
              <span>My Attendance</span>
            </NavLink>
          </div>
        )}

        {/* Right: Clock & User Profile & Role & Logout */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-teal-400" />
            <span>{format(time, 'hh:mm:ss a')}</span>
          </div>

          {getRoleBadge()}

          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-semibold text-slate-200">{user?.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">{user?.userId}</span>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors border border-slate-800 hover:border-red-500/30"
            title="Sign out of system"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
