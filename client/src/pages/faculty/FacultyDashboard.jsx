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

  const handleStartSession = async (sessionId) => {
    try {
      const res = await apiClient.post(`/sessions/${sessionId}/start`);
      if (res.data.success) {
        navigate(`/faculty/attendance?sessionId=${sessionId}`);
      }
    } catch (err) {
      console.error('Start session error:', err);
    }
  };

  const activeSessions = sessions.filter((s) => s.status === 'active');
  const completedSessions = sessions.filter((s) => s.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
              Faculty Academic Portal
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              {user?.department}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Welcome, {user?.name} • Manage assigned classroom sessions and live biometric face attendance
          </p>
        </div>

        <Link
          to="/faculty/reports"
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>My Class Reports</span>
        </Link>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Classrooms"
          value={classrooms.length}
          subtitle="Authorized Labs / Halls"
          icon={Building2}
          color="teal"
        />
        <StatCard
          title="Today's Periods"
          value={sessions.length}
          subtitle="Scheduled for Today"
          icon={Calendar}
          color="blue"
        />
        <StatCard
          title="Active Live Sessions"
          value={activeSessions.length}
          subtitle="Scanning Camera Enabled"
          icon={ScanFace}
          color="emerald"
        />
        <StatCard
          title="Completed Sessions"
          value={completedSessions.length}
          subtitle="Absences Processed"
          icon={CheckCircle}
          color="purple"
        />
      </div>

      {/* Active Live Attendance Banner if any session is active */}
      {activeSessions.length > 0 && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-teal-950/80 to-emerald-950/80 border border-teal-500/50 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-teal-300 font-bold text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="uppercase tracking-wider">Active Attendance Session in Progress</span>
            </div>
            <span className="text-[10px] font-mono text-teal-400">READY FOR SCANNING</span>
          </div>

          {activeSessions.map((act) => (
            <div
              key={act._id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-950/80 border border-teal-500/30"
            >
              <div>
                <h2 className="text-base font-bold text-white font-outfit">
                  {act.sessionName} (Period {act.sessionNumber})
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  {act.classroomId?.name} • Hours: {act.startTime} - {act.endTime} • Deadline: {act.attendanceDeadline}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs font-mono">
                  <span className="text-emerald-400 font-bold">{act.presentCount || 0} Marked Present</span>
                  <span className="text-slate-400">/ {act.totalEligibleStudents} Enrolled</span>
                </div>
              </div>

              <button
                onClick={() => navigate(`/faculty/attendance?sessionId=${act._id}`)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-500 hover:to-emerald-600 text-slate-950 font-extrabold text-xs shadow-lg shadow-teal-500/20 flex items-center gap-2 transition-all shrink-0"
              >
                <ScanFace className="w-4 h-4" />
                <span>Open Live Face Scanner</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Today's Timetable Schedule */}
      <div className="p-5 sm:p-6 rounded-3xl glass-panel space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
            <Clock className="w-4 h-4 text-teal-400" />
            <span>Today's Assigned Timetable ({today})</span>
          </div>
          <span className="text-[11px] text-slate-400">Asia/Kolkata IST</span>
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No teaching sessions scheduled for today.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((sess) => {
              const isActive = sess.status === 'active';
              const isCompleted = sess.status === 'completed';

              return (
                <div
                  key={sess._id}
                  className={`p-4 rounded-2xl glass-card border flex flex-col justify-between ${
                    isActive
                      ? 'border-teal-500/60 shadow-md shadow-teal-500/10'
                      : isCompleted
                      ? 'border-slate-800 opacity-80'
                      : 'border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-900 border border-slate-800 text-teal-300">
                        Period {sess.sessionNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                            : isCompleted
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        }`}
                      >
                        {sess.status.toUpperCase()}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-white font-outfit line-clamp-1">{sess.sessionName}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{sess.classroomId?.name}</p>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="text-slate-400">Class Hours:</span>
                        <span>{sess.startTime} - {sess.endTime}</span>
                      </div>
                      <div className="flex justify-between font-mono text-[11px]">
                        <span className="text-slate-400">Deadline:</span>
                        <span className="text-amber-400">{sess.attendanceDeadline}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    {sess.status === 'scheduled' ? (
                      <button
                        onClick={() => handleStartSession(sess._id)}
                        className="w-full py-2 px-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Launch Attendance Session</span>
                      </button>
                    ) : sess.status === 'active' ? (
                      <button
                        onClick={() => navigate(`/faculty/attendance?sessionId=${sess._id}`)}
                        className="w-full py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ScanFace className="w-3.5 h-3.5" />
                        <span>Continue Face Scanning</span>
                      </button>
                    ) : (
                      <div className="text-center text-[11px] text-slate-400 font-mono">
                        {sess.presentCount || 0} Present • {sess.absentCount || 0} Absent
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyDashboard;
