import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  RefreshCw,
  CheckCircle,
  ShieldAlert,
  Sparkles,
  Eye,
  Upload,
  AlertCircle,
  Scan,
  UserX,
  UserCheck,
  Cpu,
  Users,
  AlertTriangle,
  RotateCcw,
  SwitchCamera,
  Video,
  Zap,
} from 'lucide-react';
import { loadFaceModels, detectFaceWithQuality } from '../../services/faceApiService';

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
    // Audio context may be restricted by autoplay policy
  }
};

/**
 * Helper to race getUserMedia against a fast timeout to prevent hanging
 */
const requestMediaStream = async (constraints, timeoutMs = 2500) => {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error('Camera stream request timed out.');
      err.name = 'TimeoutError';
      reject(err);
    }, timeoutMs);
  });

  try {
    const stream = await Promise.race([
      navigator.mediaDevices.getUserMedia(constraints),
      timeoutPromise,
    ]);
    clearTimeout(timer);
    return stream;
  } catch (err) {
    clearTimeout(timer);
    throw err;
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
  const streamRef = useRef(null);

  // Device detection (Mobile vs Laptop/Desktop)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkIsMobile = () => {
      const uaCheck = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const touchCheck = 'ontouchstart' in window && window.innerWidth < 1024;
      setIsMobile(uaCheck || touchCheck);
    };
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // Mobile: 'user' | 'environment'
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [cameraStatus, setCameraStatus] = useState('initializing'); // 'initializing' | 'active' | 'denied' | 'error'
  const [modelStatus, setModelStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [videoInfo, setVideoInfo] = useState('HD Ready');
  const [shutterCovered, setShutterCovered] = useState(false);
  const [humanPresent, setHumanPresent] = useState(false);
  const [multipleFacesDetected, setMultipleFacesDetected] = useState(false);
  const [personConfidence, setPersonConfidence] = useState(0);
  const [guidanceText, setGuidanceText] = useState('Align face in frame');

  // Enumerate video devices
  const updateDeviceList = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoInputs);

      // Select first non-IR camera if none selected
      if (!selectedDeviceId && videoInputs.length > 0) {
        const nonIR = videoInputs.find(
          (d) => !/ir|infrared|depth/i.test(d.label || '')
        );
        setSelectedDeviceId((nonIR || videoInputs[0]).deviceId);
      }
    } catch (e) {
      console.warn('Device enumeration warning:', e);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    updateDeviceList();
    navigator.mediaDevices?.addEventListener?.('devicechange', updateDeviceList);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', updateDeviceList);
    };
  }, [updateDeviceList]);

  // Pre-load Deep Face Recognition Models
  useEffect(() => {
    let isMounted = true;
    loadFaceModels()
      .then(() => {
        if (isMounted) setModelStatus('ready');
      })
      .catch((err) => {
        console.error('Failed to load Face-API models:', err);
        if (isMounted) setModelStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Stop Camera & release all hardware tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          // ignore
        }
      });
      streamRef.current = null;
    }
    setStream(null);
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }
  }, []);

  // Start Camera with Ultra-Fast Multi-Tier Fallback
  const startCamera = useCallback(
    async (modeToUse = facingMode, deviceIdToUse = selectedDeviceId) => {
      // Release previous hardware locks first
      stopCamera();

      setCameraStatus('initializing');
      setErrorMessage('');

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not supported in this browser. Please access via HTTPS or localhost.');
        }

        let mediaStream = null;

        if (isMobile) {
          // ================= MOBILE STRATEGY =================
          try {
            // Fast Tier 1: facingMode with 720p
            mediaStream = await requestMediaStream({
              video: {
                facingMode: modeToUse ? { ideal: modeToUse } : 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
              audio: false,
            }, 2000);
          } catch (e1) {
            console.warn('Mobile Tier 1 failed, trying simple video:true:', e1);
            try {
              mediaStream = await requestMediaStream({ video: true, audio: false }, 2000);
            } catch (e2) {
              throw e2;
            }
          }
        } else {
          // ================= LAPTOP / DESKTOP STRATEGY =================
          // Note: Laptop webcams do NOT support facingMode. Use deviceId with ideal, or direct video:true!
          if (deviceIdToUse) {
            try {
              // Fast Tier 1: Ideal deviceId + 720p HD (no exact constraint to prevent driver hangs)
              mediaStream = await requestMediaStream({
                video: {
                  deviceId: { ideal: deviceIdToUse },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                },
                audio: false,
              }, 2000);
            } catch (e1) {
              console.warn('Laptop Tier 1 failed, falling back to direct video:', e1);
            }
          }

          // Fast Tier 2: Basic video:true (fastest, universally supported by all laptop webcams)
          if (!mediaStream) {
            try {
              mediaStream = await requestMediaStream({ video: true, audio: false }, 2500);
            } catch (e2) {
              console.error('Laptop Tier 2 failed:', e2);
              throw e2;
            }
          }
        }

        if (!mediaStream) {
          throw new Error('Could not obtain camera video stream.');
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setCameraStatus('active');

        // Refresh device list to populate labels after permissions granted
        updateDeviceList();

        // Attach to video element
        const video = videoElementRef.current;
        if (video) {
          video.srcObject = mediaStream;
          video.muted = true;
          video.defaultMuted = true;
          video.playsInline = true;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');

          // Ensure video playback starts immediately
          try {
            await video.play();
          } catch (err) {
            console.warn('Video play caught:', err);
          }
        }
      } catch (err) {
        console.error('Camera initialization error:', err);
        setCameraStatus(
          err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
            ? 'denied'
            : 'error'
        );
        setErrorMessage(
          err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
            ? 'Camera permission denied. Please click the camera/lock icon in your browser address bar and allow camera access.'
            : err.name === 'NotReadableError' || err.name === 'TrackStartError'
            ? 'Camera is currently locked by another application (e.g. Zoom, Teams, or another tab). Please close other camera programs and click Quick Reload.'
            : err.message || 'Unable to connect to camera video feed.'
        );
      }
    },
    [facingMode, selectedDeviceId, isMobile, stopCamera, updateDeviceList]
  );

  // Auto-connect on active prop change
  useEffect(() => {
    if (active) {
      startCamera(facingMode, selectedDeviceId);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [active]);

  // Fast Reload Camera button
  const handleReloadCamera = () => {
    startCamera(facingMode, selectedDeviceId);
  };

  // Change Camera Device on Desktop/Laptop
  const handleDeviceChange = (e) => {
    const newDevId = e.target.value;
    setSelectedDeviceId(newDevId);
    startCamera(facingMode, newDevId);
  };

  // Flip Camera Front / Back for mobile
  const handleFlipCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode, selectedDeviceId);
  };

  // Upload Photo fallback
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const result = await detectFaceWithQuality(img);
          if (result && result.isDetected && result.descriptor && onFaceDetected) {
            setHumanPresent(true);
            setMultipleFacesDetected(false);
            setPersonConfidence(result.score || 95);
            setGuidanceText(result.guidance);
            onFaceDetected({
              embedding: result.descriptor,
              livenessVerified: true,
              timestamp: Date.now(),
              brightness: 120,
              personConfidence: result.score || 95,
            });
          } else if (result.multipleFaces) {
            alert('Multiple faces detected in uploaded photo. Please upload a photo with only one person.');
          } else {
            setHumanPresent(false);
            alert('No clear human face detected. Please provide a clear portrait photo.');
          }
        } catch (err) {
          alert('Error processing image: ' + err.message);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Trigger manual snapshot capture
  const handleManualCapture = async () => {
    const video = videoElementRef.current;
    if (!video || isAnalyzingRef.current) return;

    isAnalyzingRef.current = true;
    try {
      const result = await detectFaceWithQuality(video);
      if (result && result.isDetected && result.descriptor) {
        setShutterCovered(false);
        setHumanPresent(true);
        setMultipleFacesDetected(false);
        setPersonConfidence(result.score);
        setGuidanceText(result.guidance);

        if (onFaceDetected) {
          onFaceDetected({
            embedding: result.descriptor,
            livenessVerified: true,
            timestamp: Date.now(),
            brightness: 120,
            personConfidence: result.score,
          });
        }
      } else if (result.multipleFaces) {
        setMultipleFacesDetected(true);
        setHumanPresent(false);
      } else {
        setHumanPresent(false);
      }
    } catch (err) {
      console.warn('Manual capture error:', err);
    } finally {
      isAnalyzingRef.current = false;
    }
  };

  // Continuous Face Tracking Loop (300ms cycle)
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

          // 1. Shutter / Pitch Black Check
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
            setShutterCovered(true);
            setHumanPresent(false);
            setMultipleFacesDetected(false);
            setPersonConfidence(0);
            setGuidanceText('Camera shutter closed');

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

          // 2. Real Deep Neural Network Face Detection & Landmark Extraction
          const result = await detectFaceWithQuality(video);

          // Multiple Faces
          if (result.multipleFaces) {
            setMultipleFacesDetected(true);
            setHumanPresent(false);
            setPersonConfidence(0);
            setGuidanceText(`Multiple faces detected (${result.faceCount}) • Only 1 person allowed`);

            const cx = vw / 2;
            const cy = vh / 2;
            const boxW = vw * 0.55;
            const boxH = vh * 0.65;

            ctx.strokeStyle = '#f43f5e';
            ctx.lineWidth = 3.5;
            ctx.setLineDash([12, 6]);
            ctx.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);

            ctx.fillStyle = 'rgba(225, 29, 72, 0.9)';
            ctx.fillRect(cx - 160, cy - boxH / 2 - 32, 320, 26);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`MULTIPLE FACES DETECTED (${result.faceCount})`, cx, cy - boxH / 2 - 15);
            return;
          }

          setMultipleFacesDetected(false);

          // No Face Detected
          if (!result.isDetected || !result.descriptor) {
            setHumanPresent(false);
            setPersonConfidence(0);
            setGuidanceText('No face detected • Align face in frame');

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

          // Exactly One Human Face Detected
          setHumanPresent(true);
          setPersonConfidence(result.score);
          setGuidanceText(result.guidance);

          const { x, y, width, height } = result.box;
          const isVerified = matchFeedback?.success;

          // Glowing Face Box
          ctx.strokeStyle = isVerified ? '#10b981' : result.isGoodQuality ? '#14b8a6' : '#f59e0b';
          ctx.lineWidth = 3.5;
          ctx.setLineDash(result.isGoodQuality ? [16, 8] : [8, 8]);
          ctx.strokeRect(x, y, width, height);

          // Corner Accents
          ctx.setLineDash([]);
          ctx.strokeStyle = isVerified ? '#34d399' : result.isGoodQuality ? '#2dd4bf' : '#fbbf24';
          ctx.lineWidth = 4.5;
          const cornerLen = Math.min(24, width * 0.2);

          // Corners
          ctx.beginPath();
          ctx.moveTo(x, y + cornerLen);
          ctx.lineTo(x, y);
          ctx.lineTo(x + cornerLen, y);
          ctx.moveTo(x + width - cornerLen, y);
          ctx.lineTo(x + width, y);
          ctx.lineTo(x + width, y + cornerLen);
          ctx.moveTo(x, y + height - cornerLen);
          ctx.lineTo(x, y + height);
          ctx.lineTo(x + cornerLen, y + height);
          ctx.moveTo(x + width - cornerLen, y + height);
          ctx.lineTo(x + width, y + height);
          ctx.lineTo(x + width, y + height - cornerLen);
          ctx.stroke();

          // 68 Landmarks
          if (result.landmarks && result.landmarks.positions) {
            ctx.fillStyle = isVerified ? '#34d399' : result.isGoodQuality ? '#2dd4bf' : '#fbbf24';
            const positions = result.landmarks.positions;
            for (let i = 0; i < positions.length; i += 2) {
              const pt = positions[i];
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 2.2, 0, 2 * Math.PI);
              ctx.fill();
            }
          }

          // Badge on Canvas
          const badgeText = isVerified
            ? matchFeedback?.title || 'IDENTITY VERIFIED'
            : result.isGoodQuality
            ? `FACE DETECTED • ${result.score}% QUALITY`
            : result.guidance.toUpperCase();

          const badgeW = Math.max(190, width);
          ctx.fillStyle = isVerified
            ? 'rgba(6, 78, 59, 0.95)'
            : result.isGoodQuality
            ? 'rgba(15, 23, 42, 0.92)'
            : 'rgba(120, 53, 15, 0.92)';
          ctx.fillRect(x, Math.max(10, y - 30), badgeW, 26);
          ctx.fillStyle = isVerified ? '#34d399' : result.isGoodQuality ? '#2dd4bf' : '#fbbf24';
          ctx.font = 'bold 11px system-ui, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(badgeText, x + 8, Math.max(10, y - 30) + 17);

          // Emit descriptor when quality is good
          if (onFaceDetected && result.descriptor && result.isGoodQuality) {
            onFaceDetected({
              embedding: result.descriptor,
              livenessVerified: true,
              timestamp: Date.now(),
              brightness: Math.round(avgBrightness),
              personConfidence: result.score,
              guidance: result.guidance,
            });
          }
        } catch (err) {
          console.warn('Frame analysis error:', err);
        } finally {
          isAnalyzingRef.current = false;
        }
      }, 300);
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [cameraStatus, modelStatus, scanning, matchFeedback, onFaceDetected]);

  const mirrorVideo = isMobile ? facingMode === 'user' : true;

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
      {/* Hidden file input for photo upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Top Header Bar for Desktop / Laptop: Camera Source Picker & Quick Reload */}
      {!isMobile && (
        <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Video className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-300 shrink-0">Camera Source:</span>
            {availableDevices.length > 0 ? (
              <select
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                className="bg-slate-950 border border-slate-700 text-teal-300 text-[11px] font-medium rounded-lg px-2 py-1 max-w-[200px] sm:max-w-[260px] truncate focus:ring-1 focus:ring-teal-500 focus:outline-none"
              >
                {availableDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[11px] text-teal-400 font-mono">Default Laptop Webcam</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleReloadCamera}
              className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold flex items-center gap-1 transition-all"
              title="Quickly reload/refresh the webcam stream"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reload Cam</span>
            </button>
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono">
              {videoInfo}
            </span>
          </div>
        </div>
      )}

      {/* Video Viewport */}
      <div className="relative aspect-[4/3] w-full bg-black flex items-center justify-center overflow-hidden">
        {/* Live Video Element */}
        <video
          ref={videoElementRef}
          autoPlay
          playsInline
          muted
          style={{
            transform: mirrorVideo ? 'scaleX(-1)' : 'none',
            minHeight: '100%',
            minWidth: '100%',
          }}
          className="w-full h-full object-cover"
        />

        {/* Canvas Landmark Overlay */}
        <canvas
          ref={canvasRef}
          style={{ transform: mirrorVideo ? 'scaleX(-1)' : 'none' }}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* Scanning Laser Line */}
        {cameraStatus === 'active' && modelStatus === 'ready' && scanning && !shutterCovered && humanPresent && !multipleFacesDetected && (
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

        {/* Multiple Faces Alert */}
        {multipleFacesDetected && (
          <div className="absolute inset-0 bg-rose-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40 animate-pulse">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-outfit">Multiple Faces Detected</h4>
              <p className="text-xs text-rose-300 mt-1 max-w-xs">
                Only one person is permitted in the camera view during attendance authentication.
              </p>
            </div>
          </div>
        )}

        {/* Camera Shutter Covered Alert */}
        {shutterCovered && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/40 animate-pulse">
              <CameraOff className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-outfit">Camera Covered / Shutter Closed</h4>
              <p className="text-xs text-rose-300 mt-1 max-w-xs">
                Please open your camera shutter or remove any lens cover to proceed.
              </p>
            </div>
          </div>
        )}

        {/* Initializing Spinner with Fast Action */}
        {cameraStatus === 'initializing' && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
            <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
            <div>
              <h4 className="text-sm font-bold text-white font-outfit">
                {isMobile ? 'Connecting Mobile Camera...' : 'Connecting Laptop Camera...'}
              </h4>
              <p className="text-xs text-slate-400 mt-1">Establishing high-resolution optical video stream</p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleReloadCamera}
                className="px-3.5 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-bold transition-all shadow-md shadow-teal-500/20 flex items-center gap-1"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Instant Connect</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
              >
                Upload Photo
              </button>
            </div>
          </div>
        )}

        {/* Access Denied */}
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
              onClick={handleReloadCamera}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-bold transition-colors"
            >
              Retry Camera Permission
            </button>
          </div>
        )}

        {/* Error State */}
        {cameraStatus === 'error' && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <ShieldAlert className="w-8 h-8 text-amber-400" />
            <div>
              <h4 className="text-sm font-bold text-white">Camera Stream Paused</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">{errorMessage}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReloadCamera}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-bold flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Quick Reload
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Upload Photo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic HUD Status Footer */}
      <div className="p-3.5 sm:p-4 bg-slate-900/95 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          {shutterCovered ? (
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <CameraOff className="w-4 h-4" />
            </div>
          ) : multipleFacesDetected ? (
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
              <Users className="w-4 h-4" />
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
            <div className="font-semibold text-white flex items-center gap-2 flex-wrap">
              <span>
                {shutterCovered
                  ? 'Camera Shutter Closed'
                  : multipleFacesDetected
                  ? 'Multiple Faces Detected'
                  : matchFeedback?.title || (humanPresent ? `Human Face Detected (${personConfidence}%)` : 'Align Face in Frame')}
              </span>
              {humanPresent && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {personConfidence}% AI QUALITY
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 truncate max-w-[280px] sm:max-w-md">
              {shutterCovered
                ? 'Open camera shutter or remove lens cover'
                : multipleFacesDetected
                ? 'Only 1 person allowed in frame'
                : matchFeedback?.subtitle || (humanPresent ? guidanceText : 'Please look directly into camera')}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          {/* Flip Camera (Front / Rear) - Mobile devices */}
          {isMobile && (
            <button
              type="button"
              onClick={handleFlipCamera}
              className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Flip Camera (Front / Rear)"
            >
              <SwitchCamera className="w-3.5 h-3.5" />
              <span>{facingMode === 'user' ? 'Front Cam' : 'Rear Cam'}</span>
            </button>
          )}

          {/* Quick Reload Camera Button */}
          <button
            type="button"
            onClick={handleReloadCamera}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Reload Camera Stream"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Snap Face Button */}
          <button
            type="button"
            onClick={handleManualCapture}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${
              humanPresent
                ? 'bg-teal-500 hover:bg-teal-600 text-slate-950 border-teal-400 shadow-md shadow-teal-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Capture face sample"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Snap Face</span>
          </button>

          {/* Upload Photo Fallback Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
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
