import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import Modal from '../../components/common/Modal';
import {
  Users,
  UserPlus,
  Building2,
  Mail,
  Shield,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Search,
} from 'lucide-react';

export const FacultyManagement = () => {
  const [faculty, setFaculty] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [formData, setFormData] = useState({
    userId: '',
    name: '',
    email: '',
    password: '',
    department: 'Computer Science & Engineering',
    assignedClassrooms: [],
    accountStatus: 'active',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resFac, resCr] = await Promise.all([
        apiClient.get('/users/faculty'),
        apiClient.get('/classrooms'),
      ]);
      if (resFac.data.success) setFaculty(resFac.data.faculty);
      if (resCr.data.success) setClassrooms(resCr.data.classrooms);
    } catch (err) {
      console.error('Fetch faculty error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setEditingFaculty(null);
    setFormData({
      userId: `FAC${100 + faculty.length + 1}`,
      name: '',
      email: '',
      password: 'Faculty@123',
      department: 'Computer Science & Engineering',
      assignedClassrooms: [],
      accountStatus: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (f) => {
    setEditingFaculty(f);
    setFormData({
      userId: f.userId,
      name: f.name,
      email: f.email,
      department: f.department,
      assignedClassrooms: f.assignedClassrooms ? f.assignedClassrooms.map((c) => c._id || c) : [],
      accountStatus: f.accountStatus,
    });
    setIsModalOpen(true);
  };

  const handleSaveFaculty = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      if (editingFaculty) {
        const res = await apiClient.put(`/users/${editingFaculty._id}`, formData);
        if (res.data.success) {
          setMessage(`Updated details for ${res.data.user.name}`);
        }
      } else {
        const res = await apiClient.post('/users', { ...formData, role: 'faculty' });
        if (res.data.success) {
          setMessage(`Faculty account created for ${res.data.user.name}`);
        }
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error saving faculty.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (f) => {
    const nextStatus = f.accountStatus === 'active' ? 'inactive' : 'active';
    try {
      await apiClient.put(`/users/${f._id}`, { accountStatus: nextStatus });
      fetchData();
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  const filtered = faculty.filter(
    (f) =>
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl glass-panel flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
            Faculty Directory & Classroom Allocations
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage professors, lecturers, and assigned laboratory / hall permissions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search faculty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-xl glass-input text-xs w-48 sm:w-64"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Faculty</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-teal-950/80 border border-teal-500/30 text-xs text-teal-200 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-teal-400 font-bold">Dismiss</button>
        </div>
      )}

      {/* Faculty Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((f) => (
          <div
            key={f._id}
            className="p-5 rounded-3xl glass-panel hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-500/10 border border-teal-500/30 text-teal-300 flex items-center justify-center font-bold text-sm">
                    {f.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-outfit">{f.name}</h3>
                    <span className="text-[11px] font-mono text-teal-400">{f.userId}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleStatus(f)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    f.accountStatus === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}
                >
                  {f.accountStatus.toUpperCase()}
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-400 mb-4">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-300 truncate">{f.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-300">{f.department}</span>
                </div>
              </div>

              {/* Assigned Classrooms Pill List */}
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Assigned Classrooms ({(f.assignedClassrooms || []).length}):
                </span>
                <div className="flex flex-wrap gap-1">
                  {(f.assignedClassrooms || []).length === 0 ? (
                    <span className="text-[11px] text-slate-500 italic">No assigned classrooms</span>
                  ) : (
                    f.assignedClassrooms.map((cr) => (
                      <span
                        key={cr._id || cr}
                        className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 text-[10px] font-mono"
                      >
                        {cr.classroomId || cr.name || 'CR'}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-end gap-2">
              <button
                onClick={() => handleOpenEdit(f)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Faculty Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFaculty ? `Edit Faculty: ${editingFaculty.name}` : 'Register New Faculty Account'}
        subtitle="Manage academic department and classroom access permissions"
      >
        <form onSubmit={handleSaveFaculty} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Faculty ID</label>
              <input
                type="text"
                value={formData.userId}
                onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input"
                required
                disabled={Boolean(editingFaculty)}
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
            <label className="block text-slate-300 font-medium mb-1">Official Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 rounded-xl glass-input"
              required
            />
          </div>

          {!editingFaculty && (
            <div>
              <label className="block text-slate-300 font-medium mb-1">Temporary Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input"
                required
              />
            </div>
          )}

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
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold shadow-lg shadow-teal-500/20"
            >
              {saving ? 'Saving...' : 'Save Faculty Account'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FacultyManagement;
