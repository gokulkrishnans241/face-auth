import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ScanFace,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

export const Login = () => {
  const [emailOrUserId, setEmailOrUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!emailOrUserId || !password) {
      setError('Please enter your email or User ID and password.');
      return;
    }

    setLoading(true);
    setError('');

    const res = await login(emailOrUserId, password);
    setLoading(false);

    if (res.success) {
      const role = res.user.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'faculty') navigate('/faculty');
      else navigate('/student');
    } else {
      setError(res.message);
    }
  };

  const handleDemoFill = (email, pass) => {
    setEmailOrUserId(email);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-slate-950">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-600 shadow-xl shadow-teal-500/20 text-slate-950 mb-2">
            <ScanFace className="w-8 h-8 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-outfit">
            SmartFace <span className="text-teal-400">Portal</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Cloud Attendance & Facial Biometric Management System
          </p>
        </div>

        {/* Login Form Card */}
        <div className="p-6 sm:p-8 rounded-3xl glass-panel space-y-5">
          <div className="border-b border-slate-800/80 pb-4">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Account Authentication
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter your college credentials to access your portal
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/30 text-xs text-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email or User ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="e.g. admin@college.edu or FAC101"
                  value={emailOrUserId}
                  onChange={(e) => setEmailOrUserId(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs glass-input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-xs glass-input"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all mt-2"
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins Selection */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-2">
              <span className="flex items-center gap-1 text-teal-400">
                <Sparkles className="w-3 h-3" /> DEMO QUICK ACCESS:
              </span>
              <span className="text-[10px] text-slate-500">Click to fill</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => handleDemoFill('admin@college.edu', 'AdminPassword@123')}
                className="flex items-center justify-between p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <div>
                    <div className="text-xs font-bold text-purple-200">Dean / Administrator</div>
                    <div className="text-[10px] text-slate-400">admin@college.edu</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-purple-300">Fill</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('prof.sharma@college.edu', 'Faculty@123')}
                className="flex items-center justify-between p-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-teal-400" />
                  <div>
                    <div className="text-xs font-bold text-teal-200">Prof. Rajesh Sharma (Faculty)</div>
                    <div className="text-[10px] text-slate-400">prof.sharma@college.edu</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-teal-300">Fill</span>
              </button>

              <button
                type="button"
                onClick={() => handleDemoFill('aarav.patel@student.college.edu', 'Student@123')}
                className="flex items-center justify-between p-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-left transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="text-xs font-bold text-cyan-200">Aarav Patel (Student)</div>
                    <div className="text-[10px] text-slate-400">aarav.patel@student.college.edu</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-cyan-300">Fill</span>
              </button>
            </div>
          </div>
        </div>

        {/* Security & Deployment Footer */}
        <div className="text-center text-[11px] text-slate-500">
          Encrypted with 256-bit TLS • ISO/IEC 19794-5 Biometric Privacy Standard
        </div>
      </div>
    </div>
  );
};

export default Login;
