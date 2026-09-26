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
 * Detect a single human face with 68 landmarks and 128-d deep neural embedding
 * @param {HTMLVideoElement|HTMLImageElement|HTMLCanvasElement} inputElement 
 * @returns {Promise<{
 *   isDetected: boolean,
 *   score: number,
 *   box: { x: number, y: number, width: number, height: number } | null,
 *   landmarks: any,
 *   descriptor: number[] | null,
 * }>}
 */
export const extractFaceFeaturesFromInput = async (inputElement) => {
  try {
    await loadFaceModels();

    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.5,
    });

    const detection = await faceapi
      .detectSingleFace(inputElement, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection || !detection.descriptor) {
      return {
        isDetected: false,
        score: 0,
        box: null,
        landmarks: null,
        descriptor: null,
      };
    }

    const box = detection.detection.box;
    const score = Math.round(detection.detection.score * 100);
    // Convert Float32Array to standard Array of numbers
    const descriptor = Array.from(detection.descriptor).map((v) => parseFloat(v.toFixed(6)));

    return {
      isDetected: true,
      score,
      box: {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
      },
      landmarks: detection.landmarks,
      descriptor,
    };
  } catch (error) {
    console.error('Face feature extraction error:', error);
    return {
      isDetected: false,
      score: 0,
      box: null,
      landmarks: null,
      descriptor: null,
      error: error.message,
    };
  }
};

export default {
  loadFaceModels,
  extractFaceFeaturesFromInput,
  faceapi,
};
