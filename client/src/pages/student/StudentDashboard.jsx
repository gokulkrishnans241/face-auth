import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import StatCard from '../../components/common/StatCard';
import {
  GraduationCap,
  Calendar,
  CheckCircle2,
  XCircle,
  Percent,
  ScanFace,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStudentHistory = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/attendance/student');
      if (res.data.success) {
        setHistory(res.data);
      }
    } catch (err) {
      console.error('Fetch student history error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentHistory();
  }, []);

  const percentage = history?.summary?.percentage || 0;
  const isEligibleForExams = percentage >= 75;

  return (
    <div className="space-y-6">
      {/* Student Profile Card Header */}
      <div className="p-6 rounded-3xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 flex items-center justify-center font-extrabold text-xl shadow-lg shadow-cyan-500/20">
            {user?.name?.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-white font-outfit">{user?.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {user?.userId}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {user?.department} • Academic Year 2025-2026
            </p>
          </div>
        </div>

        {/* Biometric Status Pill */}
        <div className="flex items-center gap-3">
          {user?.biometricEnrolled ? (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Face Profile Active</span>
            </div>
          ) : (
            <Link
              to="/student/enroll"
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Enroll Biometric Face</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Attendance Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Total Eligible Sessions"
          value={history?.summary?.totalEligible || 0}
          subtitle="Classes Scheduled"
          icon={Calendar}
          color="blue"
        />
        <StatCard
          title="Present Records"
          value={history?.summary?.presentCount || 0}
          subtitle="Verified Attendances"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Absent Records"
          value={history?.summary?.absentCount || 0}
          subtitle="Missed Periods"
          icon={XCircle}
          color="rose"
        />
        <StatCard
          title="Attendance Rate"
          value={`${percentage}%`}
          subtitle={isEligibleForExams ? 'Eligible for Exams (>=75%)' : 'Shortage Alert (<75%)'}
          icon={Percent}
          color={isEligibleForExams ? 'teal' : 'amber'}
          trend={isEligibleForExams ? 'Good' : 'Critical'}
        />
      </div>

      {/* Recent Attendance Records History */}
      <div className="p-5 sm:p-6 rounded-3xl glass-panel space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
            <Clock className="w-4 h-4 text-teal-400" />
            <span>My Attendance History</span>
          </div>
          <Link
            to="/student/reports"
            className="text-xs font-semibold text-teal-400 hover:text-teal-300"
          >
            View Complete Report →
          </Link>
        </div>

        {history?.records?.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No attendance records recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Classroom</th>
                  <th className="py-3 px-3">Period</th>
                  <th className="py-3 px-3">Check-in Time</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {(history?.records || []).slice(0, 10).map((r) => {
                  const isPresent = r.status === 'Present';
                  return (
                    <tr key={r._id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-300">{r.date}</td>
                      <td className="py-3 px-3 text-white font-semibold">{r.classroomId?.name}</td>
                      <td className="py-3 px-3 text-slate-400">
                        {r.sessionId?.sessionName || `Period ${r.sessionNumber}`}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {r.checkInTime ? format(new Date(r.checkInTime), 'hh:mm:ss a') : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPresent
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
                        {r.verificationMethod}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
