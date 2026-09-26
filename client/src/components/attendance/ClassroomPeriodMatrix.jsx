import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Modal from '../common/Modal';
import { downloadExcelReport, downloadXmlReport } from '../../utils/exportUtils';
import {
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  FileCode,
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
  Eye,
  BookOpen,
  User,
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

  // Period filter button: 'all' (all 7 periods matrix) or 1, 2, 3, 4, 5, 6, 7
  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState('all');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'has_absence' | 'full_present'
  const [message, setMessage] = useState({ type: '', text: '' });
  const [togglingStudentId, setTogglingStudentId] = useState(null);

  // Student Details Modal state (shows how many sessions attended and absent in a day)
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);

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
        if (selectedStudentForModal) {
          const freshSt = res.data.students.find((s) => s._id === selectedStudentForModal._id);
          if (freshSt) setSelectedStudentForModal(freshSt);
        }
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
              return {
                ...p,
                status: targetStatus,
                checkInTime: targetStatus === 'Present' ? new Date().toISOString() : null,
              };
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

          const updatedSt = {
            ...st,
            periods: updatedPeriods,
            summary: {
              ...st.summary,
              totalPresent: pCount,
              totalAbsent: aCount,
              percentage: parseFloat(percentage.toFixed(1)),
            },
          };

          if (selectedStudentForModal && selectedStudentForModal._id === studentId) {
            setSelectedStudentForModal(updatedSt);
          }

          return updatedSt;
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
      fetchMatrix();
    } finally {
      setTogglingStudentId(null);
    }
  };

  // 4. Download Excel Report (.xlsx)
  const handleDownloadExcel = async () => {
    setDownloading(true);
    try {
      await downloadExcelReport({
        startDate: date,
        endDate: date,
        classroomId: selectedClassroomId,
        customFilename: `Class_${matrixData?.classroom?.classroomId || 'Summary'}_Periods_${date}.xlsx`,
      });
      setMessage({ type: 'success', text: 'Excel report (.xlsx) downloaded successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Excel download failed.' });
    } finally {
      setDownloading(false);
    }
  };

  // 5. Download XML Spreadsheet (.xml)
  const handleDownloadXml = () => {
    if (!matrixData) return;
    try {
      downloadXmlReport({
        matrixData,
        date,
        customFilename: `Class_${matrixData?.classroom?.classroomId || 'Summary'}_Periods_${date}.xml`,
      });
      setMessage({ type: 'success', text: 'XML Spreadsheet (.xml) downloaded successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      setMessage({ type: 'error', text: 'XML download failed.' });
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

  // Selected period summary object when single period is selected
  const activePeriodSummary =
    selectedPeriodFilter !== 'all'
      ? (matrixData?.periodSummaries || []).find((ps) => ps.sessionNumber === Number(selectedPeriodFilter))
      : null;

  return (
    <div className="space-y-6">
      {/* 1. CLASS BUTTONS (Class 1, Class 2, ... Class 7) */}
      {allowClassroomSwitch && classrooms.length > 0 && (
        <div className="p-4 rounded-3xl glass-panel space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-teal-400">
              <Building2 className="w-4 h-4" /> Select Classroom (1-Click Switch):
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {classrooms.length} Classrooms Available
            </span>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1">
            {classrooms.map((cr, idx) => {
              const isSelected = selectedClassroomId === cr._id;
              return (
                <button
                  key={cr._id}
                  onClick={() => setSelectedClassroomId(cr._id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
                    isSelected
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 border-teal-300 shadow-lg shadow-teal-500/25 scale-[1.02]'
                      : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <span className="font-extrabold text-sm">Class {idx + 1}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-lg ${
                      isSelected
                        ? 'bg-slate-950/40 text-slate-950 font-bold'
                        : 'bg-slate-800 text-teal-300'
                    }`}
                  >
                    {cr.classroomId}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. TOP FILTER & CONTROL PANEL */}
      <div className="p-5 sm:p-6 rounded-3xl glass-panel space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-extrabold text-white font-outfit flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-400" />
                <span>
                  {matrixData?.classroom
                    ? `${matrixData.classroom.name} (${matrixData.classroom.classroomId})`
                    : 'Classroom Attendance Summary'}
                </span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                PERIODS 1 - 7
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any period button to view present/absent rosters, or view full matrix to see day session totals.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchMatrix}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
              title="Refresh attendance records"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Download XML Sheet */}
            <button
              onClick={handleDownloadXml}
              disabled={!matrixData}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              title="Download Microsoft XML Spreadsheet format"
            >
              <FileCode className="w-4 h-4 text-teal-400" />
              <span>Download XML</span>
            </button>

            {/* Download Excel (.xlsx) */}
            <button
              onClick={handleDownloadExcel}
              disabled={downloading || !matrixData}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
              title="Download Excel OpenXML workbook"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? 'Exporting...' : 'Download Excel (.xlsx)'}</span>
            </button>
          </div>
        </div>

        {/* Date & Classroom Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
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

          {matrixData && (
            <>
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Academic Department:</span>
                  <span className="font-bold text-white text-xs truncate block max-w-[180px]">
                    {matrixData.classroom?.department}
                  </span>
                </div>
                <div className="text-right font-mono">
                  <span className="text-slate-400 block text-[10px]">Room Number:</span>
                  <span className="font-bold text-teal-300 text-xs">
                    Room {matrixData.classroom?.roomNumber}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Enrolled Students:</span>
                  <span className="font-bold text-white font-mono text-sm">
                    {matrixData.classroom?.totalStudents || 0} Students
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Configured Sessions:</span>
                  <span className="font-bold text-emerald-400 font-mono text-xs">
                    7 Periods (P1 - P7)
                  </span>
                </div>
              </div>
            </>
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
          <button
            onClick={() => setMessage({ type: '', text: '' })}
            className="font-bold text-xs opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. PERIOD BUTTONS BAR (All 7 Periods Matrix, Period 1, Period 2, ... Period 7) */}
      <div className="p-3.5 rounded-3xl glass-panel space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-teal-400">
            <Clock className="w-4 h-4" /> Period View Filter (Click to View Present & Absent):
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {selectedPeriodFilter === 'all'
              ? 'Showing All 7 Periods Matrix'
              : `Showing Period ${selectedPeriodFilter} Roster`}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {/* Button: All 7 Periods Matrix */}
          <button
            onClick={() => setSelectedPeriodFilter('all')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
              selectedPeriodFilter === 'all'
                ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20'
                : 'bg-slate-900/80 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>All 7 Periods Matrix</span>
          </button>

          {/* Buttons: Period 1, Period 2, ... Period 7 */}
          {[1, 2, 3, 4, 5, 6, 7].map((pNum) => {
            const isSelected = selectedPeriodFilter === pNum;
            const pSummary = (matrixData?.periodSummaries || []).find((s) => s.sessionNumber === pNum);

            return (
              <button
                key={pNum}
                onClick={() => setSelectedPeriodFilter(pNum)}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20'
                    : 'bg-slate-900/80 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>Period {pNum}</span>
                {pSummary && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                      isSelected
                        ? 'bg-slate-950/40 text-slate-950 font-bold'
                        : pSummary.absentCount > 0
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {pSummary.presentCount}P / {pSummary.absentCount}A
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW A: ALL 7 PERIODS MATRIX (When selectedPeriodFilter === 'all') */}
      {/* ========================================================================= */}
      {selectedPeriodFilter === 'all' && (
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

            <div className="flex items-center gap-2 text-xs flex-wrap">
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
                    <th className="py-3.5 px-3 sticky left-0 bg-slate-900 z-10 w-48">
                      Student Roll & Name
                    </th>
                    {(matrixData.periods || []).map((p) => (
                      <th key={p._id} className="py-3 px-2 text-center min-w-[85px]">
                        <div className="font-bold text-white">Period {p.sessionNumber}</div>
                        <div className="text-[9px] text-slate-400 font-mono font-normal">
                          {p.startTime}-{p.endTime}
                        </div>
                      </th>
                    ))}
                    <th className="py-3 px-2 text-center w-20">Attended</th>
                    <th className="py-3 px-2 text-center w-20">Missed</th>
                    <th className="py-3 px-2 text-right w-20">Rate %</th>
                    <th className="py-3 px-3 text-center w-24">Day Details</th>
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
                                {new Date(p.checkInTime).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            )}
                          </td>
                        );
                      })}

                      {/* Summary Metrics: Attended and Missed in a day */}
                      <td className="py-3 px-2 text-center font-mono font-bold text-emerald-400">
                        {st.summary.totalPresent}
                      </td>
                      <td className="py-3 px-2 text-center font-mono font-bold text-rose-400">
                        {st.summary.totalAbsent}
                      </td>
                      <td className="py-3 px-2 text-right font-mono font-bold">
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

                      {/* Day Details Button */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentForModal(st)}
                          className="px-2.5 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[11px] font-bold flex items-center justify-center gap-1 transition-all mx-auto shadow-sm"
                          title="View day attendance breakdown for this student"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Quick Legend & Help */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-semibold text-slate-300">Legend:</span>
              <div className="flex items-center gap-1 text-emerald-400 font-bold">
                <span className="w-4 h-4 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px]">
                  P
                </span>
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1 text-rose-400 font-bold">
                <span className="w-4 h-4 rounded bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-[10px]">
                  A
                </span>
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                <span className="w-4 h-4 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px]">
                  —
                </span>
                <span>Unmarked</span>
              </div>
            </div>

            <div className="text-teal-400 font-mono">
              Click any P/A box to toggle status • Click "Details" to view student day breakdown
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW B: SINGLE PERIOD VIEW (When selectedPeriodFilter !== 'all') */}
      {/* ========================================================================= */}
      {selectedPeriodFilter !== 'all' && activePeriodSummary && (
        <div className="space-y-5">
          {/* Period Header Summary Card */}
          <div className="p-5 sm:p-6 rounded-3xl glass-panel space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center font-bold text-lg font-mono">
                  P{activePeriodSummary.sessionNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-white font-outfit">
                      Period {activePeriodSummary.sessionNumber}: {activePeriodSummary.sessionName}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        activePeriodSummary.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                          : activePeriodSummary.status === 'completed'
                          ? 'bg-slate-800 text-slate-300'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {activePeriodSummary.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {activePeriodSummary.startTime} - {activePeriodSummary.endTime} • Subject: {activePeriodSummary.subjectName}
                  </p>
                </div>
              </div>

              {/* Stats badges */}
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase block">Present</span>
                  <span className="text-base font-extrabold text-emerald-300 font-mono">
                    {activePeriodSummary.presentCount}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-center">
                  <span className="text-[10px] font-bold text-rose-400 uppercase block">Absent</span>
                  <span className="text-base font-extrabold text-rose-300 font-mono">
                    {activePeriodSummary.absentCount}
                  </span>
                </div>
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Rate</span>
                  <span className="text-base font-extrabold text-teal-300 font-mono">
                    {activePeriodSummary.attendancePercentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Side by Side or Stacked: Absent List and Present List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 1. ABSENT STUDENTS CARD */}
            <div className="p-5 sm:p-6 rounded-3xl glass-panel space-y-4 border border-rose-500/30">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <UserX className="w-5 h-5 text-rose-400" />
                  <h4 className="text-sm font-bold text-rose-300 uppercase tracking-wider">
                    Absent Students ({activePeriodSummary.absentStudents.length})
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">Click button to mark Present</span>
              </div>

              {activePeriodSummary.absentStudents.length === 0 ? (
                <div className="p-8 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-center space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p className="text-xs font-bold text-emerald-300">No Absentees in Period {activePeriodSummary.sessionNumber}</p>
                  <p className="text-[11px] text-slate-400">All scheduled students are marked present.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {activePeriodSummary.absentStudents.map((st) => (
                    <div
                      key={st._id}
                      className="p-3 rounded-2xl bg-rose-950/30 border border-rose-500/20 flex items-center justify-between gap-3 hover:bg-rose-950/40 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-white truncate">{st.name}</div>
                        <div className="font-mono text-[10px] text-rose-300">{st.userId}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const fullSt = matrixData.students.find((s) => s._id === st._id);
                            if (fullSt) setSelectedStudentForModal(fullSt);
                          }}
                          className="p-1.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white text-xs border border-slate-800"
                          title="View day details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(st._id, activePeriodSummary.sessionId, 'Absent')}
                          disabled={togglingStudentId === `${st._id}_${activePeriodSummary.sessionId}`}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Mark Present</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. PRESENT STUDENTS CARD */}
            <div className="p-5 sm:p-6 rounded-3xl glass-panel space-y-4 border border-emerald-500/30">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-sm font-bold text-emerald-300 uppercase tracking-wider">
                    Present Students ({activePeriodSummary.presentStudents.length})
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">Click button to mark Absent</span>
              </div>

              {activePeriodSummary.presentStudents.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-1">
                  <Clock className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-xs font-bold text-slate-400">No Check-ins Yet</p>
                  <p className="text-[11px] text-slate-500">No students recorded present for this session.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                  {activePeriodSummary.presentStudents.map((st) => (
                    <div
                      key={st._id}
                      className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between gap-3 hover:bg-emerald-950/30 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-white truncate">{st.name}</div>
                        <div className="font-mono text-[10px] text-emerald-400">{st.userId}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const fullSt = matrixData.students.find((s) => s._id === st._id);
                            if (fullSt) setSelectedStudentForModal(fullSt);
                          }}
                          className="p-1.5 rounded-xl bg-slate-900 text-slate-300 hover:text-white text-xs border border-slate-800"
                          title="View day details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(st._id, activePeriodSummary.sessionId, 'Present')}
                          disabled={togglingStudentId === `${st._id}_${activePeriodSummary.sessionId}`}
                          className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Mark Absent</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. STUDENT DAY ATTENDANCE DETAILS MODAL */}
      {/* ========================================================================= */}
      {selectedStudentForModal && (
        <Modal
          isOpen={!!selectedStudentForModal}
          onClose={() => setSelectedStudentForModal(null)}
          title={`Day Attendance Details • ${selectedStudentForModal.name}`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Student Header Card */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 font-bold text-lg font-mono">
                  {selectedStudentForModal.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white font-outfit">
                    {selectedStudentForModal.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mt-0.5">
                    <span className="text-teal-400 font-bold">{selectedStudentForModal.userId}</span>
                    <span>•</span>
                    <span>{selectedStudentForModal.department || matrixData?.classroom?.department}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{selectedStudentForModal.email}</div>
                </div>
              </div>

              <div className="text-right text-xs">
                <span className="text-slate-400 block text-[10px]">Date:</span>
                <span className="font-bold text-white font-mono">{date}</span>
              </div>
            </div>

            {/* Day Summary Metrics: Attended vs Missed */}
            <div className="grid grid-cols-3 gap-3">
              {/* Total Present in Day */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-center">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  Attended Today
                </span>
                <div className="text-xl font-extrabold text-emerald-300 font-mono mt-1">
                  {selectedStudentForModal.summary.totalPresent}
                </div>
                <span className="text-[10px] text-emerald-400/80">Sessions Present</span>
              </div>

              {/* Total Absent in Day */}
              <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-center">
                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                  Missed Today
                </span>
                <div className="text-xl font-extrabold text-rose-300 font-mono mt-1">
                  {selectedStudentForModal.summary.totalAbsent}
                </div>
                <span className="text-[10px] text-rose-400/80">Sessions Absent</span>
              </div>

              {/* Attendance Rate */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">
                  Day Rate
                </span>
                <div className="text-xl font-extrabold text-teal-300 font-mono mt-1">
                  {selectedStudentForModal.summary.percentage}%
                </div>
                <span className="text-[10px] text-slate-400">Total Day Score</span>
              </div>
            </div>

            {/* Period by Period Breakdown for Today */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-teal-400" /> All 7 Periods Breakdown for Today
              </h4>

              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {selectedStudentForModal.periods.map((p) => {
                  const isPresent = p.status === 'Present';
                  const isAbsent = p.status === 'Absent';
                  const isToggling = togglingStudentId === `${selectedStudentForModal._id}_${p.sessionId}`;

                  return (
                    <div
                      key={p.sessionId}
                      className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800/80 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 flex items-center justify-center font-bold text-xs font-mono shrink-0">
                          P{p.sessionNumber}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-white truncate">
                            Period {p.sessionNumber}: {p.sessionName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {p.startTime} - {p.endTime} • {p.subjectName}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1 ${
                              isPresent
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : isAbsent
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isPresent ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span>Present</span>
                              </>
                            ) : isAbsent ? (
                              <>
                                <X className="w-3 h-3 text-rose-400" />
                                <span>Absent</span>
                              </>
                            ) : (
                              <span>Unmarked</span>
                            )}
                          </span>
                          {p.checkInTime && isPresent && (
                            <div className="text-[9px] text-emerald-400/80 font-mono mt-0.5">
                              {new Date(p.checkInTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          )}
                        </div>

                        {/* Quick Toggle Action Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(selectedStudentForModal._id, p.sessionId, p.status)}
                          disabled={isToggling}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            isPresent
                              ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30'
                              : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {isToggling ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : isPresent ? (
                            'Switch to Absent'
                          ) : (
                            'Switch to Present'
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedStudentForModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ClassroomPeriodMatrix;
