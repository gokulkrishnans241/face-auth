import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import {
  Calendar,
  Building2,
  Clock,
  Play,
  CheckCircle,
  Plus,
  RefreshCw,
  Users,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

export const SessionTimetable = () => {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchClassroomsAndSessions = async () => {
    setLoading(true);
    try {
      const resCr = await apiClient.get('/classrooms');
      if (resCr.data.success) {
        setClassrooms(resCr.data.classrooms);
      }

      let url = `/sessions?date=${date}`;
      if (selectedClassroomId) url += `&classroomId=${selectedClassroomId}`;

      const resSess = await apiClient.get(url);
      if (resSess.data.success) {
        setSessions(resSess.data.sessions);
      }
    } catch (err) {
      console.error('Fetch sessions error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassroomsAndSessions();
  }, [date, selectedClassroomId]);

  const handleStartSession = async (sessionId) => {
    try {
      const res = await apiClient.post(`/sessions/${sessionId}/start`);
      if (res.data.success) {
        setMessage(`Session started: ${res.data.session.sessionName}`);
        fetchClassroomsAndSessions();
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error starting session.');
    }
  };

  const handleCloseSession = async (sessionId) => {
    try {
      const res = await apiClient.post(`/sessions/${sessionId}/close`);
      if (res.data.success) {
        setMessage(`Session completed. Finalized ${res.data.stats?.absentCount || 0} absences.`);
        fetchClassroomsAndSessions();
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error closing session.');
    }
  };

  const handleGenerateDay = async () => {
    try {
      const res = await apiClient.post('/sessions/generate-daily', {
        date,
        classroomId: selectedClassroomId || undefined,
        sessionCount: 7,
      });
      if (res.data.success) {
        setMessage(`Created ${res.data.count} sessions for ${date}.`);
        fetchClassroomsAndSessions();
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error generating timetable.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="p-5 rounded-2xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
            Sessions & Daily Timetable
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure 6 to 7 daily periods, start live scanning, and finalize session deadlines
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-teal-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none text-xs"
            />
          </div>

          {/* Classroom Selector */}
          <select
            value={selectedClassroomId}
            onChange={(e) => setSelectedClassroomId(e.target.value)}
            className="px-3 py-1.5 rounded-xl glass-input text-xs"
          >
            <option value="">All 7 Classrooms</option>
            {classrooms.map((cr) => (
              <option key={cr._id} value={cr._id}>
                {cr.classroomId}: {cr.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleGenerateDay}
            className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Generate Periods
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-teal-950/80 border border-teal-500/30 text-xs text-teal-200 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-teal-400 font-bold">Dismiss</button>
        </div>
      )}

      {/* Sessions Grid */}
      {sessions.length === 0 ? (
        <div className="p-12 text-center rounded-3xl glass-panel space-y-3">
          <Clock className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">No Sessions Scheduled for {date}</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Generate the daily 6 or 7 period timetable for all classrooms with one click.
          </p>
          <button
            onClick={handleGenerateDay}
            className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20"
          >
            Generate Today's Periods
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sessions.map((sess) => {
            const isCompleted = sess.status === 'completed';
            const isActive = sess.status === 'active';

            return (
              <div
                key={sess._id}
                className={`p-5 rounded-3xl glass-panel border transition-all flex flex-col justify-between ${
                  isActive
                    ? 'border-teal-500/50 shadow-lg shadow-teal-500/10'
                    : isCompleted
                    ? 'border-slate-800 opacity-90'
                    : 'border-slate-800/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-slate-900 border border-slate-800 text-teal-300">
                      Period {sess.sessionNumber}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                  <p className="text-xs text-slate-400 mt-0.5">
                    {sess.classroomId?.name} ({sess.classroomId?.classroomId})
                  </p>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-400">Class Hours:</span>
                      <span className="font-mono text-slate-200 font-semibold">{sess.startTime} - {sess.endTime}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-400">Attendance Deadline:</span>
                      <span className="font-mono text-amber-400 font-semibold">{sess.attendanceDeadline}</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-400">Assigned Faculty:</span>
                      <span className="text-slate-200 font-medium">{sess.assignedFaculty?.name || 'Faculty In-Charge'}</span>
                    </div>

                    {/* Attendance summary pill */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-[11px]">
                      <span className="text-emerald-400 font-bold">{sess.presentCount || 0} Present</span>
                      <span className="text-rose-400 font-bold">{sess.absentCount || 0} Absent</span>
                      <span className="text-slate-400">{sess.totalEligibleStudents || 0} Total</span>
                    </div>
                  </div>
                </div>

                {/* Session Action Buttons */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                  {sess.status === 'scheduled' && (
                    <button
                      onClick={() => handleStartSession(sess._id)}
                      className="w-full py-2 px-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Attendance Session</span>
                    </button>
                  )}

                  {sess.status === 'active' && (
                    <button
                      onClick={() => handleCloseSession(sess._id)}
                      className="w-full py-2 px-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>End & Process Absences</span>
                    </button>
                  )}

                  {sess.status === 'completed' && (
                    <div className="w-full py-2 text-center text-[11px] text-slate-500 font-medium">
                      Session Completed & Absences Logged
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SessionTimetable;
