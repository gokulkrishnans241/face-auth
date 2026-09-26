import React from 'react';
import { Link } from 'react-router-dom';
import ClassroomPeriodMatrix from '../../components/attendance/ClassroomPeriodMatrix';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  UserCheck,
  GraduationCap,
  ScanFace,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
} from 'lucide-react';

export const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-2">
      {/* 1. Header Banner */}
      <div className="p-6 sm:p-7 rounded-3xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-white font-outfit">
              Administrator Portal
            </h1>
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              CENTRAL ADMIN
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Welcome, <strong className="text-white">{user?.name || 'Administrator'}</strong> • Biometric Enrollment & 7-Class Summary Matrix
          </p>
        </div>
      </div>

      {/* 2. Enrollment Action Cards (Student Enrollment, Faculty Enrollment, Live Attendance) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* CARD 1: STUDENT ENROLLMENT */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-teal-950/70 via-slate-900 to-slate-950 border border-teal-500/30 hover:border-teal-400/60 shadow-xl transition-all flex flex-col justify-between group relative overflow-hidden">
          <div className="space-y-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shadow-lg shadow-teal-500/20">
              <UserCheck className="w-6 h-6" />
            </div>

            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider">
                Enrollment • Students
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white font-outfit mt-1.5">
                Student Face Enrollment
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Register students, capture 128-d optical facial descriptors with 68 landmarks, and manage classroom rosters.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <Link
              to="/admin/students"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.99]"
            >
              <UserCheck className="w-4 h-4" />
              <span>Enroll Students</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>
        </div>

        {/* CARD 2: FACULTY ENROLLMENT */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-950/70 via-slate-900 to-slate-950 border border-purple-500/30 hover:border-purple-400/60 shadow-xl transition-all flex flex-col justify-between group relative overflow-hidden">
          <div className="space-y-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-lg shadow-purple-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>

            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                Enrollment • Faculty
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white font-outfit mt-1.5">
                Faculty Face Enrollment
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Register professors & lecturers, assign departments, and enroll faculty biometric face authentication.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <Link
              to="/admin/faculty"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-slate-950 font-black text-xs shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.99]"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Enroll Faculty</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>
        </div>

        {/* CARD 3: TAKE LIVE ATTENDANCE */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-950/70 via-slate-900 to-slate-950 border border-cyan-500/30 hover:border-cyan-400/60 shadow-xl transition-all flex flex-col justify-between group relative overflow-hidden">
          <div className="space-y-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-lg shadow-cyan-500/20">
              <ScanFace className="w-6 h-6" />
            </div>

            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase tracking-wider">
                Live Scanner
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white font-outfit mt-1.5">
                Live Attendance Scanner
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Launch real-time facial recognition camera, verify identities with name display, and prevent duplicate check-ins.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80">
            <Link
              to="/faculty/attendance"
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-500 hover:from-cyan-300 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.99]"
            >
              <ScanFace className="w-4 h-4" />
              <span>Launch Scanner</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 3. CLASS SUMMARY & 7-PERIOD ATTENDANCE MATRIX (Directly on Dashboard) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg sm:text-xl font-black text-white font-outfit">
              Class Summary (7 Classes • Periods 1–7)
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Real-Time Attendance Matrix</span>
        </div>

        {/* Embedded Classroom Period Matrix with Class 1-7 buttons, Period 1-7 filters, and Excel/XML downloads */}
        <ClassroomPeriodMatrix
          allowClassroomSwitch={true}
          userRole="admin"
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
