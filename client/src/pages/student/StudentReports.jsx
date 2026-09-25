import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { FileText, Download, Calendar, CheckCircle2, XCircle, Percent, Clock } from 'lucide-react';
import { format } from 'date-fns';

export const StudentReports = () => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/attendance/student');
        if (res.data.success) {
          setHistory(res.data);
        }
      } catch (err) {
        console.error('Fetch student history error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const percentage = history?.summary?.percentage || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
            My Academic Attendance Statement
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified audit statement of attended classroom periods and exam eligibility percentages
          </p>
        </div>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-xs text-slate-400">Total Eligible Classes</div>
          <div className="text-2xl font-bold text-white font-outfit mt-1">
            {history?.summary?.totalEligible || 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30">
          <div className="text-xs text-emerald-300">Present Records</div>
          <div className="text-2xl font-bold text-emerald-400 font-outfit mt-1">
            {history?.summary?.presentCount || 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30">
          <div className="text-xs text-rose-300">Absent Records</div>
          <div className="text-2xl font-bold text-rose-400 font-outfit mt-1">
            {history?.summary?.absentCount || 0}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-teal-950/40 border border-teal-500/30">
          <div className="text-xs text-teal-300">Current Percentage</div>
          <div className="text-2xl font-bold text-teal-400 font-outfit mt-1">
            {percentage}%
          </div>
        </div>
      </div>

      {/* Full Records Table */}
      <div className="p-5 sm:p-6 rounded-3xl glass-panel space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <FileText className="w-4 h-4 text-teal-400" />
            <span>Complete Session-by-Session Records</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">{history?.records?.length || 0} Entries</span>
        </div>

        {history?.records?.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No attendance records available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Classroom</th>
                  <th className="py-3 px-3">Period</th>
                  <th className="py-3 px-3">Timetable Slot</th>
                  <th className="py-3 px-3">Check-in Time</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Verification Mode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {(history?.records || []).map((r) => {
                  const isPresent = r.status === 'Present';
                  return (
                    <tr key={r._id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-300">{r.date}</td>
                      <td className="py-3 px-3 text-white font-semibold">{r.classroomId?.name}</td>
                      <td className="py-3 px-3 text-slate-400">Period {r.sessionNumber}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {r.sessionId?.startTime} - {r.sessionId?.endTime}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">
                        {r.checkInTime ? format(new Date(r.checkInTime), 'hh:mm:ss a') : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isPresent
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {r.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
                        {r.verificationMethod}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentReports;
