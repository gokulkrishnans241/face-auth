import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let modelLoadingPromise = null;

/**
 * Initialize and load official Deep Neural Network models for Face Detection, 
 * 68-point Facial Landmarks, and 128-d Face Recognition (ResNet-34).
 */
export const loadFaceModels = async () => {
  if (modelsLoaded) return true;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    const MODEL_URL = '/models';
    try {
      console.log('Loading Face-API deep neural network models from', MODEL_URL);
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      modelsLoaded = true;
      console.log('Face-API AI Models successfully loaded!');
      return true;
    } catch (err) {
      console.warn('Failed to load local models from /models, trying CDN fallback...', err);
      try {
        const CDN_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(CDN_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(CDN_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(CDN_URL),
        ]);
        modelsLoaded = true;
        console.log('Face-API AI Models loaded from CDN fallback!');
        return true;
      } catch (cdnErr) {
        console.error('Fatal: Failed to load Face-API AI models from all sources:', cdnErr);
        modelLoadingPromise = null;
        throw cdnErr;
      }
    }
  })();

  return modelLoadingPromise;
};

/**
 * Calculate Euclidean distance between two 128-d feature vectors
 */
export const calculateEuclideanDistance = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 1.0;
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

/**
 * Calculate Cosine similarity between two feature vectors
 */
export const calculateCosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * Validate that multiple captured samples from the same person are consistent
 * Rejects mixed captures, high movement, or lighting changes.
 */
export const validateSampleConsistency = (samples = []) => {
  if (!samples || samples.length < 2) return { isConsistent: true, maxDistance: 0 };

  let maxDist = 0;
  for (let i = 0; i < samples.length; i++) {
    for (let j = i + 1; j < samples.length; j++) {
      const dist = calculateEuclideanDistance(samples[i], samples[j]);
      if (dist > maxDist) maxDist = dist;
    }
  }

  // Intra-person sample distance should be <= 0.32
  const isConsistent = maxDist <= 0.32;
  return {
    isConsistent,
    maxDistance: parseFloat(maxDist.toFixed(4)),
    reason: isConsistent
      ? 'consistent'
      : `Sample variance too high (${maxDist.toFixed(2)} > 0.32). Please hold steady directly facing the camera.`,
  };
};

/**
 * Detect human faces with strict Single-Person enforcement, 68 landmarks, 
 * quality checks (distance, centering, angle), and 128-d deep embedding.
 * 
 * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} inputElement 
 * @returns {Promise<{
 *   status: 'no_face' | 'multiple_faces' | 'adjust_position' | 'face_ready',
 *   isDetected: boolean,
 *   isGoodQuality: boolean,
 *   multipleFaces: boolean,
 *   faceCount: number,
 *   guidance: string,
 *   score: number,
 *   box: { x: number, y: number, width: number, height: number } | null,
 *   landmarks: any,
 *   descriptor: number[] | null,
 * }>}
 */
export const detectFaceWithQuality = async (inputElement) => {
  try {
    await loadFaceModels();

    const detectorOptions = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.5,
    });

    // Detect all faces in frame to enforce strictly 1 person
    const detections = await faceapi
      .detectAllFaces(inputElement, detectorOptions)
      .withFaceLandmarks()
      .withFaceDescriptors();

    // CASE 1: No Face Detected (Wall, empty desk, shutter closed, ceiling)
    if (!detections || detections.length === 0) {
      return {
        status: 'no_face',
        isDetected: false,
        isGoodQuality: false,
        multipleFaces: false,
        faceCount: 0,
        guidance: 'No face detected • Align face inside guide box',
        score: 0,
        box: null,
        landmarks: null,
        descriptor: null,
      };
    }

    // CASE 2: Multiple Faces Detected (2+ people in camera frame)
    if (detections.length > 1) {
      return {
        status: 'multiple_faces',
        isDetected: false,
        isGoodQuality: false,
        multipleFaces: true,
        faceCount: detections.length,
        guidance: `Multiple faces detected (${detections.length}) • Only 1 person allowed`,
        score: 0,
        box: detections[0].detection.box,
        landmarks: null,
        descriptor: null,
      };
    }

    // CASE 3: Exactly One Face Detected -> Validate Quality & Geometry
    const detection = detections[0];
    const box = detection.detection.box;
    const score = Math.round(detection.detection.score * 100);
    const landmarks = detection.landmarks;
    const descriptor = Array.from(detection.descriptor).map((v) => parseFloat(v.toFixed(6)));

    const inputW = inputElement.videoWidth || inputElement.width || 640;
    const inputH = inputElement.videoHeight || inputElement.height || 480;

    const faceAreaRatio = (box.width * box.height) / (inputW * inputH);
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const offCenterDist = Math.sqrt(((centerX - inputW / 2) / inputW) ** 2 + ((centerY - inputH / 2) / inputH) ** 2);

    let guidance = 'Face aligned • Identity verifying';
    let isGoodQuality = true;
    let qualityReason = 'ok';

    // Face Size Checks
    if (box.width < 75 || box.height < 75 || faceAreaRatio < 0.04) {
      guidance = 'Move closer to the camera';
      isGoodQuality = false;
      qualityReason = 'too_far';
    } else if (faceAreaRatio > 0.72) {
      guidance = 'Move slightly back from camera';
      isGoodQuality = false;
      qualityReason = 'too_close';
    } else if (offCenterDist > 0.38) {
      guidance = 'Center your face in the camera';
      isGoodQuality = false;
      qualityReason = 'off_center';
    }

    // Facial Landmark Symmetry & Orientation Check (Head Pose / Yaw)
    if (landmarks && landmarks.positions) {
      const pts = landmarks.positions;
      const leftEye = pts[36];  // Left eye outer corner
      const rightEye = pts[45]; // Right eye outer corner
      const noseTip = pts[30];  // Nose tip

      if (leftEye && rightEye && noseTip) {
        const eyeDist = Math.abs(rightEye.x - leftEye.x);
        const leftDist = Math.abs(noseTip.x - leftEye.x);
        const rightDist = Math.abs(rightEye.x - noseTip.x);
        const yawRatio = eyeDist > 0 ? Math.abs(leftDist - rightDist) / eyeDist : 0;

        if (yawRatio > 0.48) {
          guidance = 'Please look directly at camera';
          isGoodQuality = false;
          qualityReason = 'head_turned';
        }
      }
    }

    return {
      status: isGoodQuality ? 'face_ready' : 'adjust_position',
      isDetected: true,
      isGoodQuality,
      qualityReason,
      multipleFaces: false,
      faceCount: 1,
      score,
      box: {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
      },
      landmarks,
      descriptor,
      guidance,
    };
  } catch (error) {
    console.error('Face feature extraction error:', error);
    return {
      status: 'error',
      isDetected: false,
      isGoodQuality: false,
      multipleFaces: false,
      faceCount: 0,
      guidance: 'Camera analysis error: ' + error.message,
      score: 0,
      box: null,
      landmarks: null,
      descriptor: null,
    };
  }
};

export default {
  loadFaceModels,
  detectFaceWithQuality,
  calculateEuclideanDistance,
  calculateCosineSimilarity,
  validateSampleConsistency,
  faceapi,
};
