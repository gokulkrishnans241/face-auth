import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  Filter,
  CheckCircle2,
  FileText,
  Sparkles,
  Layers,
} from 'lucide-react';
import { format } from 'date-fns';

export const ReportsCenter = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const res = await apiClient.get('/classrooms');
        if (res.data.success) {
          setClassrooms(res.data.classrooms);
        }
      } catch (err) {
        console.error('Fetch classrooms error:', err);
      }
    };
    fetchClassrooms();
  }, []);

  const handleExportExcel = () => {
    setDownloading(true);
    const token = localStorage.getItem('smart_attendance_token');
    const apiUrl = import.meta.env.VITE_API_URL || '/api';

    let url = `${apiUrl}/reports/excel?startDate=${startDate}&endDate=${endDate}&token=${token}`;
    if (selectedClassroomId) url += `&classroomId=${selectedClassroomId}`;

    window.open(url, '_blank');
    setTimeout(() => setDownloading(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
              Official Excel Reports Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              XLSX GENERATOR
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Export institution-grade formatted attendance workbooks with summary sheets and detailed logs
          </p>
        </div>
      </div>

      {/* Filter & Export Card */}
      <div className="p-6 rounded-3xl glass-panel space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Configure Report Scope & Filters
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select the date period and target classrooms for the workbook export
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-400" /> Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl glass-input"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-teal-400" /> End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl glass-input"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-teal-400" /> Target Classroom
            </label>
            <select
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl glass-input"
            >
              <option value="">All 7 Classrooms (Institution Wide)</option>
              {classrooms.map((cr) => (
                <option key={cr._id} value={cr._id}>
                  {cr.classroomId}: {cr.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end">
          <button
            onClick={handleExportExcel}
            disabled={downloading}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold text-xs shadow-xl shadow-teal-500/20 flex items-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Preparing Workbook...' : 'Download Official Excel Report (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* Overview of 4 Excel Sheets Included in the Workbook */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-400" />
          <span>Workbook Sheets Architecture (Generated by ExcelJS)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl glass-card space-y-2 border-teal-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-300">Sheet 1: Daily Summary</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 font-mono">Aggregated</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Date, Classroom, Total Students, Total Sessions, Total Present Records, Total Absent Records, and Attendance Percentage.
            </p>
          </div>

          <div className="p-4 rounded-2xl glass-card space-y-2 border-blue-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-300">Sheet 2: Session Summary</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono">Period-Wise</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Date, Classroom, Session Number, Session Name, Start/End Times, Eligible Students, Present, Absent, and Period Attendance Rate.
            </p>
          </div>

          <div className="p-4 rounded-2xl glass-card space-y-2 border-emerald-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300">Sheet 3: Detailed Logs</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">Row-by-Row</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Serial No, Student ID, Name, Department, Date, Period, Check-in Time, Status Badge, Updated By, and Admin Correction Reasons.
            </p>
          </div>

          <div className="p-4 rounded-2xl glass-card space-y-2 border-purple-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300">Sheet 4: Student Summary</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono">Individual</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Student Roll No, Name, Classroom, Total Eligible Sessions, Total Present Count, Total Absent Count, and Overall Percentage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsCenter;
