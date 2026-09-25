import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import { History, Shield, Calendar, Search, Filter, RefreshCw, UserCheck } from 'lucide-react';
import { format } from 'date-fns';

export const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateFilter, setDateFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let url = `/audit/logs?page=${page}&limit=20`;
      if (dateFilter) url += `&date=${dateFilter}`;

      const res = await apiClient.get(url);
      if (res.data.success) {
        setLogs(res.data.logs);
        setTotalPages(res.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Fetch audit logs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, dateFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
              Security & Attendance Audit Trail
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
              TAMPER PROOF
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable log of all administrative status overrides, date changes, and justification notes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <Calendar className="w-3.5 h-3.5 text-teal-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-white focus:outline-none text-xs"
            />
          </div>

          <button
            onClick={fetchLogs}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="p-5 rounded-3xl glass-panel space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <History className="w-4 h-4 text-teal-400" />
            <span>Audit Entries</span>
          </div>
          <span className="text-[11px] text-slate-400">Page {page} of {totalPages}</span>
        </div>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No audit logs found for the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Administrator</th>
                  <th className="py-3 px-3">Student</th>
                  <th className="py-3 px-3">Classroom & Period</th>
                  <th className="py-3 px-3 text-center">Transition</th>
                  <th className="py-3 px-3">Correction Reason</th>
                  <th className="py-3 px-3 font-mono text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {format(new Date(log.createdAt), 'dd MMM yyyy, hh:mm a')}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{log.administratorId?.name || 'Administrator'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.administratorId?.userId}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-200">{log.studentId?.name}</div>
                      <div className="text-[10px] text-teal-400 font-mono">{log.studentId?.userId}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <div>{log.classroomId?.name || 'Classroom'}</div>
                      <div className="text-[10px] text-slate-500">
                        {log.sessionId?.sessionName || `Period ${log.sessionId?.sessionNumber}`}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono">
                        <span className="text-slate-400 line-through">{log.previousStatus}</span>
                        <span className="text-teal-400 font-bold">→</span>
                        <span
                          className={`font-bold ${
                            log.updatedStatus === 'Present' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {log.updatedStatus}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-amber-200/90 text-xs">
                      {log.correctionReason}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[11px] text-slate-500">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-slate-400">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
