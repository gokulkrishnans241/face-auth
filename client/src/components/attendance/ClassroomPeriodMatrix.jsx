import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { downloadExcelReport } from '../../utils/exportUtils';
import {
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  UserCheck,
  UserX,
} from 'lucide-react';
import { format } from 'date-fns';

export const ClassroomPeriodMatrix = ({
  initialClassroomId = '',
  initialDate = '',
  allowClassroomSwitch = true,
  userRole = 'faculty',
}) => {
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(initialDate || todayStr);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState(initialClassroomId);
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'period_breakdown'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'has_absence' | 'full_present'
  const [message, setMessage] = useState({ type: '', text: '' });
  const [togglingStudentId, setTogglingStudentId] = useState(null);
  const [expandedPeriod, setExpandedPeriod] = useState(1);

  // 1. Fetch Classrooms
  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const res = await apiClient.get('/classrooms');
        if (res.data.success && res.data.classrooms.length > 0) {
          setClassrooms(res.data.classrooms);
          if (!selectedClassroomId) {
            setSelectedClassroomId(res.data.classrooms[0]._id);
          }
        }
      } catch (err) {
        console.error('Fetch classrooms error:', err);
      }
    };
    fetchClassrooms();
  }, []);

  // 2. Fetch Classroom Period Matrix
  const fetchMatrix = async () => {
    if (!selectedClassroomId) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await apiClient.get('/attendance/classroom-period-matrix', {
        params: { classroomId: selectedClassroomId, date },
      });
      if (res.data.success) {
        setMatrixData(res.data);
      }
    } catch (err) {
      console.error('Fetch matrix error:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to load classroom attendance matrix.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClassroomId) {
      fetchMatrix();
    }
  }, [selectedClassroomId, date]);

  // 3. Quick 1-Click Toggle Status Handler
  const handleToggleStatus = async (studentId, sessionId, currentStatus) => {
    const targetStatus = currentStatus === 'Present' ? 'Absent' : 'Present';
    const key = `${studentId}_${sessionId}`;
    setTogglingStudentId(key);

    // Optimistic UI Update
    setMatrixData((prev) => {
      if (!prev) return prev;
      const updatedStudents = prev.students.map((st) => {
        if (st._id === studentId) {
          const updatedPeriods = st.periods.map((p) => {
            if (p.sessionId === sessionId) {
              return { ...p, status: targetStatus };
            }
            return p;
          });

          let pCount = 0;
          let aCount = 0;
          updatedPeriods.forEach((p) => {
            if (p.status === 'Present') pCount++;
            if (p.status === 'Absent') aCount++;
          });
          const total = pCount + aCount;
          const percentage = total > 0 ? (pCount / total) * 100 : 0;

          return {
            ...st,
            periods: updatedPeriods,
            summary: {
              ...st.summary,
              totalPresent: pCount,
              totalAbsent: aCount,
              percentage: parseFloat(percentage.toFixed(1)),
            },
          };
        }
        return st;
      });

      // Update periodSummaries lists
      const updatedSummaries = (prev.periodSummaries || []).map((pSummary) => {
        if (pSummary.sessionId === sessionId) {
          const targetSt = prev.students.find((s) => s._id === studentId);
          if (!targetSt) return pSummary;

          const stObj = {
            _id: targetSt._id,
            userId: targetSt.userId,
            name: targetSt.name,
            email: targetSt.email,
          };

          let newPresent = [...pSummary.presentStudents];
          let newAbsent = [...pSummary.absentStudents];
          let newUnmarked = [...pSummary.unmarkedStudents.filter((s) => s._id !== studentId)];

          if (targetStatus === 'Present') {
            newAbsent = newAbsent.filter((s) => s._id !== studentId);
            if (!newPresent.some((s) => s._id === studentId)) {
              newPresent.push(stObj);
            }
          } else {
            newPresent = newPresent.filter((s) => s._id !== studentId);
            if (!newAbsent.some((s) => s._id === studentId)) {
              newAbsent.push(stObj);
            }
          }

          const total = newPresent.length + newAbsent.length;
          const rate = total > 0 ? (newPresent.length / total) * 100 : 0;

          return {
            ...pSummary,
            presentCount: newPresent.length,
            absentCount: newAbsent.length,
            unmarkedCount: newUnmarked.length,
            attendancePercentage: parseFloat(rate.toFixed(1)),
            presentStudents: newPresent,
            absentStudents: newAbsent,
            unmarkedStudents: newUnmarked,
          };
        }
        return pSummary;
      });

      return {
        ...prev,
        students: updatedStudents,
        periodSummaries: updatedSummaries,
      };
    });

    try {
      const res = await apiClient.post('/attendance/toggle-status', {
        sessionId,
        studentId,
        targetStatus,
        reason: `${userRole === 'admin' ? 'Admin' : 'Faculty'} modified status via Period Matrix`,
      });

      if (res.data.success) {
        setMessage({
          type: 'success',
          text: `Updated: ${res.data.student.name} marked ${targetStatus}.`,
        });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (err) {
      console.error('Toggle status error:', err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Error updating attendance.',
      });
      // Re-fetch to synchronize in case of error
      fetchMatrix();
    } finally {
      setTogglingStudentId(null);
    }
  };

  // 4. Download Excel Report
  const handleDownloadExcel = async () => {
    setDownloading(true);
    try {
      await downloadExcelReport({
        startDate: date,
        endDate: date,
        classroomId: selectedClassroomId,
        customFilename: `Class_${matrixData?.classroom?.classroomId || 'Summary'}_Periods_${date}.xlsx`,
      });
      setMessage({ type: 'success', text: 'Excel report downloaded with 7-period matrix!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Excel download failed.' });
    } finally {
      setDownloading(false);
    }
  };

  // Filter students based on search and status
  const filteredStudents = (matrixData?.students || []).filter((st) => {
    const matchesSearch =
      st.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.userId.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'has_absence') {
      return st.summary.totalAbsent > 0;
    }
    if (statusFilter === 'full_present') {
      return st.summary.totalAbsent === 0 && st.summary.totalPresent > 0;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Filter & Control Panel */}
      <div className="p-5 sm:p-6 rounded-3xl glass-panel space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-white font-outfit flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-400" />
                <span>Classroom Period-Wise Attendance Summary</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                PERIODS 1 - 7
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live period-by-period matrix • Click any student's period cell to immediately toggle Present / Absent
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={fetchMatrix}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
              title="Refresh attendance records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleDownloadExcel}
              disabled={downloading || !matrixData}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Exporting...' : 'Download Period Excel (.xlsx)'}</span>
            </button>
          </div>
        </div>

        {/* Classroom & Date Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {allowClassroomSwitch && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-400" /> Select Classroom (1 of 7)
              </label>
              <select
                value={selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl glass-input text-xs font-medium"
              >
                {classrooms.map((cr) => (
                  <option key={cr._id} value={cr._id}>
                    {cr.classroomId}: {cr.name} ({cr.department} • Room {cr.roomNumber})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-400" /> Attendance Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono"
            />
          </div>

          {/* Quick Stats Pill */}
          {matrixData && (
            <div className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs sm:col-span-2 lg:col-span-1">
              <div>
                <span className="text-slate-400 block text-[10px]">Total Enrolled:</span>
                <span className="font-bold text-white font-mono text-sm">
                  {matrixData.classroom?.totalStudents || 0} Students
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Room Number:</span>
                <span className="font-bold text-teal-300 font-mono text-xs">
                  Room {matrixData.classroom?.roomNumber} ({matrixData.classroom?.department})
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div
          className={`p-3.5 rounded-2xl text-xs flex items-center justify-between transition-all ${
            message.type === 'error'
              ? 'bg-rose-950/80 border border-rose-500/40 text-rose-200'
              : 'bg-teal-950/80 border border-teal-500/40 text-teal-200'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {message.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage({ type: '', text: '' })} className="font-bold text-xs opacity-80 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'matrix'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-md'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-transparent'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Full Period Matrix Table (P1 - P7)</span>
        </button>

        <button
          onClick={() => setActiveTab('period_breakdown')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'period_breakdown'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-md'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-transparent'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Period-by-Period Absent/Present Lists</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FULL PERIOD MATRIX TABLE (Students vs Periods 1-7 with 1-Click Toggle) */}
      {/* ========================================================================= */}
      {activeTab === 'matrix' && (
        <div className="p-5 sm:p-6 rounded-3xl glass-panel space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Filter by student name or roll number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-xl glass-input w-64"
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Filter:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg border text-[11px] ${
                  statusFilter === 'all'
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                All Students ({matrixData?.students?.length || 0})
              </button>
              <button
                onClick={() => setStatusFilter('has_absence')}
                className={`px-2.5 py-1 rounded-lg border text-[11px] ${
                  statusFilter === 'has_absence'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                Has Absences
              </button>
              <button
                onClick={() => setStatusFilter('full_present')}
                className={`px-2.5 py-1 rounded-lg border text-[11px] ${
                  statusFilter === 'full_present'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                100% Present
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-400" />
              <p>Loading 7-period classroom matrix...</p>
            </div>
          ) : !matrixData || matrixData.students?.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">
              No student records found for this classroom.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-800/80 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-300 font-bold uppercase text-[10px] border-b border-slate-800">
                    <th className="py-3.5 px-3 sticky left-0 bg-slate-900 z-10 w-44">Student Roll & Name</th>
                    {(matrixData.periods || []).map((p) => (
                      <th key={p._id} className="py-3 px-2 text-center min-w-[90px]">
                        <div className="font-bold text-white">Period {p.sessionNumber}</div>
                        <div className="text-[9px] text-slate-400 font-mono font-normal">{p.startTime}-{p.endTime}</div>
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center w-20">Present</th>
                    <th className="py-3 px-3 text-center w-20">Absent</th>
                    <th className="py-3 px-3 text-right w-24">Rate %</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {filteredStudents.map((st) => (
                    <tr key={st._id} className="hover:bg-slate-900/40 transition-colors">
                      {/* Student Info (Sticky on left scroll) */}
                      <td className="py-3 px-3 sticky left-0 bg-slate-950/90 backdrop-blur z-10 border-r border-slate-800/40">
                        <div className="font-mono text-xs font-bold text-teal-300">{st.userId}</div>
                        <div className="text-white font-semibold text-xs line-clamp-1">{st.name}</div>
                        <div className="text-[10px] text-slate-500">{st.department}</div>
                      </td>

                      {/* Periods 1 to 7 interactive toggle cells */}
                      {st.periods.map((p) => {
                        const isPresent = p.status === 'Present';
                        const isAbsent = p.status === 'Absent';
                        const isToggling = togglingStudentId === `${st._id}_${p.sessionId}`;

                        return (
                          <td key={p.sessionId} className="py-2.5 px-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(st._id, p.sessionId, p.status)}
                              disabled={isToggling}
                              title={`Click to toggle status (Currently: ${p.status})`}
                              className={`w-full py-1.5 px-2 rounded-xl text-xs font-bold transition-all transform active:scale-95 flex items-center justify-center gap-1 border ${
                                isPresent
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                                  : isAbsent
                                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                              }`}
                            >
                              {isToggling ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : isPresent ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                                  <span>P</span>
                                </>
                              ) : isAbsent ? (
                                <>
                                  <X className="w-3.5 h-3.5 text-rose-400 stroke-[3]" />
                                  <span>A</span>
                                </>
                              ) : (
                                <span>—</span>
                              )}
                            </button>
                            {p.checkInTime && isPresent && (
                              <div className="text-[8px] text-emerald-400 font-mono mt-0.5 opacity-80">
                                {new Date(p.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Summary Metrics */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400">
                        {st.summary.totalPresent}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-rose-400">
                        {st.summary.totalAbsent}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-lg text-xs ${
                            st.summary.percentage >= 75
                              ? 'text-emerald-300 bg-emerald-500/10'
                              : st.summary.percentage >= 50
                              ? 'text-amber-300 bg-amber-500/10'
                              : 'text-rose-300 bg-rose-500/10'
                          }`}
                        >
                          {st.summary.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Quick Legend & Help */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-300">Legend:</span>
              <div className="flex items-center gap-1 text-emerald-400 font-bold">
                <span className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px]">P</span>
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1 text-rose-400 font-bold">
                <span className="w-4 h-4 rounded bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-[10px]">A</span>
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <span className="w-4 h-4 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px]">—</span>
                <span>Unmarked / Scheduled</span>
              </div>
            </div>

            <div className="text-teal-400 font-mono">
              Tip: Click any cell to toggle Present / Absent instantly.
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PERIOD-BY-PERIOD SUMMARY CARDS (1st Period: Absent list, 2nd Period: ...) */}
      {/* ========================================================================= */}
      {activeTab === 'period_breakdown' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Period-by-Period Absentee & Present Rosters ({matrixData?.periodSummaries?.length || 0} Periods)
            </h3>
            <span className="text-xs text-teal-400 font-mono">Classroom: {matrixData?.classroom?.name}</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {(matrixData?.periodSummaries || []).map((summary) => {
              const isExpanded = expandedPeriod === summary.sessionNumber;

              return (
                <div
                  key={summary.sessionId}
                  className="rounded-3xl glass-panel border border-slate-800/80 overflow-hidden transition-all"
                >
                  {/* Period Header / Summary Card */}
                  <div
                    onClick={() => setExpandedPeriod(isExpanded ? null : summary.sessionNumber)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold text-sm font-mono">
                        P{summary.sessionNumber}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white font-outfit">
                            Period {summary.sessionNumber}: {summary.sessionName}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              summary.status === 'active'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                                : summary.status === 'completed'
                                ? 'bg-slate-800 text-slate-300'
                                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            }`}
                          >
                            {summary.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          {summary.startTime} - {summary.endTime} • {summary.subjectName}
                        </p>
                      </div>
                    </div>

                    {/* Stats & Toggle Chevron */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3 text-xs font-mono">
                        <div className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                          {summary.presentCount} Present
                        </div>
                        <div className="px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold">
                          {summary.absentCount} Absent
                        </div>
                        <div className="text-slate-400 text-[11px] hidden sm:block">
                          {summary.attendancePercentage}% Rate
                        </div>
                      </div>

                      <div className="p-1 rounded-lg bg-slate-900 text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Lists of Absent and Present Students */}
                  {isExpanded && (
                    <div className="p-5 border-t border-slate-800/80 bg-slate-950/40 space-y-6">
                      {/* 1. ABSENT STUDENTS LIST */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-rose-300 uppercase tracking-wider">
                            <UserX className="w-4 h-4 text-rose-400" />
                            <span>Absent Students in Period {summary.sessionNumber} ({summary.absentStudents.length})</span>
                          </div>
                          <span className="text-[11px] text-slate-400">Click button to switch to Present</span>
                        </div>

                        {summary.absentStudents.length === 0 ? (
                          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 text-center font-medium">
                            🎉 Excellent! No students were recorded absent during Period {summary.sessionNumber}.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {summary.absentStudents.map((st) => (
                              <div
                                key={st._id}
                                className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between gap-2"
                              >
                                <div>
                                  <div className="font-semibold text-xs text-white">{st.name}</div>
                                  <div className="font-mono text-[10px] text-rose-300">{st.userId}</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(st._id, summary.sessionId, 'Absent')}
                                  className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold transition-all"
                                >
                                  Mark Present
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 2. PRESENT STUDENTS LIST */}
                      <div className="space-y-2 pt-3 border-t border-slate-800/60">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-300 uppercase tracking-wider">
                            <UserCheck className="w-4 h-4 text-emerald-400" />
                            <span>Present Students in Period {summary.sessionNumber} ({summary.presentStudents.length})</span>
                          </div>
                        </div>

                        {summary.presentStudents.length === 0 ? (
                          <div className="p-4 rounded-2xl bg-slate-900/60 text-xs text-slate-500 text-center">
                            No students marked present yet for this period.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {summary.presentStudents.map((st) => (
                              <div
                                key={st._id}
                                className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between gap-2"
                              >
                                <div>
                                  <div className="font-semibold text-xs text-white">{st.name}</div>
                                  <div className="font-mono text-[10px] text-emerald-400">{st.userId}</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(st._id, summary.sessionId, 'Present')}
                                  className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[10px] font-bold transition-all"
                                >
                                  Mark Absent
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomPeriodMatrix;
