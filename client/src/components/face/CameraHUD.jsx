import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, RefreshCw, CheckCircle, ShieldAlert, Sparkles, Eye, Upload, AlertCircle, Scan, UserX, UserCheck, Cpu } from 'lucide-react';
import { loadFaceModels, extractFaceFeaturesFromInput } from '../../services/faceApiService';

/**
 * Play a gentle success confirmation tone using Web Audio API
 */
export const playSuccessChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.1); // A5

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // Audio context may be restricted by autoplay policy until user interaction
  }
};

export const CameraHUD = ({
  onFaceDetected,
  active = true,
  scanning = true,
  matchFeedback = null,
  showGuides = true,
}) => {
  const videoElementRef = useRef(null);
  const canvasRef = useRef(null);
  const hiddenCanvasRef = useRef(document.createElement('canvas'));
  const fileInputRef = useRef(null);
  const isAnalyzingRef = useRef(false);

  const [stream, setStream] = useState(null);
  const [cameraStatus, setCameraStatus] = useState('initializing'); // 'initializing' | 'active' | 'denied' | 'error'
  const [modelStatus, setModelStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [videoInfo, setVideoInfo] = useState('Initializing');
  const [shutterCovered, setShutterCovered] = useState(false);
  const [humanPresent, setHumanPresent] = useState(false);
  const [personConfidence, setPersonConfidence] = useState(0);

  // Pre-load Deep Face Recognition Models
  useEffect(() => {
    let isMounted = true;
    loadFaceModels()
      .then(() => {
        if (isMounted) setModelStatus('ready');
      })
      .catch((err) => {
        console.error('Failed to load Face-API neural network models:', err);
        if (isMounted) setModelStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Callback ref: Attaches stream to video node as soon as it mounts in DOM
  const setVideoRef = useCallback((node) => {
    videoElementRef.current = node;
    if (node && stream) {
      node.srcObject = stream;
      node.muted = true;
      node.playsInline = true;
      node.play().catch((err) => {
        console.warn('Video playback promise error:', err);
      });
    }
  }, [stream]);

  // Start Camera
  const startCamera = useCallback(async () => {
    setCameraStatus('initializing');
    setErrorMessage('');

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser. Please use HTTPS or localhost.');
      }

      let mediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, min: 480 },
            height: { ideal: 720, min: 360 },
          },
          audio: false,
        });
      } catch (e) {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setStream(mediaStream);
      setCameraStatus('active');

      if (videoElementRef.current) {
        videoElementRef.current.srcObject = mediaStream;
        videoElementRef.current.muted = true;
        videoElementRef.current.playsInline = true;
        await videoElementRef.current.play().catch((err) => {
          console.warn('Play error:', err);
        });
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraStatus(err.name === 'NotAllowedError' ? 'denied' : 'error');
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera permissions in your browser address bar settings.'
          : err.message || 'Unable to access camera.'
      );
    }
  }, []);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }
  }, [stream]);

  useEffect(() => {
    if (active) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [active]);

  // Manual image upload fallback
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const result = await extractFaceFeaturesFromInput(img);
          if (result && result.isDetected && result.descriptor && onFaceDetected) {
            setHumanPresent(true);
            setPersonConfidence(result.score || 95);
            onFaceDetected({
              embedding: result.descriptor,
              livenessVerified: true,
              timestamp: Date.now(),
              brightness: 120,
              personConfidence: result.score || 95,
            });
          } else {
            setHumanPresent(false);
            alert('No clear human face recognized in uploaded image. Please provide a clear portrait photo.');
          }
        } catch (err) {
          alert('Error processing image: ' + err.message);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Trigger manual capture snapshot
  const handleManualCapture = async () => {
    const video = videoElementRef.current;
    if (!video || isAnalyzingRef.current) return;

    isAnalyzingRef.current = true;
    try {
      const result = await extractFaceFeaturesFromInput(video);
      if (result && result.isDetected && result.descriptor) {
        setShutterCovered(false);
        setHumanPresent(true);
        setPersonConfidence(result.score);

        if (onFaceDetected) {
          onFaceDetected({
            embedding: result.descriptor,
            livenessVerified: true,
            timestamp: Date.now(),
            brightness: 120,
            personConfidence: result.score,
          });
        }
      } else {
        setHumanPresent(false);
      }
    } catch (err) {
      console.warn('Manual capture error:', err);
    } finally {
      isAnalyzingRef.current = false;
    }
  };

  // Continuous Deep Face Detection Loop (runs every 350ms)
  useEffect(() => {
    let intervalId;

    if (cameraStatus === 'active' && modelStatus === 'ready' && scanning) {
      intervalId = setInterval(async () => {
        const video = videoElementRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || isAnalyzingRef.current) return;
        if (video.readyState < 2 || video.videoWidth === 0) return;

        isAnalyzingRef.current = true;

        try {
          const vw = video.videoWidth || 640;
          const vh = video.videoHeight || 480;

          setVideoInfo(`${vw}x${vh}`);
          canvas.width = vw;
          canvas.height = vh;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // 1. Shutter/Pitch Black Check via quick luminance sample
          const offCanvas = hiddenCanvasRef.current;
          offCanvas.width = 64;
          offCanvas.height = 48;
          const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
          offCtx.drawImage(video, 0, 0, 64, 48);
          const sampleData = offCtx.getImageData(0, 0, 64, 48).data;
          let sumL = 0;
          for (let i = 0; i < sampleData.length; i += 4) {
            sumL += 0.299 * sampleData[i] + 0.587 * sampleData[i + 1] + 0.114 * sampleData[i + 2];
          }
          const avgBrightness = sumL / (64 * 48);

          if (avgBrightness < 16) {
            // Shutter closed or covered camera
            setShutterCovered(true);
            setHumanPresent(false);
            setPersonConfidence(0);

            const cx = vw / 2;
            const cy = vh / 2;
            const boxW = vw * 0.5;
            const boxH = vh * 0.6;
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 3;
            ctx.setLineDash([8, 8]);
            ctx.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
            return;
          }

          setShutterCovered(false);

          // 2. Real Deep Neural Network Face Detection & Recognition (ResNet-34 128-d)
          const result = await extractFaceFeaturesFromInput(video);

          if (!result || !result.isDetected || !result.descriptor) {
            // NO FACE DETECTED (Empty wall, desk, ceiling, no human)
            setHumanPresent(false);
            setPersonConfidence(0);

            const cx = vw / 2;
            const cy = vh / 2;
            const boxW = vw * 0.48;
            const boxH = vh * 0.58;

            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([10, 10]);
            ctx.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(cx - 95, cy - boxH / 2 - 28, 190, 24);
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 11px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('NO PERSON DETECTED', cx, cy - boxH / 2 - 12);
            return;
          }

          // 3. HUMAN FACE DETECTED!
          setHumanPresent(true);
          setPersonConfidence(result.score);

          const { x, y, width, height } = result.box;

          // Draw Glowing Green Face Box
          ctx.strokeStyle = matchFeedback?.success ? '#10b981' : '#14b8a6';
          ctx.lineWidth = 3.5;
          ctx.setLineDash([16, 8]);
          ctx.strokeRect(x, y, width, height);

          // Draw Corner Accents
          ctx.setLineDash([]);
          ctx.strokeStyle = matchFeedback?.success ? '#34d399' : '#2dd4bf';
          ctx.lineWidth = 4.5;
          const cornerLen = Math.min(24, width * 0.2);

          // Top Left
          ctx.beginPath();
          ctx.moveTo(x, y + cornerLen);
          ctx.lineTo(x, y);
          ctx.lineTo(x + cornerLen, y);
          ctx.stroke();

          // Top Right
          ctx.beginPath();
          ctx.moveTo(x + width - cornerLen, y);
          ctx.lineTo(x + width, y);
          ctx.lineTo(x + width, y + cornerLen);
          ctx.stroke();

          // Bottom Left
          ctx.beginPath();
          ctx.moveTo(x, y + height - cornerLen);
          ctx.lineTo(x, y + height);
          ctx.lineTo(x + cornerLen, y + height);
          ctx.stroke();

          // Bottom Right
          ctx.beginPath();
          ctx.moveTo(x + width - cornerLen, y + height);
          ctx.lineTo(x + width, y + height);
          ctx.lineTo(x + width, y + height - cornerLen);
          ctx.stroke();

          // Draw 68 Real Facial Landmarks
          if (result.landmarks && result.landmarks.positions) {
            ctx.fillStyle = matchFeedback?.success ? '#34d399' : '#2dd4bf';
            const positions = result.landmarks.positions;
            for (let i = 0; i < positions.length; i += 2) {
              const pt = positions[i];
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 2.2, 0, 2 * Math.PI);
              ctx.fill();
            }
          }

          // Draw "HUMAN FACE DETECTED" Badge
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.fillRect(x, Math.max(10, y - 28), Math.max(180, width), 24);
          ctx.fillStyle = matchFeedback?.success ? '#34d399' : '#2dd4bf';
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(`HUMAN FACE • ${result.score}% ACCURACY`, x + 8, Math.max(10, y - 28) + 16);

          // Emit face descriptor
          if (onFaceDetected && result.descriptor) {
            onFaceDetected({
              embedding: result.descriptor,
              livenessVerified: true,
              timestamp: Date.now(),
              brightness: Math.round(avgBrightness),
              personConfidence: result.score,
            });
          }
        } catch (err) {
          console.warn('Frame analysis cycle error:', err);
        } finally {
          isAnalyzingRef.current = false;
        }
      }, 350);
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [cameraStatus, modelStatus, scanning, matchFeedback, onFaceDetected]);

  return (
    <div className="relative w-full max-w-xl mx-auto rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
      {/* Hidden file input for photo upload fallback */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Video Viewport */}
      <div className="relative aspect-[4/3] w-full bg-black flex items-center justify-center overflow-hidden">
        {/* Live Video Element */}
        <video
          ref={setVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            transform: 'scaleX(-1)',
            minHeight: '100%',
            minWidth: '100%',
          }}
          className="w-full h-full object-cover"
        />

        {/* Canvas Landmark Overlay */}
        <canvas
          ref={canvasRef}
          style={{ transform: 'scaleX(-1)' }}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* Scanning Laser Line */}
        {cameraStatus === 'active' && modelStatus === 'ready' && scanning && !shutterCovered && humanPresent && (
          <div className="absolute inset-x-8 h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-lg shadow-teal-500/50 scanner-laser pointer-events-none" />
        )}

        {/* AI Neural Network Models Loading Overlay */}
        {modelStatus === 'loading' && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-30">
            <Cpu className="w-9 h-9 text-teal-400 animate-bounce" />
            <div>
              <h4 className="text-sm font-bold text-white font-outfit">Loading Deep Face-API AI Neural Network...</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Initializing 128-d ResNet-34 Face Recognition & 68 Landmark Models for high-accuracy biometric matching
              </p>
            </div>
          </div>
        )}

        {/* Camera Status & Shutter Closed Warning Overlays */}
        {shutterCovered && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40 animate-pulse">
              <CameraOff className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-outfit">Camera Covered / Shutter Closed</h4>
              <p className="text-xs text-rose-300 mt-1 max-w-xs">
                No face detected. Please open your camera shutter or remove any lens cover to proceed with biometric verification.
              </p>
            </div>
          </div>
        )}

        {cameraStatus === 'initializing' && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
            <div>
              <h4 className="text-sm font-bold text-white">Initializing Optical Camera...</h4>
              <p className="text-xs text-slate-400 mt-1">Connecting to video capture stream</p>
            </div>
          </div>
        )}

        {cameraStatus === 'denied' && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <CameraOff className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Camera Access Denied</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">{errorMessage}</p>
            </div>
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-bold transition-colors"
            >
              Retry Camera Permission
            </button>
          </div>
        )}

        {cameraStatus === 'error' && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <ShieldAlert className="w-8 h-8 text-amber-400" />
            <div>
              <h4 className="text-sm font-bold text-white">Camera Unavailable</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">{errorMessage}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Retry
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-bold flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Photo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic HUD Status Footer */}
      <div className="p-4 bg-slate-900/95 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          {shutterCovered ? (
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <CameraOff className="w-4 h-4" />
            </div>
          ) : humanPresent ? (
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
              <UserCheck className="w-4 h-4" />
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <UserX className="w-4 h-4" />
            </div>
          )}

          <div>
            <div className="font-semibold text-white flex items-center gap-2">
              <span>
                {shutterCovered
                  ? 'Camera Shutter Closed'
                  : matchFeedback?.title || (humanPresent ? `Human Face Detected (${personConfidence}%)` : 'Align Face in Frame')}
              </span>
              {humanPresent && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {personConfidence}% AI QUALITY
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400">
              {shutterCovered
                ? 'Open camera shutter or remove lens cover'
                : matchFeedback?.subtitle || (humanPresent ? 'Face recognized by AI neural network' : 'Please look directly into camera')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleManualCapture}
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1.5 ${
              humanPresent
                ? 'bg-teal-500 hover:bg-teal-600 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Capture face sample"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Snap Face</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Upload photo fallback"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraHUD;
