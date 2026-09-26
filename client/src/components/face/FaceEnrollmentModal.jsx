import React, { useState, useRef } from 'react';
import Modal from '../common/Modal';
import CameraHUD, { playSuccessChime } from './CameraHUD';
import apiClient from '../../api/client';
import { Shield, Check, Sparkles, AlertCircle, RefreshCw, ScanFace } from 'lucide-react';
import confetti from 'canvas-confetti';

export const FaceEnrollmentModal = ({ isOpen, onClose, user, onEnrollmentComplete }) => {
  const [step, setStep] = useState('consent'); // 'consent' | 'capture' | 'complete'
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [samplesCount, setSamplesCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const collectedSamplesRef = useRef([]);
  const lastCaptureTimeRef = useRef(0);

  const targetName = user?.name || 'Student';
  const targetUserId = user?.userId || 'ID';

  const handleStartCapture = () => {
    if (!consentAgreed) {
      setError('You must accept the Biometric Data Processing Consent before proceeding.');
      return;
    }
    setError('');
    collectedSamplesRef.current = [];
    setSamplesCount(0);
    setStep('capture');
  };

  const handleSampleCaptured = ({ embedding, brightness }) => {
    const now = Date.now();
    // Space samples by at least 450ms so they represent distinct frames
    if (now - lastCaptureTimeRef.current < 450 || submitting) {
      return;
    }
    if (!embedding || !Array.isArray(embedding) || embedding.length < 16) {
      return;
    }

    lastCaptureTimeRef.current = now;
    collectedSamplesRef.current.push(embedding);
    const count = collectedSamplesRef.current.length;
    setSamplesCount(count);
    playSuccessChime();

    if (count >= 3) {
      // Average the 3 samples into a master biometric descriptor
      const numDims = embedding.length;
      const avgVec = new Array(numDims).fill(0);

      collectedSamplesRef.current.forEach((sample) => {
        for (let i = 0; i < numDims; i++) {
          avgVec[i] += sample[i];
        }
      });

      for (let i = 0; i < numDims; i++) {
        avgVec[i] /= collectedSamplesRef.current.length;
      }

      // L2 Normalize
      let normSq = 0;
      for (let i = 0; i < numDims; i++) normSq += avgVec[i] * avgVec[i];
      const norm = Math.sqrt(normSq) || 1;
      const normalizedAvg = avgVec.map((v) => parseFloat((v / norm).toFixed(5)));

      submitEnrollment(normalizedAvg);
    }
  };

  const submitEnrollment = async (embedding) => {
    setSubmitting(true);
    setError('');
    try {
      const res = await apiClient.post('/face/enroll', {
        userId: user?._id,
        facialEmbedding: embedding,
        biometricConsent: true,
        imageQualityScore: 0.98,
      });

      if (res.data.success) {
        playSuccessChime();
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
        setStep('complete');
        if (onEnrollmentComplete) onEnrollmentComplete();
      } else {
        setError(res.data.message || 'Enrollment failed.');
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Error communicating with server.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndRetry = () => {
    collectedSamplesRef.current = [];
    setSamplesCount(0);
    setError('');
    setStep('capture');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Biometric Facial Enrollment"
      subtitle={`Enrolling biometric profile for ${targetName} (${targetUserId})`}
      maxWidth="max-w-xl"
    >
      {step === 'consent' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs">
              <Shield className="w-4 h-4" />
              <span>COLLEGE BIOMETRIC DATA PRIVACY AGREEMENT</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              To automate your classroom attendance, the Smart Attendance System will convert your facial features into a mathematical 128-dimensional embedding vector.
            </p>
            <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc pl-4">
              <li>Raw facial photos are processed in your browser and not permanently stored.</li>
              <li>Encrypted embedding vectors are strictly restricted to classroom attendance identification.</li>
              <li>Each student must have a unique facial enrollment. Duplicate face registration across multiple accounts is rejected.</li>
            </ul>
          </div>

          <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer hover:border-teal-500/40 transition-colors">
            <input
              type="checkbox"
              checked={consentAgreed}
              onChange={(e) => {
                setConsentAgreed(e.target.checked);
                if (e.target.checked) setError('');
              }}
              className="mt-0.5 w-4 h-4 rounded text-teal-500 focus:ring-teal-400 bg-slate-950 border-slate-700"
            />
            <span className="text-xs text-slate-200 leading-snug">
              I grant explicit consent to store mathematical biometric representations for college attendance verification.
            </span>
          </label>

          {error && (
            <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/40 text-xs text-red-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleStartCapture}
              disabled={!consentAgreed}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Proceed to Camera Capture
            </button>
          </div>
        </div>
      )}

      {step === 'capture' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-slate-300 font-medium">
              Capturing unique optical samples: <span className="text-teal-400 font-bold font-mono">{samplesCount} / 3</span>
            </span>
            <span className="text-[11px] text-slate-400">Keep face steady in light</span>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-teal-400 h-1.5 transition-all duration-300"
              style={{ width: `${(samplesCount / 3) * 100}%` }}
            />
          </div>

          <CameraHUD
            active={isOpen && step === 'capture'}
            scanning={!submitting}
            onFaceDetected={handleSampleCaptured}
            matchFeedback={{
              success: samplesCount === 3,
              title: samplesCount === 3 ? 'Samples Verified!' : 'Position Face in Guide Frame',
              subtitle: samplesCount < 3 ? `Sample ${samplesCount + 1} of 3 • Open shutter and face camera` : 'Computing biometric vectors...',
            }}
          />

          {submitting && (
            <div className="flex items-center justify-center gap-2 p-3 text-xs text-teal-300 bg-teal-950/60 rounded-xl border border-teal-500/30">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Verifying biometric uniqueness & saving to cloud database...</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-2xl bg-red-950/80 border border-red-500/40 text-xs text-red-200 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <span className="leading-relaxed">{error}</span>
              </div>
              <button
                onClick={handleResetAndRetry}
                className="px-3 py-1 bg-red-900/80 hover:bg-red-800 text-white rounded-xl text-[11px] font-bold shrink-0 transition-colors"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'complete' && (
        <div className="py-6 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
            <Check className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white font-outfit">Biometric Profile Enrolled!</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Unique optical facial biometric features for <strong className="text-slate-200">{targetName}</strong> have been verified and permanently registered in the system.
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-colors"
          >
            Done & Return
          </button>
        </div>
      )}
    </Modal>
  );
};

export default FaceEnrollmentModal;
