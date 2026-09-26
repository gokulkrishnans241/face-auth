import { FaceProfile } from '../models/FaceProfile.js';
import { config } from '../config/env.js';

/**
 * Calculate Euclidean Distance between two 128-d facial embedding vectors
 * @param {Array<number>} vecA 
 * @param {Array<number>} vecB 
 * @returns {number} Distance (lower = more similar; standard threshold <= 0.44)
 */
export const calculateEuclideanDistance = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 1.0;
  }
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    const diff = vecA[i] - vecB[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

/**
 * Calculate Cosine Similarity between two vectors
 * @param {Array<number>} vecA 
 * @param {Array<number>} vecB 
 * @returns {number} Similarity (1.0 = identical, 0 = orthogonal)
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
 * High-Precision Identity Face Matcher with Ambiguity & Unknown Face Rejection
 * @param {Array<number>} inputEmbedding 
 * @param {Array<string>} eligibleUserIds 
 * @returns {Promise<{
 *   matchedUserId: string|null,
 *   matchedUser: any|null,
 *   confidence: number,
 *   distance: number,
 *   similarity: number,
 *   isAmbiguous: boolean,
 *   reason?: string
 * }>}
 */
export const matchFaceAgainstCandidates = async (inputEmbedding, eligibleUserIds = []) => {
  if (!inputEmbedding || !Array.isArray(inputEmbedding) || inputEmbedding.length < 16) {
    return {
      matchedUserId: null,
      matchedUser: null,
      confidence: 0,
      distance: 1.0,
      similarity: 0,
      isAmbiguous: false,
      reason: 'invalid_embedding',
    };
  }

  const query = {
    enrollmentStatus: 'enrolled',
    biometricConsentStatus: true,
  };

  if (eligibleUserIds && eligibleUserIds.length > 0) {
    query.userId = { $in: eligibleUserIds };
  }

  // Retrieve enrolled profiles with facialEmbedding
  const profiles = await FaceProfile.find(query).select('+facialEmbedding').populate('userId', 'name userId email department');

  if (!profiles || profiles.length === 0) {
    return {
      matchedUserId: null,
      matchedUser: null,
      confidence: 0,
      distance: 1.0,
      similarity: 0,
      isAmbiguous: false,
      reason: 'no_enrolled_candidates',
    };
  }

  let bestMatch = null;
  let minDistance = 999.0;
  let bestSimilarity = 0;

  let secondBestMatch = null;
  let secondMinDistance = 999.0;

  const threshold = config.faceMatchThreshold || 0.44;
  const minSimilarityThreshold = 0.85;

  for (const profile of profiles) {
    if (!profile.facialEmbedding || profile.facialEmbedding.length === 0) continue;
    const distance = calculateEuclideanDistance(inputEmbedding, profile.facialEmbedding);
    const similarity = calculateCosineSimilarity(inputEmbedding, profile.facialEmbedding);

    if (distance < minDistance) {
      // Demote current best to second best
      secondMinDistance = minDistance;
      secondBestMatch = bestMatch;

      minDistance = distance;
      bestSimilarity = similarity;
      bestMatch = profile;
    } else if (distance < secondMinDistance) {
      secondMinDistance = distance;
      secondBestMatch = profile;
    }
  }

  // Check 1: Ambiguous match detection (if 2 different enrolled users are too close in score)
  if (
    bestMatch &&
    secondBestMatch &&
    bestMatch._id.toString() !== secondBestMatch._id.toString() &&
    minDistance <= threshold &&
    secondMinDistance <= threshold &&
    (secondMinDistance - minDistance) < 0.04
  ) {
    return {
      matchedUserId: null,
      matchedUser: null,
      confidence: parseFloat((bestSimilarity * 100).toFixed(2)),
      distance: parseFloat(minDistance.toFixed(4)),
      similarity: parseFloat(bestSimilarity.toFixed(4)),
      isAmbiguous: true,
      reason: 'ambiguous_match',
      message: `Ambiguous match between "${bestMatch.userId?.name}" and "${secondBestMatch.userId?.name}". Identity uncertain.`,
    };
  }

  // Check 2: Strong 1-to-1 Biometric Identity Match
  if (bestMatch && minDistance <= threshold && bestSimilarity >= minSimilarityThreshold) {
    const confidenceScore = Math.max(88, Math.min(99.9, bestSimilarity * 100));
    return {
      matchedUserId: bestMatch.userId._id,
      matchedUser: bestMatch.userId,
      confidence: parseFloat(confidenceScore.toFixed(2)),
      distance: parseFloat(minDistance.toFixed(4)),
      similarity: parseFloat(bestSimilarity.toFixed(4)),
      isAmbiguous: false,
    };
  }

  // Case 3: Unknown Face / Distance too high
  return {
    matchedUserId: null,
    matchedUser: null,
    confidence: bestSimilarity > 0 ? parseFloat((bestSimilarity * 100).toFixed(2)) : 0,
    distance: minDistance === 999.0 ? 1.0 : parseFloat(minDistance.toFixed(4)),
    similarity: parseFloat(bestSimilarity.toFixed(4)),
    isAmbiguous: false,
    reason: 'unknown_face',
  };
};
