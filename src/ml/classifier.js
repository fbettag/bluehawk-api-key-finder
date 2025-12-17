/**
 * BlueHawk API Key Finder - ML Classifier Module
 *
 * Optional TensorFlow.js-based classifier for secret detection.
 * Lazy-loaded to minimize initial bundle size.
 */

// Module state
let tf = null;
let model = null;
let charIndex = null;
let isInitialized = false;
let isLoading = false;

// Configuration
const MODEL_PATH = 'model/model.json';
const CHAR_INDEX_PATH = 'model/char_index.json';
const MAX_SEQUENCE_LENGTH = 100;
const PAD_CHAR = '\0';

/**
 * Lazy load TensorFlow.js
 */
async function loadTensorFlow() {
  if (tf) return tf;

  try {
    tf = await import('@tensorflow/tfjs');
    console.log('[BlueHawk ML] TensorFlow.js loaded');
    return tf;
  } catch (error) {
    console.error('[BlueHawk ML] Failed to load TensorFlow.js:', error);
    throw new Error('TensorFlow.js not available');
  }
}

/**
 * Load character index mapping
 */
async function loadCharIndex() {
  if (charIndex) return charIndex;

  try {
    const url = chrome.runtime.getURL(CHAR_INDEX_PATH);
    const response = await fetch(url);
    charIndex = await response.json();
    console.log('[BlueHawk ML] Character index loaded');
    return charIndex;
  } catch (error) {
    console.warn('[BlueHawk ML] Failed to load char index, using default');
    // Create default char index (ASCII printable + common)
    charIndex = {};
    for (let i = 32; i <= 126; i++) {
      charIndex[String.fromCharCode(i)] = i - 31;
    }
    charIndex[PAD_CHAR] = 0;
    return charIndex;
  }
}

/**
 * Load the ML model
 */
async function loadModel() {
  if (model) return model;

  const tensorflow = await loadTensorFlow();

  try {
    const url = chrome.runtime.getURL(MODEL_PATH);
    model = await tensorflow.loadLayersModel(url);
    console.log('[BlueHawk ML] Model loaded');
    return model;
  } catch (error) {
    console.error('[BlueHawk ML] Failed to load model:', error);
    throw new Error('Model not available');
  }
}

/**
 * Initialize the ML classifier
 */
export async function initialize() {
  if (isInitialized) return true;
  if (isLoading) {
    // Wait for existing initialization
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return isInitialized;
  }

  isLoading = true;

  try {
    await loadTensorFlow();
    await loadCharIndex();
    await loadModel();
    isInitialized = true;
    console.log('[BlueHawk ML] Classifier initialized');
    return true;
  } catch (error) {
    console.error('[BlueHawk ML] Initialization failed:', error);
    return false;
  } finally {
    isLoading = false;
  }
}

/**
 * Check if ML is available
 */
export function isAvailable() {
  return isInitialized;
}

/**
 * Check if ML can be loaded
 */
export async function canLoad() {
  try {
    await loadTensorFlow();
    return true;
  } catch {
    return false;
  }
}

/**
 * Encode a string to tensor input
 * @param {string} str - String to encode
 * @returns {number[]} Encoded sequence
 */
function encodeString(str) {
  const sequence = [];

  for (let i = 0; i < MAX_SEQUENCE_LENGTH; i++) {
    if (i < str.length) {
      const char = str[i];
      sequence.push(charIndex[char] || charIndex['?'] || 1);
    } else {
      sequence.push(0); // Padding
    }
  }

  return sequence;
}

/**
 * Classify a single string
 * @param {string} str - String to classify
 * @returns {Promise<object>} Classification result
 */
export async function classify(str) {
  if (!isInitialized) {
    const success = await initialize();
    if (!success) {
      return {
        isSecret: false,
        confidence: 0,
        error: 'ML classifier not available'
      };
    }
  }

  try {
    // Encode input
    const encoded = encodeString(str);
    const inputTensor = tf.tensor2d([encoded], [1, MAX_SEQUENCE_LENGTH]);

    // Run prediction
    const prediction = model.predict(inputTensor);
    const probabilities = await prediction.data();

    // Clean up tensors
    inputTensor.dispose();
    prediction.dispose();

    // Interpret results (assuming binary classification: secret vs non-secret)
    const secretProbability = probabilities[1] || probabilities[0];
    const isSecret = secretProbability > 0.5;

    return {
      isSecret,
      confidence: Math.round(secretProbability * 100),
      probabilities: {
        notSecret: probabilities[0],
        secret: probabilities[1] || 1 - probabilities[0]
      }
    };
  } catch (error) {
    console.error('[BlueHawk ML] Classification error:', error);
    return {
      isSecret: false,
      confidence: 0,
      error: error.message
    };
  }
}

/**
 * Batch classify multiple strings
 * @param {string[]} strings - Strings to classify
 * @param {object} options - Options
 * @returns {Promise<Array>} Classification results
 */
