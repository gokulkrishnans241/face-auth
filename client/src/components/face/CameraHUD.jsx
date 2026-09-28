import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  RefreshCw,
  CheckCircle,
  ShieldAlert,
  Sparkles,
  Eye,
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
  HelpCircle,
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
 * Timeout helper to prevent getUserMedia from hanging indefinitely on Windows DirectShow/MediaFoundation
 */
const getUserMediaWithTimeout = (constraints, timeoutMs = 5000) => {
  return new Promise(async (resolve, reject) => {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      reject(new Error(`Camera request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        clearTimeout(timer);
        return reject(new Error('Browser does not support navigator.mediaDevices.getUserMedia'));
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      clearTimeout(timer);
      if (timedOut) {
        // If stream arrived after timeout, release all tracks immediately
        mediaStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (e) {}
        });
      } else {
        resolve(mediaStream);
      }
    } catch (err) {
      clearTimeout(timer);
      if (!timedOut) {
        reject(err);
      }
    }
  });
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
  const isAnalyzingRef = useRef(false);
  const isStartingRef = useRef(false);
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
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  // Enumerate video devices and identify physical cameras
  const updateDeviceList = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoInputs);

      // If user hasn't selected a device yet and we find devices with labels
      if (!selectedDeviceId && videoInputs.length > 0) {
        // Find best physical camera (Integrated / HD / Webcam / Front)
        const preferred = videoInputs.find((d) => {
          const label = (d.label || '').toLowerCase();
          return (
            label.includes('integrated') ||
            label.includes('internal') ||
            label.includes('hd') ||
            label.includes('webcam') ||
            label.includes('front') ||
            label.includes('camera')
          );
        });
        if (preferred && preferred.deviceId) {
          setSelectedDeviceId(preferred.deviceId);
        }
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

  // Pre-load Deep Face Recognition Models in background
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

  // Multi-tier Adaptive Stream Acquisition Strategy
  const acquireStream = async (modeToUse, deviceIdToUse) => {
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window && window.innerWidth < 1024);

    // ==========================================
    // MOBILE STRATEGY
    // ==========================================
    if (isMobileDevice) {
      // Mobile Tier 1: facingMode 'user' / 'environment'
      try {
        console.log('Mobile Camera Strategy 1: facingMode', modeToUse || 'user');
        return await getUserMediaWithTimeout({
          video: { facingMode: modeToUse ? { ideal: modeToUse } : 'user' },
          audio: false,
        }, 4000);
      } catch (e1) {
        console.warn('Mobile Strategy 1 failed, trying unconstrained video: true...', e1);
      }

      // Mobile Tier 2: Unconstrained video
      try {
        return await getUserMediaWithTimeout({ video: true, audio: false }, 3500);
      } catch (e2) {
        console.warn('Mobile Strategy 2 failed, trying safe VGA...', e2);
      }

      // Mobile Tier 3: Standard VGA
      return await getUserMediaWithTimeout({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      }, 3500);
    }

    // ==========================================
    // LAPTOP / DESKTOP STRATEGY (Windows / macOS / Linux)
    // ==========================================
    // Laptop Tier 1: Explicit deviceId (if user selected a specific camera from dropdown)
    if (deviceIdToUse) {
      try {
        console.log('Laptop Camera Strategy 1: Explicit deviceId', deviceIdToUse);
        return await getUserMediaWithTimeout({
          video: { deviceId: { exact: deviceIdToUse } },
          audio: false,
        }, 4000);
      } catch (eDevExact) {
        try {
          return await getUserMediaWithTimeout({
            video: { deviceId: { ideal: deviceIdToUse } },
            audio: false,
          }, 3500);
        } catch (eDevIdeal) {
          console.warn('Explicit deviceId failed, falling back to standard video...', eDevIdeal);
        }
      }
    }

    // Laptop Tier 2: Standard Laptop HD / High-Resolution (1280x720)
    try {
      console.log('Laptop Camera Strategy 2: High Resolution 720p/1080p');
      return await getUserMediaWithTimeout({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
        },
        audio: false,
      }, 4000);
    } catch (eHD) {
      console.warn('Laptop Strategy 2 (HD) failed, trying direct unconstrained video: true...', eHD);
    }

    // Laptop Tier 3: Pure Unconstrained Native { video: true } (Zero-constraint, universal W3C call)
    try {
      console.log('Laptop Camera Strategy 3: Pure video: true');
      return await getUserMediaWithTimeout({
        video: true,
        audio: false,
      }, 4000);
    } catch (eTrue) {
      console.warn('Laptop Strategy 3 (video: true) failed, trying safe VGA 640x480...', eTrue);
    }

    // Laptop Tier 4: Safe Standard VGA 640x480
    try {
      console.log('Laptop Camera Strategy 4: VGA 640x480');
      return await getUserMediaWithTimeout({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      }, 3500);
    } catch (eVGA) {
      console.warn('Laptop Strategy 4 (VGA) failed, trying facingMode user...', eVGA);
    }

    // Laptop Tier 5: facingMode fallback
    try {
      console.log('Laptop Camera Strategy 5: facingMode user');
      return await getUserMediaWithTimeout({
        video: { facingMode: 'user' },
        audio: false,
      }, 3500);
    } catch (eFacing) {
      console.warn('Laptop Strategy 5 (facingMode) failed, trying minimum baseline...', eFacing);
    }

    // Laptop Tier 6: Minimum Baseline 320x240
    return await getUserMediaWithTimeout({
      video: { width: { ideal: 320 }, height: { ideal: 240 } },
      audio: false,
    }, 3000);
  };

  // Start Camera with Concurrency Protection & Auto-Retry
  const startCamera = useCallback(
    async (modeToUse = facingMode, deviceIdToUse = selectedDeviceId, force = false) => {
      if (isStartingRef.current && !force) return;
      isStartingRef.current = true;

      stopCamera();
      // Brief pause to allow OS hardware driver to release lock
      await new Promise((resolve) => setTimeout(resolve, 80));

      setCameraStatus('initializing');
      setErrorMessage('');

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera API not supported in this browser. Please access via HTTPS or localhost.');
        }

        const mediaStream = await acquireStream(modeToUse, deviceIdToUse);

        if (!mediaStream) {
          throw new Error('Could not obtain camera video stream.');
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);
        setCameraStatus('active');

        updateDeviceList();

        const video = videoElementRef.current;
        if (video) {
          video.srcObject = mediaStream;
          video.muted = true;
          video.defaultMuted = true;
          video.playsInline = true;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');
          video.setAttribute('autoplay', 'true');

          const markReady = () => {
            setCameraStatus('active');
            if (video.videoWidth && video.videoHeight) {
              setVideoInfo(`${video.videoWidth}x${video.videoHeight}`);
            }
          };

          video.onloadedmetadata = markReady;
          video.onloadeddata = markReady;
          video.oncanplay = markReady;

          try {
            await video.play();
            markReady();
          } catch (err) {
            console.warn('Video play warning:', err);
            setCameraStatus('active');
          }
        }
      } catch (err) {
        console.error('Camera initialization error:', err);
        const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
        setCameraStatus(isDenied ? 'denied' : 'error');

        if (isDenied) {
          setErrorMessage(
            'Camera permission blocked in browser. Click the lock/camera icon next to the URL address bar and change Camera to "Allow".'
          );
        } else {
          setErrorMessage(
            err.message || 'Unable to connect to camera. Please make sure no other application (Zoom, Teams, or another tab) is holding the webcam.'
          );
        }
      } finally {
        isStartingRef.current = false;
      }
    },
    [facingMode, selectedDeviceId, stopCamera, updateDeviceList]
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

  // Ensure video element receives stream whenever stream state updates
  useEffect(() => {
    const video = videoElementRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('autoplay', 'true');

      const markActive = () => {
        setCameraStatus('active');
        if (video.videoWidth && video.videoHeight) {
          setVideoInfo(`${video.videoWidth}x${video.videoHeight}`);
        }
      };

      video.onloadedmetadata = markActive;
      video.onloadeddata = markActive;
      video.oncanplay = markActive;

      video.play().then(markActive).catch((err) => {
        console.warn('Auto-play stream warning:', err);
        setCameraStatus('active');
      });
    }
  }, [stream]);

  // Force Reload Camera button
  const handleReloadCamera = () => {
    startCamera(facingMode, selectedDeviceId, true);
  };

  // Change Camera Device on Desktop/Laptop
  const handleDeviceChange = (e) => {
    const newDevId = e.target.value;
    setSelectedDeviceId(newDevId);
    startCamera(facingMode, newDevId, true);
  };

  // Flip Camera Front / Back for mobile
  const handleFlipCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode, selectedDeviceId, true);
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

  // Continuous Face Tracking Loop (250ms cycle)
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
      }, 250);
    }

    return () => {
      clearInterval(intervalId);
    };
  }, [cameraStatus, modelStatus, scanning, matchFeedback, onFaceDetected]);

  const mirrorVideo = isMobile ? facingMode === 'user' : true;

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
      {/* Top Header Bar for Desktop / Laptop: Camera Source Picker & Quick Controls */}
      {!isMobile && (
        <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Video className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="text-[11px] font-semibold text-slate-300 shrink-0">Webcam:</span>
            {availableDevices.length > 0 ? (
              <select
                value={selectedDeviceId}
                onChange={handleDeviceChange}
                className="bg-slate-950 border border-slate-700 text-teal-300 text-[11px] font-medium rounded-lg px-2 py-1 max-w-[180px] sm:max-w-[240px] truncate focus:ring-1 focus:ring-teal-500 focus:outline-none"
              >
                <option value="">Auto-Detect Default Camera</option>
                {availableDevices.map((d, i) => (
                  <option key={d.deviceId || i} value={d.deviceId}>
                    {d.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[11px] text-teal-400 font-mono">Integrated Camera</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleReloadCamera}
              className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-bold flex items-center gap-1 transition-all"
              title="Force reload the webcam stream"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Turn On / Reload</span>
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

        {/* Non-blocking AI Models Warming Up Badge (Allows user to see camera immediately!) */}
        {modelStatus === 'loading' && cameraStatus === 'active' && (
          <div className="absolute top-3 left-3 bg-slate-900/90 border border-teal-500/40 text-teal-300 px-3 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-2 shadow-lg backdrop-blur-sm z-20 animate-pulse">
            <Cpu className="w-3.5 h-3.5 text-teal-400" />
            <span>AI Recognition Engine Warming Up...</span>
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
                Please open your camera privacy slider/shutter or remove lens cover to proceed.
              </p>
            </div>
          </div>
        )}

        {/* Initializing / Click-to-Start View */}
        {cameraStatus === 'initializing' && !stream && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-4 z-20">
            <div className="w-14 h-14 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <Camera className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-outfit">
                {isMobile ? 'Connecting Mobile Camera...' : 'Activating Laptop Camera...'}
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Click the button below to turn on your webcam and grant browser permission.
              </p>
            </div>

            <div className="pt-2 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => startCamera(facingMode, selectedDeviceId, true)}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-teal-500/30 flex items-center gap-2 active:scale-95"
              >
                <Zap className="w-4 h-4" />
                <span>🟢 Click to Turn On Camera</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                className="text-[11px] text-teal-400/80 hover:text-teal-300 underline flex items-center gap-1 mt-1"
              >
                <HelpCircle className="w-3 h-3" />
                <span>Laptop camera help & tips</span>
              </button>
            </div>
          </div>
        )}

        {/* Access Denied */}
        {cameraStatus === 'denied' && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <CameraOff className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-outfit">Camera Access Denied</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">{errorMessage}</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => startCamera(facingMode, selectedDeviceId, true)}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-bold transition-colors shadow-md"
              >
                Grant Permission & Turn On
              </button>
              <button
                type="button"
                onClick={() => setShowTroubleshooting(true)}
                className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                How to Fix
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {cameraStatus === 'error' && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
            <div className="w-11 h-11 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white font-outfit">Camera Not Connected</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">{errorMessage}</p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => startCamera(facingMode, selectedDeviceId, true)}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-500/20 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Camera Connection
              </button>
              <button
                type="button"
                onClick={() => setShowTroubleshooting(true)}
                className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Fix Tips
              </button>
            </div>
          </div>
        )}

        {/* Troubleshooting Modal/Drawer */}
        {showTroubleshooting && (
          <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-md flex flex-col p-5 z-40 text-left overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-teal-400" />
                <span>Laptop Camera Troubleshooting Guide</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTroubleshooting(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-900 rounded-lg"
              >
                Close
              </button>
            </div>

            <div className="mt-3 space-y-2.5 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <strong className="text-teal-300 block mb-1">1. Browser Camera Permission:</strong>
                Click the <strong>🔒 Lock or 🎥 Camera icon</strong> on the left side of your browser URL address bar, and make sure <em>Camera</em> is set to <strong>"Allow"</strong>.
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <strong className="text-teal-300 block mb-1">2. Physical Privacy Shutter / Switch:</strong>
                Many laptops (Lenovo, Dell, HP, Asus) have a tiny physical sliding shutter over the webcam or an <strong>F8/F10 camera key</strong> on the keyboard. Check that it is open.
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <strong className="text-teal-300 block mb-1">3. Windows Camera Privacy Settings:</strong>
                Open Windows <strong>Settings ➔ Privacy & Security ➔ Camera</strong>, and ensure <em>"Let apps access your camera"</em> and <em>"Let desktop apps access your camera"</em> are turned <strong>ON</strong>.
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <strong className="text-teal-300 block mb-1">4. Close Conflicting Programs:</strong>
                Ensure no other program (Zoom, Microsoft Teams, Skype, or Windows Camera app) is currently holding the webcam stream.
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowTroubleshooting(false);
                  startCamera(facingMode, selectedDeviceId, true);
                }}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs shadow-md"
              >
                Try Camera Now
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

          {/* Quick Turn On / Reload Camera Button */}
          <button
            type="button"
            onClick={handleReloadCamera}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Reload/Turn On Camera Stream"
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
        </div>
      </div>
    </div>
  );
};

export default CameraHUD;

