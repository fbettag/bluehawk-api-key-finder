/**
 * BlueHawk API Key Finder - ML Worker
 *
 * Web Worker for TensorFlow.js-based secret classification.
 * Lazy-loaded to minimize impact on extension size.
 */

// Module state
let tf = null;
let model = null;
let charIndex = null;
let isInitialized = false;

// Configuration
const MAX_SEQUENCE_LENGTH = 100;

/**
 * Lazy load TensorFlow.js
 */
async function loadTensorFlow() {
  if (tf) return tf;

  try {
    tf = await import('@tensorflow/tfjs');
    console.log('[BlueHawk ML Worker] TensorFlow.js loaded');
    return tf;
  } catch (error) {
    console.error('[BlueHawk ML Worker] Failed to load TensorFlow.js:', error);
    throw error;
  }
}

/**
 * Load character index mapping
 */
async function loadCharIndex() {
  if (charIndex) return charIndex;

  try {
    const response = await fetch('model/char_index.json');
    charIndex = await response.json();
    console.log('[BlueHawk ML Worker] Character index loaded');
    return charIndex;
  } catch (error) {
    console.warn('[BlueHawk ML Worker] Using default char index');
    // Create default char index (ASCII printable)
    charIndex = {};
    for (let i = 32; i <= 126; i++) {
      charIndex[String.fromCharCode(i)] = i - 31;
    }
    charIndex['\0'] = 0;
    return charIndex;
  }
}

/**
 * Load the ML model
 */
async function loadModel() {
  if (model) return model;

  await loadTensorFlow();

  try {
    model = await tf.loadLayersModel('model/model.json');
    console.log('[BlueHawk ML Worker] Model loaded');
    return model;
  } catch (error) {
    console.error('[BlueHawk ML Worker] Failed to load model:', error);
    throw error;
  }
}

/**
 * Encode a string for model input
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
 * Classify a single token
 */
async function classifyToken(value) {
  if (!model || !tf) {
    throw new Error('Model not loaded');
  }

  const encoded = encodeString(value);
  const inputTensor = tf.tensor2d([encoded], [1, MAX_SEQUENCE_LENGTH]);

  const prediction = model.predict(inputTensor);
  const probabilities = await prediction.data();

  // Clean up tensors
  inputTensor.dispose();
  prediction.dispose();

  // Interpret results
  const secretProbability = probabilities[1] || probabilities[0];

  return {
    score: Math.round(secretProbability * 100),
    probability: secretProbability,
    class: getClassification(secretProbability)
  };
}

/**
 * Get classification label from probability
 */
function getClassification(probability) {
  if (probability >= 0.9) return 'DEFINITE_SECRET';
  if (probability >= 0.7) return 'LIKELY_SECRET';
  if (probability >= 0.5) return 'POSSIBLE_SECRET';
  if (probability >= 0.3) return 'UNCERTAIN';
  return 'LIKELY_FALSE_POSITIVE';
}

/**
 * Batch classify tokens
 */
async function batchClassifyTokens(tokens, batchSize = 32) {
  if (!model || !tf) {
    throw new Error('Model not loaded');
  }

  const results = [];

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    const values = batch.map(t => t.value || t);

    // Encode batch
    const encodedBatch = values.map(encodeString);
    const inputTensor = tf.tensor2d(encodedBatch, [batch.length, MAX_SEQUENCE_LENGTH]);

    // Predict
    const predictions = model.predict(inputTensor);
    const probabilities = await predictions.data();

    // Process results
    for (let j = 0; j < batch.length; j++) {
      const idx = j * 2;
      const secretProb = probabilities[idx + 1] !== undefined
        ? probabilities[idx + 1]
        : probabilities[j];

      const originalToken = typeof batch[j] === 'string' ? { value: batch[j] } : batch[j];

      results.push({
        ...originalToken,
        mlScore: Math.round(secretProb * 100),
        mlProbability: secretProb,
        mlClass: getClassification(secretProb)
      });
    }

    // Clean up
    inputTensor.dispose();
    predictions.dispose();

    // Report progress
    self.postMessage({
      type: 'progress',
      data: {
        completed: Math.min(i + batchSize, tokens.length),
        total: tokens.length
      }
    });
  }

  return results;
}

/**
 * Extract features for feature-based classification
 */
