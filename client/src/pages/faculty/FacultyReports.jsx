import React from 'react';
import ClassroomPeriodMatrix from '../../components/attendance/ClassroomPeriodMatrix';
import { Building2, Sparkles } from 'lucide-react';

export const FacultyReports = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-3xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
              Faculty Classroom Summary
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              7 CLASSES • PERIODS 1-7
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            View period 1 to 7 attendance matrix for all classrooms • 1-click status override & download XML / Excel sheets
          </p>
        </div>
      </div>

      {/* Embedded Live Period-by-Period Classroom Matrix */}
      <ClassroomPeriodMatrix
        allowClassroomSwitch={true}
        userRole="faculty"
      />
    </div>
  );
};

export default FacultyReports;
