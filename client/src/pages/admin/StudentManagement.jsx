import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../api/client';
import Modal from '../../components/common/Modal';
import CameraHUD, { playSuccessChime } from '../../components/face/CameraHUD';
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
  Camera,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassroomId, setSelectedClassroomId] = useState('');

  // Combined Student Registration + Live Camera Face Enrollment Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addStep, setAddStep] = useState('details'); // 'details' | 'camera' | 'success'
  const [formData, setFormData] = useState({
    userId: '',
    name: '',
    email: '',
    password: 'Student@123',
    department: 'Computer Science & Engineering',
    assignedClassrooms: [],
  });
  const [capturedSamples, setCapturedSamples] = useState(0);
  const [capturedEmbedding, setCapturedEmbedding] = useState(null);
  const [saving, setSaving] = useState(false);
  const [createdStudent, setCreatedStudent] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Separate Re-enroll modal for existing students
  const [reEnrollStudent, setReEnrollStudent] = useState(null);

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
    setAddStep('details');
    setCapturedSamples(0);
    setCapturedEmbedding(null);
    setCreatedStudent(null);
    setError('');
    setFormData({
      userId: `STU${2024000 + students.length + 1}`,
      name: '',
      email: '',
      password: 'Student@123',
      department: 'Computer Science & Engineering',
      assignedClassrooms: selectedClassroomId ? [selectedClassroomId] : (classrooms.length > 0 ? [classrooms[0]._id] : []),
    });
    setIsAddModalOpen(true);
  };

  // Step 1: Submit Details and proceed to Camera
  const handleDetailsProceed = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.userId.trim() || !formData.email.trim()) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      // Create student user record
      const res = await apiClient.post('/users', { ...formData, role: 'student' });
      if (res.data.success) {
        setCreatedStudent(res.data.user);
        setAddStep('camera');
      } else {
        setError(res.data.message || 'Failed to create student record.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating student.');
    } finally {
      setSaving(false);
    }
  };

  const adminSamplesRef = useRef([]);
  const adminLastCaptureRef = useRef(0);

  // Step 2: Capture Face Sample via Camera
  const handleFaceSampleCaptured = async ({ embedding, personConfidence }) => {
    const now = Date.now();
    if (now - adminLastCaptureRef.current < 750 || saving) return;
    if (!embedding || !Array.isArray(embedding) || embedding.length < 16) return;

    adminLastCaptureRef.current = now;
    adminSamplesRef.current.push(embedding);
    const next = adminSamplesRef.current.length;
    setCapturedSamples(next);

    if (next >= 3) {
      setSaving(true);
      setError('');
      try {
        const targetUser = createdStudent || reEnrollStudent;
        const numDims = embedding.length;
        const avgVec = new Array(numDims).fill(0);
        adminSamplesRef.current.forEach((s) => {
          for (let i = 0; i < numDims; i++) avgVec[i] += s[i];
        });
        for (let i = 0; i < numDims; i++) avgVec[i] /= adminSamplesRef.current.length;

        let normSq = 0;
        for (let i = 0; i < numDims; i++) normSq += avgVec[i] * avgVec[i];
        const norm = Math.sqrt(normSq) || 1;
        const normalizedAvg = avgVec.map((v) => parseFloat((v / norm).toFixed(5)));

        const res = await apiClient.post('/face/enroll', {
          userId: targetUser._id,
          facialEmbedding: normalizedAvg,
          biometricConsent: true,
          imageQualityScore: 0.98,
        });

        if (res.data.success) {
          playSuccessChime();
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
          setAddStep('success');
          fetchData();
        } else {
          setError(res.data.message || 'Face enrollment failed.');
          adminSamplesRef.current = [];
          setCapturedSamples(0);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error saving face embedding.');
        adminSamplesRef.current = [];
        setCapturedSamples(0);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleOpenReEnroll = (student) => {
    setReEnrollStudent(student);
    setCreatedStudent(student);
    setCapturedSamples(0);
    setCapturedEmbedding(null);
    setAddStep('camera');
    setError('');
    setIsAddModalOpen(true);
  };

  const handleResetBiometrics = async (student) => {
    if (!window.confirm(`Reset biometric face profile for ${student.name}?`)) {
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

  const handleDeleteStudent = async (student) => {
    if (!window.confirm(`Delete student account ${student.name} (${student.userId})?`)) {
      return;
    }
    try {
      const res = await apiClient.delete(`/users/${student._id}`);
      if (res.data.success) {
        setMessage(`Student account deleted: ${student.name}`);
        fetchData();
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error deleting student.');
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
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
              Student Directory & Biometric Face Enrollment
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
              {students.length} ENROLLED
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Admin registers students, assigns classrooms, and captures live camera face profiles
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
              placeholder="Search by name or Roll No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-1.5 rounded-xl glass-input text-xs w-48 sm:w-56"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-teal-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enroll New Student + Face</span>
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
            <span>Enrolled Students ({filtered.length})</span>
          </div>
          <span className="text-[11px] text-slate-400">ISO-19794-5 Face Embeddings</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <GraduationCap className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-sm font-bold text-white">No Students Enrolled Yet</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Click "Enroll New Student + Face" to register students and capture their facial biometric descriptors with the live camera.
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs shadow-md"
            >
              Enroll First Student
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-3">Roll No / ID</th>
                  <th className="py-3 px-3">Student Name</th>
                  <th className="py-3 px-3">Department</th>
                  <th className="py-3 px-3">Assigned Classrooms</th>
                  <th className="py-3 px-3 text-center">Face Biometric</th>
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
                            {cr.classroomId || cr.name || 'CR'}
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
                          onClick={() => handleOpenReEnroll(s)}
                          className="px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30 text-[11px] font-semibold transition-colors flex items-center gap-1"
                          title="Capture or update face embedding"
                        >
                          <ScanFace className="w-3.5 h-3.5" />
                          <span>{s.biometricEnrolled ? 'Re-Capture' : 'Capture Face'}</span>
                        </button>

                        {s.biometricEnrolled && (
                          <button
                            onClick={() => handleResetBiometrics(s)}
                            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-amber-400 transition-colors"
                            title="Reset face biometric"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteStudent(s)}
                          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                          title="Delete student"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unified Student Registration & Live Camera Capture Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setReEnrollStudent(null);
        }}
        title={
          addStep === 'camera'
            ? `Live Face Capture: ${createdStudent?.name || 'Student'}`
            : addStep === 'success'
            ? 'Enrollment Complete!'
            : 'Enroll New Student & Face'
        }
        subtitle={
          addStep === 'camera'
            ? 'Align student in front of camera to record biometric profile'
            : 'Enter student academic details and proceed to camera face capture'
        }
        maxWidth="max-w-xl"
      >
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/30 text-xs text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Student Details Form */}
        {addStep === 'details' && (
          <form onSubmit={handleDetailsProceed} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Roll Number / Student ID</label>
                <input
                  type="text"
                  placeholder="e.g. STU2024001"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Student Name</label>
                <input
                  type="text"
                  placeholder="e.g. Aarav Patel"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl glass-input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Official Email Address</label>
              <input
                type="email"
                placeholder="student@college.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl glass-input"
                required
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Academic Department</label>
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
              <label className="block text-slate-300 font-medium mb-1">Assign to Classrooms (1 of 7)</label>
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
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 flex items-center gap-2 transition-all"
              >
                <span>Proceed to Live Camera Capture</span>
                <Camera className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Live Camera Face Capture */}
        {addStep === 'camera' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-slate-300 font-medium">
                Capturing Face Samples: <span className="text-teal-400 font-bold font-mono">{capturedSamples} / 3</span>
              </span>
              <span className="text-[11px] text-slate-400">Ask student to look at camera</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-teal-400 h-1.5 transition-all duration-300"
                style={{ width: `${(capturedSamples / 3) * 100}%` }}
              />
            </div>

            <CameraHUD
              active={isAddModalOpen && addStep === 'camera'}
              scanning={true}
              onFaceDetected={handleFaceSampleCaptured}
              matchFeedback={{
                success: capturedSamples === 3,
                title: capturedSamples === 3 ? 'Biometric Embedding Generated!' : 'Position face inside camera box',
                subtitle: capturedSamples < 3 ? 'Sampling facial landmark points...' : 'Writing 128-d descriptor to cloud...',
              }}
            />

            {saving && (
              <div className="flex items-center justify-center gap-2 p-3 text-xs text-teal-300 bg-teal-950/60 rounded-xl border border-teal-500/30">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving biometric profile to MongoDB Atlas...</span>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Success Confirmation */}
        {addStep === 'success' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <Check className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white font-outfit">Student & Face Enrolled!</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                <strong className="text-slate-200">{createdStudent?.name}</strong> is now registered and will be recognized automatically when faculty launches attendance.
              </p>
            </div>
            <button
              onClick={() => {
                setIsAddModalOpen(false);
                setReEnrollStudent(null);
              }}
              className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-colors"
            >
              Done & View Roster
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StudentManagement;
