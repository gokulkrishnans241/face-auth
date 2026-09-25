import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Modal from '../../components/common/Modal';
import {
  Building2,
  Users,
  GraduationCap,
  Settings,
  Plus,
  Edit2,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export const ClassroomManagement = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    roomNumber: '',
    department: '',
    course: '',
    capacity: 60,
    defaultSessionCount: 7,
    status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const fetchClassrooms = async () => {
    setLoading(true);
    try {
      const [resCr, resFac] = await Promise.all([
        apiClient.get('/classrooms'),
        apiClient.get('/users/faculty'),
      ]);
      if (resCr.data.success) setClassrooms(resCr.data.classrooms);
      if (resFac.data.success) setFacultyList(resFac.data.faculty);
    } catch (err) {
      console.error('Fetch classroom error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleOpenEdit = (cr) => {
    setSelectedClassroom(cr);
    setFormData({
      name: cr.name,
      roomNumber: cr.roomNumber,
      department: cr.department,
      course: cr.course,
      capacity: cr.capacity,
      defaultSessionCount: cr.defaultSessionCount || 7,
      status: cr.status,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedClassroom) return;

    setSaving(true);
    try {
      const res = await apiClient.put(`/classrooms/${selectedClassroom._id}`, formData);
      if (res.data.success) {
        setSuccessMessage(`Updated configuration for ${res.data.classroom.name}`);
        setIsEditModalOpen(false);
        fetchClassrooms();
      }
    } catch (err) {
      console.error('Save classroom error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
              College Classroom Infrastructure
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              7 CLASSROOMS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure smart classrooms, session slots (6 vs 7 daily periods), and faculty allocations
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-xs text-emerald-200 flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-400 font-bold">Dismiss</button>
        </div>
      )}

      {/* 7 Classrooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {classrooms.map((cr) => (
          <div
            key={cr._id}
            className="p-5 rounded-3xl glass-panel hover:border-teal-500/40 transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                  {cr.classroomId}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    cr.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {cr.status}
                </span>
              </div>

              <h2 className="text-base font-bold text-white font-outfit mb-1">{cr.name}</h2>
              <p className="text-xs text-slate-400 mb-4">{cr.department} • {cr.course}</p>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-teal-400" /> Seating Capacity
                  </span>
                  <span className="font-mono text-white font-bold">{cr.capacity} Seats</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-teal-400" /> Enrolled Students
                  </span>
                  <span className="font-mono text-white font-bold">{cr.students?.length || 0} Students</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/80 border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-teal-400" /> Daily Schedule
                  </span>
                  <span className="font-mono text-teal-300 font-bold">{cr.defaultSessionCount || 7} Periods / Day</span>
                </div>
              </div>

              {/* Assigned Faculty */}
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Assigned Faculty Members:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(cr.assignedFaculty || []).length === 0 ? (
                    <span className="text-xs text-slate-500 italic">No faculty assigned</span>
                  ) : (
                    cr.assignedFaculty.map((f) => (
                      <span
                        key={f._id}
                        className="px-2 py-0.5 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 text-[11px]"
                      >
                        {f.name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => handleOpenEdit(cr)}
              className="mt-5 w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Configure Classroom</span>
            </button>
          </div>
        ))}
      </div>

      {/* Edit Classroom Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Configure ${selectedClassroom?.name}`}
        subtitle={`Classroom Code: ${selectedClassroom?.classroomId}`}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Classroom Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl glass-input"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Room Number</label>
              <input
                type="text"
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Seating Capacity</label>
              <input
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 60 })}
                className="w-full px-3 py-2 rounded-xl glass-input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Target Course / Class</label>
              <input
                type="text"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Daily Periods Schedule</label>
              <select
                value={formData.defaultSessionCount}
                onChange={(e) => setFormData({ ...formData, defaultSessionCount: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl glass-input"
              >
                <option value={7}>7 Periods per Day</option>
                <option value={6}>6 Periods per Day</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Operating Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input"
              >
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold shadow-lg shadow-teal-500/20"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ClassroomManagement;
