import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../../api/client';
import LiveAttendanceScanner from '../../components/face/LiveAttendanceScanner';
import {
  ScanFace,
  ArrowLeft,
  CheckCircle,
  Clock,
  Building2,
  Users,
  AlertTriangle,
} from 'lucide-react';

export const FacultyAttendanceSession = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionIdParam = searchParams.get('sessionId');

  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(sessionIdParam || '');
  const [sessionData, setSessionData] = useState(null);
  const [classroomData, setClassroomData] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Fetch all active/today's sessions for faculty
  useEffect(() => {
    const fetchFacultySessions = async () => {
      try {
        const res = await apiClient.get('/sessions');
        if (res.data.success) {
          setActiveSessions(res.data.sessions);
          if (!selectedSessionId && res.data.sessions.length > 0) {
            const active = res.data.sessions.find((s) => s.status === 'active') || res.data.sessions[0];
            setSelectedSessionId(active._id);
          }
        }
      } catch (err) {
        console.error('Fetch sessions error:', err);
      }
    };
    fetchFacultySessions();
  }, []);

  // Fetch session details and assigned students
  const fetchSessionDetails = async () => {
    if (!selectedSessionId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/sessions/${selectedSessionId}`);
      if (res.data.success) {
        setSessionData(res.data.session);
        setClassroomData(res.data.session.classroomId);
        setStudentsList(res.data.students || []);
      }
    } catch (err) {
      console.error('Fetch session details error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionDetails();
  }, [selectedSessionId]);

  const handleSessionClosed = async () => {
    if (!selectedSessionId) return;
    if (!window.confirm('Are you sure you want to end this session? Remaining unmarked students will be finalized as ABSENT.')) {
      return;
    }

    try {
      const res = await apiClient.post(`/sessions/${selectedSessionId}/close`);
      if (res.data.success) {
        setMessage(`Session finalized. ${res.data.stats?.absentCount || 0} students recorded Absent.`);
        fetchSessionDetails();
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error finalizing session.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Session Switcher */}
      <div className="p-4 sm:p-5 rounded-2xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/faculty')}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-white font-outfit">Live Face Attendance Scanner</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Facial descriptor recognition with optical live-feed verification
            </p>
          </div>
        </div>

        {/* Session Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">Active Period:</span>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="px-3 py-1.5 rounded-xl glass-input text-xs"
          >
            {activeSessions.map((s) => (
              <option key={s._id} value={s._id}>
                Period {s.sessionNumber}: {s.sessionName} ({s.classroomId?.classroomId})
              </option>
            ))}
          </select>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-teal-950/80 border border-teal-500/30 text-xs text-teal-200 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-teal-400 font-bold">Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center rounded-3xl glass-panel text-xs text-slate-400">
          Loading classroom optical recognition system...
        </div>
      ) : !sessionData ? (
        <div className="p-12 text-center rounded-3xl glass-panel text-xs text-slate-500">
          No session selected. Please select an active session from the top dropdown.
        </div>
      ) : (
        <LiveAttendanceScanner
          session={sessionData}
          classroom={classroomData}
          studentsList={studentsList}
          onAttendanceUpdated={fetchSessionDetails}
          onSessionClosed={sessionData.status === 'active' ? handleSessionClosed : null}
        />
      )}
    </div>
  );
};

export default FacultyAttendanceSession;