function extractFeatures(str) {
  const features = {
    length: str.length,
    entropy: calculateEntropy(str),
    digitRatio: (str.match(/\d/g) || []).length / str.length,
    upperRatio: (str.match(/[A-Z]/g) || []).length / str.length,
    lowerRatio: (str.match(/[a-z]/g) || []).length / str.length,
    specialRatio: (str.match(/[^a-zA-Z0-9]/g) || []).length / str.length,
    uniqueRatio: new Set(str).size / str.length,
    hasKnownPrefix: /^(sk_|pk_|api_|key_|ghp_|xox|eyJ|AKIA)/i.test(str),
    isBase64Like: /^[A-Za-z0-9+/=]{20,}$/.test(str),
    isHexLike: /^[A-Fa-f0-9]{20,}$/.test(str)
  };

  return features;
}

/**
 * Simple entropy calculation
 */
function calculateEntropy(str) {
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
 * Heuristic classification (fallback when model unavailable)
 */
function heuristicClassify(str) {
  const features = extractFeatures(str);
  let score = 0;

  // Length scoring
  if (features.length >= 20 && features.length <= 100) score += 15;
  if (features.length >= 32 && features.length <= 64) score += 10;

  // Entropy scoring
  if (features.entropy > 4.5) score += 25;
  else if (features.entropy > 4.0) score += 15;
  else if (features.entropy > 3.5) score += 10;

  // Character distribution
  if (features.uniqueRatio > 0.7) score += 15;
  if (features.digitRatio > 0.2 && features.digitRatio < 0.5) score += 10;
  if (features.upperRatio > 0.1 && features.lowerRatio > 0.1) score += 10;

  // Pattern matching
  if (features.hasKnownPrefix) score += 30;
  if (features.isBase64Like && features.length >= 30) score += 15;
  if (features.isHexLike && features.length >= 32) score += 15;

  return {
    score: Math.min(100, score),
    class: getClassification(score / 100),
    features
  };
}

// Worker message handler
self.onmessage = async function(event) {
  const { type, data, id } = event.data;

  try {
    switch (type) {
      case 'init':
        await handleInit();
        break;

      case 'classify':
        await handleClassify(data, id);
        break;

      case 'batchClassify':
        await handleBatchClassify(data, id);
        break;

      case 'heuristic':
        handleHeuristic(data, id);
        break;

      case 'getStatus':
        self.postMessage({
          type: 'status',
          id,
          data: {
            initialized: isInitialized,
            modelLoaded: !!model,
            tfLoaded: !!tf
          }
        });
        break;

      default:
        self.postMessage({
          type: 'error',
          id,
          error: `Unknown message type: ${type}`
        });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: error.message
    });
  }
};

/**
 * Initialize the ML system
 */
async function handleInit() {
  try {
    await loadTensorFlow();
    await loadCharIndex();
    await loadModel();
    isInitialized = true;

    self.postMessage({
      type: 'ready',
      data: {
        modelInfo: model ? {
          inputShape: model.inputs[0].shape,
          outputShape: model.outputs[0].shape
        } : null
      }
    });
  } catch (error) {
    // ML initialization failed, but we can still use heuristics
    self.postMessage({
      type: 'ready',
      data: {
        mlAvailable: false,
        heuristicsOnly: true,
        error: error.message
      }
    });
  }
}

/**
 * Classify a single token
 */
async function handleClassify(data, id) {
  const { value } = data;

  let result;

  if (isInitialized && model) {
    result = await classifyToken(value);
  } else {
    // Fall back to heuristics
    result = heuristicClassify(value);
    result.heuristicsOnly = true;
  }

  self.postMessage({
    type: 'result',
    id,
    data: result
  });
}

/**
 * Batch classify tokens
 */
async function handleBatchClassify(data, id) {
  const { tokens } = data;

  let results;

  if (isInitialized && model) {
    results = await batchClassifyTokens(tokens);
  } else {
    // Fall back to heuristics
    results = tokens.map(token => {
      const value = typeof token === 'string' ? token : token.value;
      const heuristic = heuristicClassify(value);
      return {
        ...(typeof token === 'object' ? token : { value: token }),
        mlScore: heuristic.score,
        mlClass: heuristic.class,
        heuristicsOnly: true
      };
    });
  }

  self.postMessage({
    type: 'complete',
    id,
    data: { results }
  });
}

/**
 * Heuristic classification only
 */
function handleHeuristic(data, id) {
  const { value } = data;
  const result = heuristicClassify(value);

  self.postMessage({
    type: 'result',
    id,
    data: result
  });
}

export {};
