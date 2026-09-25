import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Modal from '../../components/common/Modal';
import {
  FileEdit,
  Calendar,
  Building2,
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Save,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

export const AttendanceEditor = () => {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Correction Modal State
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [activeItem, setActiveItem] = useState(null);
  const [newStatus, setNewStatus] = useState('Present');
  const [correctionReason, setCorrectionReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // 1. Fetch Classrooms
  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const res = await apiClient.get('/classrooms');
        if (res.data.success && res.data.classrooms.length > 0) {
          setClassrooms(res.data.classrooms);
          setSelectedClassroomId(res.data.classrooms[0]._id);
        }
      } catch (err) {
        console.error('Fetch classrooms error:', err);
      }
    };
    fetchClassrooms();
  }, []);

  // 2. Fetch Sessions for selected Date & Classroom
  useEffect(() => {
    const fetchSessions = async () => {
      if (!selectedClassroomId) return;
      try {
        const res = await apiClient.get(`/sessions?date=${date}&classroomId=${selectedClassroomId}`);
        if (res.data.success) {
          setSessions(res.data.sessions);
          if (res.data.sessions.length > 0) {
            setSelectedSessionId(res.data.sessions[0]._id);
          } else {
            setSelectedSessionId('');
            setStudentsList([]);
          }
        }
      } catch (err) {
        console.error('Fetch sessions error:', err);
      }
    };
    fetchSessions();
  }, [date, selectedClassroomId]);

  // 3. Fetch Session Attendance Records
  const fetchSessionRecords = async () => {
    if (!selectedSessionId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/sessions/${selectedSessionId}`);
      if (res.data.success) {
        setStudentsList(res.data.students || []);
      }
    } catch (err) {
      console.error('Fetch records error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionRecords();
  }, [selectedSessionId]);

  const handleOpenCorrection = (item) => {
    setActiveItem(item);
    setNewStatus(item.status === 'Present' ? 'Absent' : 'Present');
    setCorrectionReason('');
    setIsCorrectionModalOpen(true);
  };

  const handleSaveCorrection = async (e) => {
    e.preventDefault();
    if (!activeItem || !activeItem.recordId) {
      setMessage('Error: Attendance record must exist before correcting. Please verify or start session.');
      return;
    }
    if (!correctionReason.trim()) {
      setMessage('Correction reason is mandatory for audit trail compliance.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const res = await apiClient.put(`/attendance/correct/${activeItem.recordId}`, {
        updatedStatus: newStatus,
        correctionReason: correctionReason.trim(),
      });

      if (res.data.success) {
        setMessage(res.data.message);
        setIsCorrectionModalOpen(false);
        fetchSessionRecords();
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error updating attendance.');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = studentsList.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.student.name.toLowerCase().includes(term) ||
      item.student.userId.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header with Selector Controls */}
      <div className="p-5 rounded-2xl glass-panel space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
                Attendance Master Editor
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                ADMIN OVERRIDE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Authorized manual modification of Present / Absent records with tamper-proof audit logging
            </p>
          </div>
        </div>

        {/* 3-Column Filter Controls (Classroom, Date, Session) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Select Classroom (1 of 7)
            </label>
            <select
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs"
            >
              {classrooms.map((cr) => (
                <option key={cr._id} value={cr._id}>
                  {cr.classroomId}: {cr.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Attendance Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Select Session (Period 1-7)
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input text-xs"
              disabled={sessions.length === 0}
            >
              {sessions.length === 0 ? (
                <option value="">No sessions scheduled</option>
              ) : (
                sessions.map((s) => (
                  <option key={s._id} value={s._id}>
                    Period {s.sessionNumber}: {s.sessionName} ({s.startTime}-{s.endTime})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-teal-950/80 border border-teal-500/30 text-xs text-teal-200 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-teal-400 font-bold">Dismiss</button>
        </div>
      )}

      {/* Student Records Table */}
      <div className="p-5 rounded-3xl glass-panel space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <FileEdit className="w-4 h-4 text-teal-400" />
            <span>Eligible Student Roster ({filteredStudents.length})</span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-xl glass-input text-xs w-64"
            />
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No scheduled session found for this classroom on {date}.
          </div>
        ) : loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading attendance records...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-3">Student ID</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Verification Method</th>
                  <th className="py-3 px-3">Check-in Timestamp</th>
                  <th className="py-3 px-3">Correction History</th>
                  <th className="py-3 px-3 text-right">Modify Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredStudents.map((item) => {
                  const s = item.student;
                  const isPresent = item.status === 'Present';
                  const isAbsent = item.status === 'Absent';

                  return (
                    <tr key={s._id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-teal-300">{s.userId}</td>
                      <td className="py-3 px-3 font-semibold text-white">{s.name}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPresent
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : isAbsent
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{item.verificationMethod}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {item.checkInTime ? new Date(item.checkInTime).toLocaleTimeString() : '—'}
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {item.isCorrected ? (
                          <span className="text-amber-300 text-[11px] font-mono">
                            Reason: {item.correctionReason}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Original Record</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleOpenCorrection(item)}
                          disabled={!item.recordId}
                          className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Edit Status
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Correction Modal */}
      <Modal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        title="Administrative Attendance Correction"
        subtitle={`Student: ${activeItem?.student?.name} (${activeItem?.student?.userId})`}
      >
        <form onSubmit={handleSaveCorrection} className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>AUDIT LOGGING ACTIVE</span>
            </div>
            <p className="text-[11px] opacity-90 leading-relaxed">
              Every status change is permanently timestamped with your Administrator ID and reason.
            </p>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">New Attendance Status</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNewStatus('Present')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  newStatus === 'Present'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" /> Mark Present
              </button>

              <button
                type="button"
                onClick={() => setNewStatus('Absent')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  newStatus === 'Absent'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                <XCircle className="w-4 h-4" /> Mark Absent
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Correction Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="e.g., Medical leave approved by HOD, camera lighting issue during period 2, or official duty pass..."
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl glass-input"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCorrectionModalOpen(false)}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !correctionReason.trim()}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {saving ? 'Logging Correction...' : 'Save & Update Audit Log'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AttendanceEditor;
