import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import StatCard from '../../components/common/StatCard';
import { useAuth } from '../../context/AuthContext';
import {
  Calendar,
  Building2,
  ScanFace,
  Play,
  CheckCircle,
  Clock,
  Users,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Camera,
  Layers,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';

export const FacultyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [sessions, setSessions] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFacultyData = async () => {
    setLoading(true);
    try {
      const [resSess, resCr] = await Promise.all([
        apiClient.get(`/sessions?date=${today}`),
        apiClient.get('/classrooms'),
      ]);
      if (resSess.data.success) setSessions(resSess.data.sessions);
      if (resCr.data.success) setClassrooms(resCr.data.classrooms);
    } catch (err) {
      console.error('Fetch faculty dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacultyData();
  }, []);

  const activeSessions = sessions.filter((s) => s.status === 'active');
  const completedSessions = sessions.filter((s) => s.status === 'completed');

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      {/* Welcome Banner */}
      <div className="p-6 rounded-3xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-white font-outfit">
              Faculty Attendance Portal
            </h1>
            <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              FACULTY DESK
            </span>
          </div>
          <p className="text-sm text-slate-300 mt-1">
            Welcome, <strong className="text-white">{user?.name}</strong> • Choose an action below to begin
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800 self-start sm:self-auto">
          <Clock className="w-4 h-4 text-teal-400" />
          <span>{format(new Date(), 'EEEE, dd MMMM yyyy')}</span>
        </div>
      </div>

      {/* THE TWO PRIMARY ACTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* OPTION 1: LIVE ATTENDANCE */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-teal-950/80 via-slate-900 to-slate-950 border-2 border-teal-500/40 shadow-2xl hover:border-teal-400 transition-all flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <ScanFace className="w-36 h-36 text-teal-400" />
          </div>

          <div className="space-y-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-slate-950 shadow-lg shadow-teal-500/30">
              <ScanFace className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider">
                Option 1 • Live Scanner
              </span>
              <h2 className="text-2xl font-black text-white font-outfit mt-2">
                Take Live Attendance
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                Launch optical biometric face recognition for your classroom. Automatically identify students by name in real-time, enforce single-scan attendance, and display verified identity badges.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-teal-300/80 font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-teal-950/80 border border-teal-800/60">✓ 68 Face Landmarks</span>
              <span className="px-2.5 py-1 rounded-lg bg-teal-950/80 border border-teal-800/60">✓ Real-time Name HUD</span>
              <span className="px-2.5 py-1 rounded-lg bg-teal-950/80 border border-teal-800/60">✓ Anti-Duplicate Check</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/80 relative z-10">
            <button
              onClick={() => navigate('/faculty/attendance')}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-teal-500/25 flex items-center justify-center gap-2.5 transition-all transform hover:scale-[1.02] active:scale-[0.99]"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Launch Live Attendance Scanner</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>

        {/* OPTION 2: CLASS SUMMARY */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-purple-950/60 via-slate-900 to-slate-950 border-2 border-purple-500/40 shadow-2xl hover:border-purple-400 transition-all flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Building2 className="w-36 h-36 text-purple-400" />
          </div>

          <div className="space-y-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-slate-950 shadow-lg shadow-purple-500/30">
              <Building2 className="w-8 h-8 stroke-[2.2]" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                Option 2 • Timetable Matrix
              </span>
              <h2 className="text-2xl font-black text-white font-outfit mt-2">
                Class Summary (Periods 1–7)
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                View all classrooms and periods (Period 1 to Period 7). Edit stored attendance with 1-click status overrides (Present / Absent) and instantly download Excel (.xlsx) and XML (.xml) attendance sheets.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-purple-300/80 font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-800/60">✓ 7 Classes x 7 Periods</span>
              <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-800/60">✓ 1-Click Status Edit</span>
              <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-800/60">✓ Download XML & Excel</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/80 relative z-10">
            <button
              onClick={() => navigate('/faculty/reports')}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-400 via-purple-500 to-indigo-500 hover:from-purple-300 hover:to-indigo-400 text-slate-950 font-black text-sm shadow-xl shadow-purple-500/25 flex items-center justify-center gap-2.5 transition-all transform hover:scale-[1.02] active:scale-[0.99]"
            >
              <FileSpreadsheet className="w-5 h-5" />
              <span>View Class Summary & Export</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Status Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Classrooms"
          value={classrooms.length || 7}
          subtitle="All Active Rooms"
          icon={Building2}
          color="teal"
        />
        <StatCard
          title="Today's Sessions"
          value={sessions.length}
          subtitle="Periods Scheduled"
          icon={Calendar}
          color="blue"
        />
        <StatCard
          title="Active Live Sessions"
          value={activeSessions.length}
          subtitle="Scanning In Progress"
          icon={ScanFace}
          color="emerald"
        />
        <StatCard
          title="Completed Today"
          value={completedSessions.length}
          subtitle="Attendance Finalized"
          icon={CheckCircle}
          color="purple"
        />
      </div>
    </div>
  );
};

export default FacultyDashboard;
