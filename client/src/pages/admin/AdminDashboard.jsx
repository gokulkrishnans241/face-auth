import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import StatCard from '../../components/common/StatCard';
import {
  Building2,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Percent,
  Download,
  Plus,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  Filter,
  ScanFace,
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

import { downloadExcelReport } from '../../utils/exportUtils';

export const AdminDashboard = () => {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/reports/dashboard-stats?date=${date}`);
      if (res.data.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Fetch dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [date]);

  const handleGenerateSessions = async () => {
    setGenerating(true);
    setMessage('');
    try {
      const res = await apiClient.post('/sessions/generate-daily', { date, sessionCount: 7 });
      if (res.data.success) {
        setMessage(`Success: Generated ${res.data.count} timetable periods for ${date}.`);
        fetchDashboardData();
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error generating sessions.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadExcel = async () => {
    setDownloading(true);
    setMessage('');
    try {
      await downloadExcelReport({
        startDate: date,
        endDate: date,
        customFilename: `Institution_Attendance_${date}.xlsx`,
      });
      setMessage('Attendance Excel workbook downloaded successfully.');
    } catch (err) {
      setMessage(err.message || 'Error downloading Excel report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Date Filter & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
              Administrator Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              CENTRAL MONITOR
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time biometric attendance monitoring across all 7 college classrooms
          </p>
        </div>

        {/* Date Filter & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-teal-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none text-xs"
            />
          </div>

          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
            title="Refresh statistics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleGenerateSessions}
            disabled={generating}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-teal-400" />
            <span>Generate Sessions</span>
          </button>

          <button
            onClick={handleDownloadExcel}
            disabled={downloading}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? 'Exporting...' : 'Export Excel Report'}</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-teal-950/80 border border-teal-500/40 text-xs text-teal-200 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-xs text-teal-400 font-bold">Dismiss</button>
        </div>
      )}

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
                Launch optical biometric face recognition scanner. Real-time name display (e.g. "Identity Verified – Gokul Krishnan"), single-scan enforcement, and instant verified check-in.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-teal-300/80 font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-teal-950/80 border border-teal-800/60">✓ 68 Landmarks Mesh</span>
              <span className="px-2.5 py-1 rounded-lg bg-teal-950/80 border border-teal-800/60">✓ Name & ID Display</span>
              <span className="px-2.5 py-1 rounded-lg bg-teal-950/80 border border-teal-800/60">✓ Anti-Duplicate Storage</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/80 relative z-10">
            <Link
              to="/faculty/attendance"
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-teal-400 via-teal-500 to-emerald-500 hover:from-teal-300 hover:to-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-teal-500/25 flex items-center justify-center gap-2.5 transition-all transform hover:scale-[1.02] active:scale-[0.99]"
            >
              <ScanFace className="w-5 h-5" />
              <span>Launch Live Attendance Scanner</span>
            </Link>
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
                Class Summary (7 Classes)
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                Summary across all 7 classrooms for Periods 1 to 7. 1-click status edits (Present / Absent) and 1-click downloads for both Excel (.xlsx) and XML (.xml) attendance reports.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-purple-300/80 font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-800/60">✓ 7 Classes Matrix</span>
              <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-800/60">✓ Periods 1 to 7 Breakdown</span>
              <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-800/60">✓ Download XML & Excel</span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/80 relative z-10">
            <Link
              to="/admin/classrooms"
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-400 via-purple-500 to-indigo-500 hover:from-purple-300 hover:to-indigo-400 text-slate-950 font-black text-sm shadow-xl shadow-purple-500/25 flex items-center justify-center gap-2.5 transition-all transform hover:scale-[1.02] active:scale-[0.99]"
            >
              <Building2 className="w-5 h-5" />
              <span>View Class Summary & Period Matrix</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Administrative Enrollment Quick Links */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
          <Users className="w-4 h-4 text-teal-400" />
          <span>Biometric Enrollment & Account Registrations:</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/admin/students"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all hover:border-teal-500/40"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Student Face Enrollment</span>
          </Link>
          <Link
            to="/admin/faculty"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all hover:border-purple-500/40"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Faculty Face Enrollment</span>
          </Link>
        </div>
      </div>

      {/* Top Level Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard
          title="Total Classrooms"
          value={stats?.summary?.totalClassrooms || 7}
          subtitle="All Active Halls"
          icon={Building2}
          color="purple"
        />
        <StatCard
          title="Scheduled Sessions"
          value={stats?.summary?.totalScheduledSessions || 0}
          subtitle="6-7 Periods / Room"
          icon={Calendar}
          color="blue"
        />
        <StatCard
          title="Unique Students"
          value={stats?.summary?.totalUniqueStudents || 0}
          subtitle="Enrolled in System"
          icon={Users}
          color="teal"
        />
        <StatCard
          title="Present Records"
          value={stats?.summary?.totalPresentRecords || 0}
          subtitle="Verified via Face"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Absent Records"
          value={stats?.summary?.totalAbsentRecords || 0}
          subtitle="Missed Sessions"
          icon={XCircle}
          color="rose"
        />
        <StatCard
          title="Attendance Rate"
          value={`${stats?.summary?.overallPercentage || 0}%`}
          subtitle="College Average"
          icon={Percent}
          color="amber"
          trend={stats?.summary?.overallPercentage >= 75 ? 'Healthy' : 'Needs Review'}
        />
      </div>

      {/* All 7 Classrooms Live Summary Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
            <Building2 className="w-4 h-4 text-teal-400" />
            <span>All 7 College Classrooms Overview</span>
          </div>
          <Link
            to="/admin/classrooms"
            className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
          >
            Manage Classrooms <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(stats?.classroomSummaries || []).map((cr) => (
            <div
              key={cr._id}
              className="p-4 rounded-2xl glass-card hover:border-slate-700 transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                    {cr.classroomId}
                  </span>
                  <span className="text-[10px] text-slate-400">{cr.department}</span>
                </div>

                <h3 className="text-sm font-bold text-white font-outfit line-clamp-1">{cr.name}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Room {cr.roomNumber} • {cr.assignedStudentsCount} Enrolled Students
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Today's Attendance:</span>
                  <span className="font-bold text-white font-mono">{cr.percentage}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      cr.percentage >= 75
                        ? 'bg-emerald-400'
                        : cr.percentage >= 50
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                    style={{ width: `${cr.percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span className="text-emerald-400">{cr.presentCount} Present</span>
                  <span className="text-rose-400">{cr.absentCount} Absent</span>
                  <span>{cr.sessionsCount} Periods</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Session-Wise Breakdown Table */}
      <div className="p-5 sm:p-6 rounded-2xl glass-panel space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Today's Session-Wise Breakdown ({stats?.sessionSummaries?.length || 0} Periods)
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">Configured 6-7 periods schedule</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-3 px-3">Session</th>
                <th className="py-3 px-3">Classroom</th>
                <th className="py-3 px-3">Time Slot</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-center">Eligible</th>
                <th className="py-3 px-3 text-center">Present</th>
                <th className="py-3 px-3 text-center">Absent</th>
                <th className="py-3 px-3 text-center">Not Marked</th>
                <th className="py-3 px-3 text-right">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {(stats?.sessionSummaries || []).map((sess) => (
                <tr key={sess._id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-3 font-semibold text-white">
                    Period {sess.sessionNumber}: {sess.sessionName}
                  </td>
                  <td className="py-3 px-3 text-slate-300">{sess.classroomName}</td>
                  <td className="py-3 px-3 font-mono text-slate-400">
                    {sess.startTime} - {sess.endTime}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sess.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                          : sess.status === 'completed'
                          ? 'bg-slate-800 text-slate-300'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {sess.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-slate-300">{sess.totalEligibleStudents}</td>
                  <td className="py-3 px-3 text-center font-mono text-emerald-400 font-bold">{sess.presentCount}</td>
                  <td className="py-3 px-3 text-center font-mono text-rose-400 font-bold">{sess.absentCount}</td>
                  <td className="py-3 px-3 text-center font-mono text-amber-400">{sess.notYetMarkedCount}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-white">
                    {sess.percentage}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
