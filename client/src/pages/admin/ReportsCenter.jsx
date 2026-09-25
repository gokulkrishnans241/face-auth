import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import ClassroomPeriodMatrix from '../../components/attendance/ClassroomPeriodMatrix';
import { downloadExcelReport } from '../../utils/exportUtils';
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
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const res = await apiClient.get('/classrooms');
        if (res.data.success) {
          setClassrooms(res.data.classrooms);
          if (res.data.classrooms.length > 0) {
            setSelectedClassroomId(res.data.classrooms[0]._id);
          }
        }
      } catch (err) {
        console.error('Fetch classrooms error:', err);
      }
    };
    fetchClassrooms();
  }, []);

  const handleExportExcel = async () => {
    setDownloading(true);
    setMessage('');
    try {
      await downloadExcelReport({
        startDate,
        endDate,
        classroomId: selectedClassroomId,
        customFilename: `Institution_Attendance_Report_${startDate}_to_${endDate}.xlsx`,
      });
      setMessage('Institution attendance Excel workbook downloaded successfully.');
    } catch (err) {
      setMessage(err.message || 'Failed to download Excel report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-3xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
              Official Excel Reports & Period Matrix Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              XLSX GENERATOR
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Export institution-grade 5-sheet attendance workbooks and view real-time period matrices for all 7 classrooms
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-2xl bg-teal-950/80 border border-teal-500/30 text-xs text-teal-200 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-teal-400 font-bold">Dismiss</button>
        </div>
      )}

      {/* Filter & Export Card */}
      <div className="p-6 rounded-3xl glass-panel space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-teal-400" />
            <span>Configure Report Scope & Filters</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select the date period and target classrooms for the multi-tab workbook export
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
              className="w-full px-3 py-2.5 rounded-xl glass-input font-mono"
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
              className="w-full px-3 py-2.5 rounded-xl glass-input font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-teal-400" /> Target Classroom
            </label>
            <select
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl glass-input font-medium"
            >
              <option value="">All 7 Classrooms (Institution Wide)</option>
              {classrooms.map((cr) => (
                <option key={cr._id} value={cr._id}>
                  {cr.classroomId}: {cr.name} ({cr.department})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-end">
          <button
            onClick={handleExportExcel}
            disabled={downloading}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold text-xs shadow-xl shadow-teal-500/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{downloading ? 'Preparing Workbook...' : 'Download Official Excel Report (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* Overview of 5 Excel Sheets Included in the Workbook */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-400" />
          <span>Workbook Sheets Architecture (Generated by ExcelJS)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
          <div className="p-4 rounded-2xl glass-card space-y-2 border-teal-500/40 bg-teal-950/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-300">Sheet 1: Period Matrix</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 font-mono">P1-P7</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Full student matrix across all 7 daily periods with color-coded Present (P) / Absent (A) indicators.
            </p>
          </div>

          <div className="p-4 rounded-2xl glass-card space-y-2 border-teal-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-300">Sheet 2: Daily Summary</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 font-mono">Aggregated</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Date, Classroom, Total Students, Total Sessions, Total Present, Total Absent, and Percentage.
            </p>
          </div>

          <div className="p-4 rounded-2xl glass-card space-y-2 border-blue-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-300">Sheet 3: Session Summary</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono">Period-Wise</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Date, Classroom, Session No, Session Name, Start/End Times, Eligible Students, Present, and Absent.
            </p>
          </div>

          <div className="p-4 rounded-2xl glass-card space-y-2 border-emerald-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300">Sheet 4: Detailed Logs</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono">Row-by-Row</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Serial No, Student ID, Name, Department, Date, Check-in Time, Status Badge, and Audit Overrides.
            </p>
          </div>

          <div className="p-4 rounded-2xl glass-card space-y-2 border-purple-500/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300">Sheet 5: Student Summary</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 font-mono">Individual</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Student Roll No, Name, Classroom, Total Eligible Sessions, Present Count, Absent Count, and Rate.
            </p>
          </div>
        </div>
      </div>

      {/* Embedded Live Period-by-Period Classroom Matrix */}
      {selectedClassroomId && (
        <ClassroomPeriodMatrix
          initialClassroomId={selectedClassroomId}
          allowClassroomSwitch={true}
          userRole="admin"
        />
      )}
    </div>
  );
};

export default ReportsCenter;
