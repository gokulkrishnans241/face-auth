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
  BookOpen,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
              Faculty Classroom Portal
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              FACULTY DESK
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Welcome, {user?.name} • Select room, subject, and timings to launch live camera attendance
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

      {/* Hero Attendance Launcher Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-teal-950/90 via-slate-900 to-slate-950 border border-teal-500/40 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
            <Camera className="w-3.5 h-3.5" />
            <span>OPTICAL FACE SCANNER STATION</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
            Launch Live Classroom Attendance
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Select your <strong>Classroom (Room 101–107)</strong>, <strong>Subject</strong>, and <strong>Period Timings</strong>. Place your device at the classroom entrance so students pass by and automatically verify their presence!
          </p>
        </div>

        <button
          onClick={() => navigate('/faculty/attendance')}
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-teal-400 to-emerald-500 hover:from-teal-500 hover:to-emerald-600 text-slate-950 font-extrabold text-xs sm:text-sm shadow-xl shadow-teal-500/25 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] shrink-0"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Select Room & Launch Scanner</span>
        </button>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Classrooms"
          value={classrooms.length}
          subtitle="Available for Teaching"
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
          subtitle="Camera Scanning Open"
          icon={ScanFace}
          color="emerald"
        />
        <StatCard
          title="Completed Today"
          value={completedSessions.length}
          subtitle="Finalized Records"
          icon={CheckCircle}
          color="purple"
        />
      </div>

      {/* Assigned Classrooms List */}
      <div className="p-5 sm:p-6 rounded-3xl glass-panel space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-teal-400" />
            <span>My Assigned Classrooms (Room 101 to 107)</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">{classrooms.length} Available</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map((cr) => (
            <div
              key={cr._id}
              className="p-4 rounded-2xl glass-card border border-slate-800 hover:border-teal-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                    {cr.classroomId}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{cr.capacity} Seats</span>
                </div>
                <h3 className="text-sm font-bold text-white font-outfit">{cr.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{cr.department} • {cr.course}</p>
              </div>

              <button
                onClick={() => navigate(`/faculty/attendance`)}
                className="mt-4 w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-800"
              >
                <ScanFace className="w-3.5 h-3.5" />
                <span>Start Class Attendance</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FacultyDashboard;