export async function batchClassify(strings, options = {}) {
  const { batchSize = 32, onProgress } = options;

  if (!isInitialized) {
    const success = await initialize();
    if (!success) {
      return strings.map(str => ({
        value: str,
        isSecret: false,
        confidence: 0,
        error: 'ML classifier not available'
      }));
    }
  }

  const results = [];

  try {
    // Process in batches
    for (let i = 0; i < strings.length; i += batchSize) {
      const batch = strings.slice(i, i + batchSize);

      // Encode batch
      const encodedBatch = batch.map(str => encodeString(str));
      const inputTensor = tf.tensor2d(encodedBatch, [batch.length, MAX_SEQUENCE_LENGTH]);

      // Run prediction
      const predictions = model.predict(inputTensor);
      const probabilities = await predictions.data();

      // Process results
      for (let j = 0; j < batch.length; j++) {
        const idx = j * 2; // Assuming 2 output classes
        const secretProb = probabilities[idx + 1] || probabilities[idx];

        results.push({
          value: batch[j],
          isSecret: secretProb > 0.5,
          confidence: Math.round(secretProb * 100)
        });
      }

      // Clean up tensors
      inputTensor.dispose();
      predictions.dispose();

      if (onProgress) {
        onProgress(Math.min(i + batchSize, strings.length), strings.length);
      }
    }

    return results;
  } catch (error) {
    console.error('[BlueHawk ML] Batch classification error:', error);
    return strings.map(str => ({
      value: str,
      isSecret: false,
      confidence: 0,
      error: error.message
    }));
  }
}

/**
 * Clean up resources
 */
export function dispose() {
  if (model) {
    model.dispose();
    model = null;
  }
  isInitialized = false;
}

/**
 * Get model info
 */
export function getModelInfo() {
  if (!model) {
    return null;
  }

  return {
    inputShape: model.inputs[0].shape,
    outputShape: model.outputs[0].shape,
    layers: model.layers.length
  };
}

/**
 * Train model with new data (for future use)
 * Note: This is a placeholder for potential online learning
 */
export async function addTrainingExample(str, isSecret) {
  // Store training examples for potential batch retraining
  const examples = JSON.parse(localStorage.getItem('bluehawk_ml_examples') || '[]');
  examples.push({ str, isSecret, timestamp: Date.now() });

  // Keep only last 1000 examples
  if (examples.length > 1000) {
    examples.shift();
  }

  localStorage.setItem('bluehawk_ml_examples', JSON.stringify(examples));

  return { stored: true, totalExamples: examples.length };
}

/**
 * Feature extraction (for models that use feature vectors)
 */
export function extractFeatures(str) {
  const features = {
    length: str.length,
    entropy: calculateSimpleEntropy(str),
    hasDigits: /\d/.test(str),
    hasUpper: /[A-Z]/.test(str),
    hasLower: /[a-z]/.test(str),
    hasSpecial: /[^a-zA-Z0-9]/.test(str),
    digitRatio: (str.match(/\d/g) || []).length / str.length,
    upperRatio: (str.match(/[A-Z]/g) || []).length / str.length,
    uniqueRatio: new Set(str).size / str.length,
    hasPrefix: /^(sk_|pk_|api_|key_|ghp_|gho_|xox|eyJ)/i.test(str),
    looksBase64: /^[A-Za-z0-9+/=]{20,}$/.test(str),
    looksHex: /^[A-Fa-f0-9]{20,}$/.test(str),
    hasRepeating: /(.)\1{3,}/.test(str)
  };

  return features;
}

/**
 * Simple entropy calculation for features
 */
function calculateSimpleEntropy(str) {
  const freq = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }

  let entropy = 0;
  const len = str.length;

  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Combined ML + heuristic classification
 */
export async function hybridClassify(str) {
  // Extract features
  const features = extractFeatures(str);

  // Try ML classification
  let mlResult = null;
  if (isInitialized || await canLoad()) {
    mlResult = await classify(str);
  }

  // Heuristic scoring
  let heuristicScore = 0;

  if (features.hasPrefix) heuristicScore += 30;
  if (features.entropy > 4.5) heuristicScore += 25;
  if (features.uniqueRatio > 0.7) heuristicScore += 15;
  if (features.length >= 20 && features.length <= 100) heuristicScore += 10;
  if (features.looksBase64 && features.length >= 30) heuristicScore += 15;
  if (features.looksHex && features.length >= 32) heuristicScore += 15;
  if (features.hasRepeating) heuristicScore -= 20;

  // Combine scores
  const mlWeight = mlResult && !mlResult.error ? 0.6 : 0;
  const heuristicWeight = 1 - mlWeight;

  const mlScore = mlResult?.confidence || 0;
  const combinedScore = (mlScore * mlWeight) + (heuristicScore * heuristicWeight);

  return {
    isSecret: combinedScore > 50,
    confidence: Math.round(combinedScore),
    mlResult,
    heuristicScore,
    features
  };
}

export default {
  initialize,
  isAvailable,
  canLoad,
  classify,
  batchClassify,
  dispose,
  getModelInfo,
  addTrainingExample,
  extractFeatures,
  hybridClassify
};
