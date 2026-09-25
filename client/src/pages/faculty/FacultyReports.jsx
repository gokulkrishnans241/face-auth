import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  FileText,
  Layers,
} from 'lucide-react';
import { format } from 'date-fns';

export const FacultyReports = () => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchAssignedClassrooms = async () => {
      try {
        const res = await apiClient.get('/classrooms');
        if (res.data.success) {
          setClassrooms(res.data.classrooms);
          if (res.data.classrooms.length > 0) {
            setSelectedClassroomId(res.data.classrooms[0]._id);
          }
        }
      } catch (err) {
        console.error('Fetch faculty classrooms error:', err);
      }
    };
    fetchAssignedClassrooms();
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
          <h1 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
            Faculty Attendance Reports
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Download authorized Excel (.xlsx) attendance spreadsheets for your assigned classrooms
          </p>
        </div>
      </div>

      {/* Report Filter Card */}
      <div className="p-6 rounded-3xl glass-panel space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Export Attendance Spreadsheets
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate 4-sheet multi-tab workbooks containing daily and session summaries
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
              <Building2 className="w-3.5 h-3.5 text-teal-400" /> Assigned Classroom
            </label>
            <select
              value={selectedClassroomId}
              onChange={(e) => setSelectedClassroomId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl glass-input"
            >
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
            <span>{downloading ? 'Generating Report...' : 'Download Class Attendance (.xlsx)'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FacultyReports;
