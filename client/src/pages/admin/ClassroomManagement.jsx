import React, { useState, useEffect } from 'react';
import ClassroomPeriodMatrix from '../../components/attendance/ClassroomPeriodMatrix';
import apiClient from '../../api/client';
import {
  Building2,
  Sparkles,
  Users,
  Calendar,
  Layers,
} from 'lucide-react';

export const ClassroomManagement = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const res = await apiClient.get('/classrooms');
        if (res.data.success) {
          setClassrooms(res.data.classrooms);
        }
      } catch (err) {
        console.error('Fetch classrooms error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchClassrooms();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-3xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
              Classroom Period-Wise Summary
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              7 CLASSES • PERIODS 1-7
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Admin overview of Class 1 to Class 7 across all 7 daily periods • 1-click status edit & XML/Excel download
          </p>
        </div>
      </div>

      {/* 7-Class Period Matrix with Quick Class 1-7 Switcher, 1-click toggle, and XML/Excel download */}
      <ClassroomPeriodMatrix
        allowClassroomSwitch={true}
        userRole="admin"
      />
    </div>
  );
};

export default ClassroomManagement;
