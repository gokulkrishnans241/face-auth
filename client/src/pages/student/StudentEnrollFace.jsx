import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import CameraHUD, { playSuccessChime } from '../../components/face/CameraHUD';
import apiClient from '../../api/client';
import {
  Shield,
  CheckCircle,
  ScanFace,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Lock,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const StudentEnrollFace = () => {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(user?.biometricEnrolled ? 'status' : 'consent');
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [samplesCount, setSamplesCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleStartCapture = () => {
    if (!consentAgreed) {
      setError('You must accept the Biometric Data Privacy Agreement.');
      return;
    }
    setError('');
    setStep('capture');
  };

  const samplesRef = React.useRef([]);
  const lastCaptureRef = React.useRef(0);

  const handleSampleCaptured = async ({ embedding, personConfidence }) => {
    const now = Date.now();
    if (now - lastCaptureRef.current < 450 || submitting) return;
    if (!embedding || !Array.isArray(embedding) || embedding.length < 16) return;

    lastCaptureRef.current = now;
    samplesRef.current.push(embedding);
    const count = samplesRef.current.length;
    setSamplesCount(count);
    playSuccessChime();

    if (count >= 3) {
      setSubmitting(true);
      setError('');
      try {
        const numDims = embedding.length;
        const avgVec = new Array(numDims).fill(0);
        samplesRef.current.forEach((s) => {
          for (let i = 0; i < numDims; i++) avgVec[i] += s[i];
        });
        for (let i = 0; i < numDims; i++) avgVec[i] /= samplesRef.current.length;

        let normSq = 0;
        for (let i = 0; i < numDims; i++) normSq += avgVec[i] * avgVec[i];
        const norm = Math.sqrt(normSq) || 1;
        const normalizedAvg = avgVec.map((v) => parseFloat((v / norm).toFixed(5)));

        const res = await apiClient.post('/face/enroll', {
          facialEmbedding: normalizedAvg,
          biometricConsent: true,
          imageQualityScore: 0.98,
        });

        if (res.data.success) {
          playSuccessChime();
          confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
          setMessage('Your facial biometric profile has been successfully enrolled!');
          setStep('complete');
          refreshUser();
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error submitting biometric data.');
        samplesRef.current = [];
        setSamplesCount(0);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleResetBiometrics = async () => {
    if (!window.confirm('Are you sure you want to withdraw biometric consent and delete your stored face descriptor?')) {
      return;
    }
    try {
      const res = await apiClient.delete('/face/reset');
      if (res.data.success) {
        setMessage('Biometric profile deleted and consent withdrawn.');
        setStep('consent');
        setConsentAgreed(false);
        setSamplesCount(0);
        refreshUser();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error resetting profile.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl glass-panel text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
          <ScanFace className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white font-outfit">
          Self Biometric Face Enrollment
        </h1>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Enroll your facial biometric embedding to enable automatic check-in when entering assigned college classrooms
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-teal-950/80 border border-teal-500/30 text-xs text-teal-200 flex items-center justify-between">
          <span>{message}</span>
          <button onClick={() => setMessage('')} className="text-teal-400 font-bold">Dismiss</button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/80 border border-red-500/30 text-xs text-red-200">
          {error}
        </div>
      )}

      {/* Step 1: Active Status View */}
      {step === 'status' && (
        <div className="p-6 rounded-3xl glass-panel space-y-5 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-outfit">Biometric Profile is Active</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Your 128-d facial embedding is securely registered. You are eligible for automated camera attendance.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                setStep('capture');
                setSamplesCount(0);
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Re-Enroll Face
            </button>

            <button
              onClick={handleResetBiometrics}
              className="px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold"
            >
              Delete Biometric Profile
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Consent Form */}
      {step === 'consent' && (
        <div className="p-6 rounded-3xl glass-panel space-y-5">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-400" />
              <span>Biometric Consent Notice</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              In accordance with college data governance policies, your facial features are converted into a non-reversible numerical mathematical vector (embedding) for attendance authentication.
            </p>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
              <p>• Embeddings cannot be reverse-engineered to reconstruct raw photographs.</p>
              <p>• No third-party data sharing or external cloud profiling is performed.</p>
              <p>• You retain the right to delete your profile and revoke consent anytime.</p>
            </div>
          </div>

          <label className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-teal-500/40 transition-colors">
            <input
              type="checkbox"
              checked={consentAgreed}
              onChange={(e) => setConsentAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-teal-500 focus:ring-teal-400 bg-slate-950 border-slate-700"
            />
            <span className="text-xs text-slate-200">
              I agree to the collection and cryptographic storage of my facial embedding for attendance verification.
            </span>
          </label>

          <button
            onClick={handleStartCapture}
            disabled={!consentAgreed}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
          >
            <span>Proceed to Camera Capture</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Step 3: Camera Capture Stream */}
      {step === 'capture' && (
        <div className="p-6 rounded-3xl glass-panel space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white">
              Face Sample: <span className="text-teal-400 font-mono font-bold">{samplesCount} / 3</span>
            </span>
            <span className="text-[11px] text-slate-400">Keep face inside frame</span>
          </div>

          <CameraHUD
            active={true}
            scanning={true}
            onFaceDetected={handleSampleCaptured}
            matchFeedback={{
              success: samplesCount === 3,
              title: samplesCount === 3 ? 'Samples Processed' : 'Position face directly towards camera',
              subtitle: samplesCount < 3 ? 'Sampling biometric points...' : 'Generating 128-d descriptor...',
            }}
          />

          {submitting && (
            <div className="p-3 text-center text-xs text-teal-300 bg-teal-950/60 rounded-xl border border-teal-500/30">
              Saving biometric encryption to cloud database...
            </div>
          )}
        </div>
      )}

      {/* Step 4: Completion */}
      {step === 'complete' && (
        <div className="p-8 rounded-3xl glass-panel text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-white font-outfit">Registration Complete!</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Your facial recognition profile is now active across all 7 college classrooms.
          </p>
          <button
            onClick={() => setStep('status')}
            className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20"
          >
            View Profile Status
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentEnrollFace;
