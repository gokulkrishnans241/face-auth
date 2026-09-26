import { FaceProfile } from '../models/FaceProfile.js';
import { config } from '../config/env.js';

/**
 * Calculate Euclidean Distance between two facial embedding vectors
 * @param {Array<number>} vecA 
 * @param {Array<number>} vecB 
 * @returns {number} Distance (lower = more similar)
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
 * Match an input face descriptor against a set of candidate enrolled student IDs
 * @param {Array<number>} inputEmbedding 
 * @param {Array<string>} eligibleUserIds 
 * @returns {Promise<{ matchedUserId: string|null, confidence: number, distance: number }>}
 */
export const matchFaceAgainstCandidates = async (inputEmbedding, eligibleUserIds = []) => {
  if (!inputEmbedding || !Array.isArray(inputEmbedding)) {
    return { matchedUserId: null, confidence: 0, distance: 1.0 };
  }

  const query = {
    enrollmentStatus: 'enrolled',
    biometricConsentStatus: true,
  };

  if (eligibleUserIds && eligibleUserIds.length > 0) {
    query.userId = { $in: eligibleUserIds };
  }

  // Retrieve enrolled profiles with facialEmbedding selected
  const profiles = await FaceProfile.find(query).select('+facialEmbedding').populate('userId', 'name userId email');

  let bestMatch = null;
  let minDistance = 999.0;
  let bestSimilarity = 0;
  const threshold = config.faceMatchThreshold || 0.44;
  const minSimilarityThreshold = 0.85;

  for (const profile of profiles) {
    if (!profile.facialEmbedding || profile.facialEmbedding.length === 0) continue;
    const distance = calculateEuclideanDistance(inputEmbedding, profile.facialEmbedding);
    const similarity = calculateCosineSimilarity(inputEmbedding, profile.facialEmbedding);

    if (distance < minDistance) {
      minDistance = distance;
      bestSimilarity = similarity;
      bestMatch = profile;
    }
  }

  // Strictly require BOTH Euclidean Distance <= threshold (0.44) AND Cosine Similarity >= 0.85
  if (bestMatch && minDistance <= threshold && bestSimilarity >= minSimilarityThreshold) {
    // Convert distance & similarity to confidence percentage (88% - 99.9%)
    const confidenceScore = Math.max(88, Math.min(99.9, bestSimilarity * 100));
    return {
      matchedUserId: bestMatch.userId._id,
      matchedUser: bestMatch.userId,
      confidence: parseFloat(confidenceScore.toFixed(2)),
      distance: parseFloat(minDistance.toFixed(4)),
      similarity: parseFloat(bestSimilarity.toFixed(4)),
    };
  }

  return {
    matchedUserId: null,
    matchedUser: null,
    confidence: 0,
    distance: minDistance === 999.0 ? 1.0 : parseFloat(minDistance.toFixed(4)),
  };
};
