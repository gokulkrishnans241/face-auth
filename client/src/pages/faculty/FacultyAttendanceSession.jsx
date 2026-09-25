import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import LiveAttendanceScanner from '../../components/face/LiveAttendanceScanner';
import ClassroomPeriodMatrix from '../../components/attendance/ClassroomPeriodMatrix';
import { downloadExcelReport } from '../../utils/exportUtils';
import {
  ScanFace,
  ArrowLeft,
  CheckCircle,
  Clock,
  Building2,
  Users,
  BookOpen,
  Play,
  Download,
  AlertTriangle,
  Sparkles,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import { format } from 'date-fns';

export const FacultyAttendanceSession = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionIdParam = searchParams.get('sessionId');

  const [classrooms, setClassrooms] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [downloading, setDownloading] = useState(false);

  // Tab state: 'launcher' | 'matrix'
  const [currentView, setCurrentView] = useState('launcher'); // 'launcher' | 'matrix'

  // Quick Session Creator State (Room Number -> Subject -> Timings)
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [subjectName, setSubjectName] = useState('Computer Science Lecture');
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [attendanceDeadline, setAttendanceDeadline] = useState('09:20');
  const [launching, setLaunching] = useState(false);

  const standardPeriods = [
    { num: 1, name: 'Period 1', start: '09:00', end: '10:00', dead: '09:20' },
    { num: 2, name: 'Period 2', start: '10:00', end: '11:00', dead: '10:20' },
    { num: 3, name: 'Period 3', start: '11:15', end: '12:15', dead: '11:35' },
    { num: 4, name: 'Period 4', start: '12:15', end: '13:15', dead: '12:35' },
    { num: 5, name: 'Period 5', start: '14:00', end: '15:00', dead: '14:20' },
    { num: 6, name: 'Period 6', start: '15:00', end: '16:00', dead: '15:20' },
    { num: 7, name: 'Period 7', start: '16:00', end: '17:00', dead: '16:20' },
  ];

  // Fetch Classrooms on mount
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

  // If sessionIdParam passed, load that active session directly
  useEffect(() => {
    if (sessionIdParam) {
      loadSessionById(sessionIdParam);
    }
  }, [sessionIdParam]);

  const loadSessionById = async (id) => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/sessions/${id}`);
      if (res.data.success) {
        setActiveSession(res.data.session);
        setStudentsList(res.data.students || []);
      }
    } catch (err) {
      console.error('Load session error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (num) => {
    const p = standardPeriods.find((x) => x.num === num);
    if (p) {
      setSelectedPeriod(p.num);
      setStartTime(p.start);
      setEndTime(p.end);
      setAttendanceDeadline(p.dead);
    }
  };

  // Launch New Live Attendance Session (Room Number -> Subject -> Timings)
  const handleLaunchSession = async (e) => {
    e.preventDefault();
    if (!selectedClassroomId) {
      setMessage('Please select a classroom.');
      return;
    }

    setLaunching(true);
    setMessage('');
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const targetClassroom = classrooms.find((c) => c._id === selectedClassroomId);

      let session;
      const existingRes = await apiClient.get(`/sessions?date=${today}&classroomId=${selectedClassroomId}`);
      const match = existingRes.data.sessions?.find((s) => s.sessionNumber === selectedPeriod);

      if (match) {
        const startRes = await apiClient.post(`/sessions/${match._id}/start`);
        session = startRes.data.session;
      } else {
        await apiClient.post('/sessions/generate-daily', {
          date: today,
          classroomId: selectedClassroomId,
          sessionCount: 7,
        });
        const freshRes = await apiClient.get(`/sessions?date=${today}&classroomId=${selectedClassroomId}`);
        const freshMatch = freshRes.data.sessions?.find((s) => s.sessionNumber === selectedPeriod);
        if (freshMatch) {
          const startRes = await apiClient.post(`/sessions/${freshMatch._id}/start`);
          session = startRes.data.session;
        }
      }

      if (session) {
        await loadSessionById(session._id);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error launching session.');
    } finally {
      setLaunching(false);
    }
  };

  const handleSessionClosed = async () => {
    if (!activeSession) return;
    if (!window.confirm('End attendance scanning? All remaining unmarked students will be finalized as ABSENT.')) {
      return;
    }

    try {
      const res = await apiClient.post(`/sessions/${activeSession._id}/close`);
      if (res.data.success) {
        setMessage(`Attendance finalized. ${res.data.stats?.absentCount || 0} students recorded Absent.`);
        loadSessionById(activeSession._id);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error finalizing session.');
    }
  };

  const handleDownloadExcel = async () => {
    if (!activeSession) return;
    setDownloading(true);
    try {
      await downloadExcelReport({
        startDate: activeSession.date,
        endDate: activeSession.date,
        classroomId: activeSession.classroomId?._id || activeSession.classroomId,
        sessionId: activeSession._id,
        customFilename: `Session_${activeSession.sessionNumber}_Attendance_${activeSession.date}.xlsx`,
      });
      setMessage('Excel workbook downloaded successfully.');
    } catch (err) {
      setMessage(err.message || 'Error downloading Excel report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Bar */}
      <div className="p-4 sm:p-5 rounded-3xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (activeSession) setActiveSession(null);
              else navigate('/faculty');
            }}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-white font-outfit">
                Faculty Live Attendance Station
              </h1>
              {activeSession && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                  CAMERA SCANNING ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Biometric face recognition station & full period-by-period attendance management
            </p>
          </div>
        </div>

        {/* View Switcher / Excel Downloader */}
        <div className="flex items-center gap-2">
          {!activeSession && (
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setCurrentView('launcher')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  currentView === 'launcher'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Scan Launcher
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('matrix')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                  currentView === 'matrix'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Period Matrix & Editor</span>
              </button>
            </div>
          )}

          {activeSession && (
            <button
              onClick={handleDownloadExcel}
              disabled={downloading}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-teal-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloading ? 'Downloading...' : 'Download Session Excel'}</span>
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-2xl bg-teal-950/80 border border-teal-500/30 text-xs text-teal-200 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-teal-400 font-bold">Dismiss</button>
        </div>
      )}

      {/* View 1: Session Launcher (Room -> Subject -> Timings) */}
      {!activeSession && currentView === 'launcher' && (
        <div className="max-w-2xl mx-auto p-6 sm:p-8 rounded-3xl glass-panel space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>Configure & Launch Attendance Scan</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select your classroom, subject, and time period to open the live facial recognition camera
            </p>
          </div>

          <form onSubmit={handleLaunchSession} className="space-y-4 text-xs">
            {/* 1. Classroom Selection (1 of 7) */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-teal-400" />
                <span>1. Select Room Number (1 of 7 Classrooms)</span>
              </label>
              <select
                value={selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-medium"
                required
              >
                {classrooms.map((cr) => (
                  <option key={cr._id} value={cr._id}>
                    {cr.classroomId}: {cr.name} ({cr.department} • {cr.capacity} Capacity)
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Subject Name */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-teal-400" />
                <span>2. Subject / Lecture Name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Distributed Systems, AI Lab, Compiler Design..."
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                required
              />
            </div>

            {/* 3. Timings / Period Selection */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                <span>3. Timetable Period & Class Timings</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {standardPeriods.map((p) => (
                  <button
                    key={p.num}
                    type="button"
                    onClick={() => handlePeriodChange(p.num)}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      selectedPeriod === p.num
                        ? 'bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-md font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold font-mono">Period {p.num}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.start}-{p.end}</div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1">Start Time:</span>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1">End Time:</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400 mb-1">Deadline:</span>
                  <input
                    type="time"
                    value={attendanceDeadline}
                    onChange={(e) => setAttendanceDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl glass-input text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={launching}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-extrabold text-sm shadow-xl shadow-teal-500/20 flex items-center justify-center gap-2 transition-all mt-4"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{launching ? 'Initializing Optical Camera...' : 'Launch Live Attendance Scanner'}</span>
            </button>
          </form>
        </div>
      )}

      {/* View 2: Period-by-Period Classroom Matrix & Manual Attendance Editor */}
      {!activeSession && currentView === 'matrix' && (
        <ClassroomPeriodMatrix
          initialClassroomId={selectedClassroomId}
          allowClassroomSwitch={true}
          userRole="faculty"
        />
      )}

      {/* View 3: Live Camera Viewfinder & Attendance Scanner */}
      {activeSession && (
        <LiveAttendanceScanner
          session={activeSession}
          classroom={activeSession.classroomId}
          studentsList={studentsList}
          onAttendanceUpdated={() => loadSessionById(activeSession._id)}
          onSessionClosed={activeSession.status === 'active' ? handleSessionClosed : null}
        />
      )}
    </div>
  );
};

export default FacultyAttendanceSession;
