import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Modal from '../../components/common/Modal';
import FaceEnrollmentModal from '../../components/face/FaceEnrollmentModal';
import {
  GraduationCap,
  UserPlus,
  ScanFace,
  Search,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Edit2,
  Trash2,
  Mail,
  Building2,
  Sparkles,
} from 'lucide-react';

export const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassroomId, setSelectedClassroomId] = useState('');
  const [selectedStudentForBiometric, setSelectedStudentForBiometric] = useState(null);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    userId: '',
    name: '',
    email: '',
    password: 'Student@123',
    department: 'Computer Science & Engineering',
    assignedClassrooms: [],
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resStu, resCr] = await Promise.all([
        apiClient.get(`/users/students${selectedClassroomId ? `?classroomId=${selectedClassroomId}` : ''}`),
        apiClient.get('/classrooms'),
      ]);
      if (resStu.data.success) setStudents(resStu.data.students);
      if (resCr.data.success) setClassrooms(resCr.data.classrooms);
    } catch (err) {
      console.error('Fetch students error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedClassroomId]);

  const handleOpenAdd = () => {
    setFormData({
      userId: `STU2024${String(students.length + 1).padStart(3, '0')}`,
      name: '',
      email: '',
      password: 'Student@123',
      department: 'Computer Science & Engineering',
      assignedClassrooms: selectedClassroomId ? [selectedClassroomId] : [],
    });
    setIsAddModalOpen(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await apiClient.post('/users', { ...formData, role: 'student' });
      if (res.data.success) {
        setMessage(`Student account created for ${res.data.user.name}`);
        setIsAddModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error saving student.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenBiometricEnrollment = (student) => {
    setSelectedStudentForBiometric(student);
    setIsEnrollModalOpen(true);
  };

  const handleResetBiometrics = async (student) => {
    if (!window.confirm(`Are you sure you want to reset biometric face profile for ${student.name}?`)) {
      return;
    }
    try {
      const res = await apiClient.delete(`/face/reset/${student._id}`);
      if (res.data.success) {
        setMessage(`Biometric profile reset for ${student.name}`);
        fetchData();
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error resetting biometrics.');
    }
  };

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
            Student Directory & Biometric Profiles
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage student registrations, classroom assignments, and 128-d face recognition embeddings
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Classroom Filter */}
          <select
            value={selectedClassroomId}
            onChange={(e) => setSelectedClassroomId(e.target.value)}
            className="px-3 py-1.5 rounded-xl glass-input text-xs"
          >
            <option value="">All Classrooms</option>
            {classrooms.map((cr) => (
              <option key={cr._id} value={cr._id}>
                {cr.classroomId}: {cr.name}
              </option>
            ))}
          </select>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search student or Roll No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-xl glass-input text-xs w-48 sm:w-56"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-teal-950/80 border border-teal-500/30 text-xs text-teal-200 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-teal-400 font-bold">Dismiss</button>
        </div>
      )}

      {/* Student List Table */}
      <div className="p-5 rounded-3xl glass-panel space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <GraduationCap className="w-4 h-4 text-teal-400" />
            <span>Registered Students ({filtered.length})</span>
          </div>
          <span className="text-[11px] text-slate-400">ISO-19794-5 Biometric Standard Compliant</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-3 px-3">Roll No / ID</th>
                <th className="py-3 px-3">Student Name</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Classrooms</th>
                <th className="py-3 px-3 text-center">Biometric Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filtered.map((s) => (
                <tr key={s._id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3 px-3 font-mono font-bold text-teal-300">{s.userId}</td>
                  <td className="py-3 px-3 font-semibold text-white">{s.name}</td>
                  <td className="py-3 px-3 text-slate-400">{s.department}</td>
                  <td className="py-3 px-3 text-slate-300">
                    <div className="flex flex-wrap gap-1">
                      {(s.assignedClassrooms || []).map((cr) => (
                        <span
                          key={cr._id || cr}
                          className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800 text-[10px] font-mono"
                        >
                          {cr.classroomId || 'CR'}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {s.biometricEnrolled ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <ShieldCheck className="w-3 h-3" /> ENROLLED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <ShieldAlert className="w-3 h-3" /> PENDING
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenBiometricEnrollment(s)}
                        className="px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-[11px] font-semibold transition-colors flex items-center gap-1"
                        title="Enroll or re-capture facial embedding"
                      >
                        <ScanFace className="w-3.5 h-3.5" />
                        <span>{s.biometricEnrolled ? 'Re-Enroll' : 'Enroll Face'}</span>
                      </button>

                      {s.biometricEnrolled && (
                        <button
                          onClick={() => handleResetBiometrics(s)}
                          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                          title="Reset biometric descriptor and revoke consent"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Biometric Enrollment Modal */}
      {selectedStudentForBiometric && (
        <FaceEnrollmentModal
          isOpen={isEnrollModalOpen}
          onClose={() => {
            setIsEnrollModalOpen(false);
            setSelectedStudentForBiometric(null);
          }}
          user={selectedStudentForBiometric}
          onEnrollmentComplete={fetchData}
        />
      )}

      {/* Add Student Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register New Student"
        subtitle="Add student credentials and assign to college classrooms"
      >
        <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Roll No / Student ID</label>
              <input
                type="text"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl glass-input"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Department</label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full px-3 py-2 rounded-xl glass-input"
            >
              <option value="Computer Science & Engineering">Computer Science & Engineering</option>
              <option value="Artificial Intelligence & Data Science">Artificial Intelligence & Data Science</option>
              <option value="Information Technology">Information Technology</option>
              <option value="Electronics & Communication">Electronics & Communication</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Assign Classrooms</label>
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800 max-h-36 overflow-y-auto">
              {classrooms.map((cr) => {
                const isChecked = formData.assignedClassrooms.includes(cr._id);
                return (
                  <label key={cr._id} className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            assignedClassrooms: [...formData.assignedClassrooms, cr._id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            assignedClassrooms: formData.assignedClassrooms.filter((id) => id !== cr._id),
                          });
                        }
                      }}
                      className="rounded text-teal-500 bg-slate-900 border-slate-700"
                    />
                    <span className="text-[11px] truncate">{cr.classroomId}: {cr.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold shadow-lg shadow-teal-500/20"
            >
              {saving ? 'Creating...' : 'Create Student'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StudentManagement;
