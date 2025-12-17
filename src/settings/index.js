/**
 * BlueHawk API Key Finder - Settings Page
 */

import { DEFAULT_SETTINGS, MESSAGE_TYPES } from '../shared/constants.js';

let settings = { ...DEFAULT_SETTINGS };
let hasChanges = false;

// Preset definitions: which features each preset enables
const PRESETS = {
  quick:    { patterns: true, entropy: false, ast: false, ml: false },
  standard: { patterns: true, entropy: true,  ast: false, ml: false },
  deep:     { patterns: true, entropy: true,  ast: true,  ml: false },
  full:     { patterns: true, entropy: true,  ast: true,  ml: true }
};

/**
 * Initialize settings page
 */
async function init() {
  await loadSettings();
  populateForm();
  setupEventListeners();
  updateVisibility();
}

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const { settings: stored } = await chrome.storage.local.get('settings');
    if (stored) {
      settings = { ...DEFAULT_SETTINGS, ...stored };
    }
  } catch (e) {
    console.warn('[BlueHawk] Failed to load settings:', e);
  }
}

/**
 * Populate form with current settings
 */
function populateForm() {
  // Scanning
  document.getElementById('autoScan').checked = settings.autoScanEnabled;
  document.getElementById('scanDelay').value = settings.scanDelay;
  document.getElementById('minTokenLength').value = settings.minTokenLength;

  // Analysis features
  document.getElementById('featurePatterns').checked = settings.featurePatterns;
  document.getElementById('featureEntropy').checked = settings.featureEntropy;
  document.getElementById('featureAST').checked = settings.featureAST;
  document.getElementById('featureML').checked = settings.featureML;

  // Detect and set the correct preset
  updatePresetFromFeatures();

  // Filters
  document.getElementById('skipSocialMedia').checked = settings.skipSocialMediaScan;

  // Validation
  document.getElementById('validateTokens').checked = settings.validateTokens;
  document.getElementById('bucketTakeover').checked = settings.bucketTakeover;

  // Proxy
  document.getElementById('proxyEnabled').checked = settings.proxyEnabled;
  document.getElementById('proxyHost').value = settings.proxyHost;
  document.getElementById('proxyPort').value = settings.proxyPort;

  // Notifications
  document.getElementById('notifications').checked = settings.notificationsEnabled;
  document.getElementById('discordEnabled').checked = settings.discordWebhookEnabled;
  document.getElementById('discordWebhook').value = settings.discordWebhookUrl || '';

  // History
  document.getElementById('saveHistory').checked = settings.saveHistory;
  document.getElementById('maxHistory').value = settings.maxHistory;

  // Export
  document.getElementById('defaultExport').value = settings.defaultExport;
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Track changes
  document.querySelectorAll('input, select, textarea').forEach(el => {
    el.addEventListener('change', () => { hasChanges = true; });
    el.addEventListener('input', () => { hasChanges = true; });
  });

  // Analysis depth preset changes
  document.getElementById('analysisDepth').addEventListener('change', onPresetChange);

  // Feature toggle changes
  ['featureEntropy', 'featureAST', 'featureML'].forEach(id => {
    document.getElementById(id).addEventListener('change', onFeatureToggleChange);
  });

  // Visibility toggles
  document.getElementById('proxyEnabled').addEventListener('change', updateVisibility);
  document.getElementById('discordEnabled').addEventListener('change', updateVisibility);

  // Test buttons
  document.getElementById('testDiscord').addEventListener('click', testDiscord);

  // Clear history
  document.getElementById('clearHistory').addEventListener('click', clearHistory);

  // Save/Reset
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
  document.getElementById('resetBtn').addEventListener('click', resetSettings);

  // Warn on unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (hasChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

/**
 * Handle preset dropdown change - update feature toggles
 */
function onPresetChange() {
  const preset = document.getElementById('analysisDepth').value;
  if (preset === 'custom') return; // Don't change toggles for custom

  const features = PRESETS[preset];
  if (features) {
    document.getElementById('featurePatterns').checked = features.patterns;
    document.getElementById('featureEntropy').checked = features.entropy;
    document.getElementById('featureAST').checked = features.ast;
    document.getElementById('featureML').checked = features.ml;
  }
}

/**
 * Handle feature toggle change - detect if matches preset or set to custom
 */
function onFeatureToggleChange() {
  updatePresetFromFeatures();
}

/**
 * Detect which preset matches current toggles, or set to custom
 */
function updatePresetFromFeatures() {
  const current = {
    patterns: document.getElementById('featurePatterns').checked,
    entropy: document.getElementById('featureEntropy').checked,
    ast: document.getElementById('featureAST').checked,
    ml: document.getElementById('featureML').checked
  };

  // Find matching preset
  let matchedPreset = 'custom';
  for (const [name, features] of Object.entries(PRESETS)) {
    if (features.patterns === current.patterns &&
        features.entropy === current.entropy &&
        features.ast === current.ast &&
        features.ml === current.ml) {
      matchedPreset = name;
      break;
    }
  }

  document.getElementById('analysisDepth').value = matchedPreset;
}

/**
 * Update visibility of conditional sections
 */
function updateVisibility() {
  const proxyEnabled = document.getElementById('proxyEnabled').checked;
  const discordEnabled = document.getElementById('discordEnabled').checked;

  document.querySelectorAll('.proxy-config').forEach(el => {
    el.style.display = proxyEnabled ? 'flex' : 'none';
  });

  document.querySelectorAll('.discord-config').forEach(el => {
    el.style.display = discordEnabled ? 'flex' : 'none';
  });
}

/**
 * Gather settings from form
 */
function gatherSettings() {
  return {
    // Scanning
    autoScanEnabled: document.getElementById('autoScan').checked,
    scanDelay: parseInt(document.getElementById('scanDelay').value, 10),
    analysisDepth: document.getElementById('analysisDepth').value,
    minTokenLength: parseInt(document.getElementById('minTokenLength').value, 10),

    // Analysis Features
    featurePatterns: document.getElementById('featurePatterns').checked,
    featureEntropy: document.getElementById('featureEntropy').checked,
    featureAST: document.getElementById('featureAST').checked,
    featureML: document.getElementById('featureML').checked,

    // Filters
    skipSocialMediaScan: document.getElementById('skipSocialMedia').checked,

    // Validation
    validateTokens: document.getElementById('validateTokens').checked,
    bucketTakeover: document.getElementById('bucketTakeover').checked,

    // Proxy
    proxyEnabled: document.getElementById('proxyEnabled').checked,
    proxyHost: document.getElementById('proxyHost').value.trim() || '127.0.0.1',
    proxyPort: parseInt(document.getElementById('proxyPort').value, 10) || 8080,

    // Notifications
    notificationsEnabled: document.getElementById('notifications').checked,
    discordWebhookEnabled: document.getElementById('discordEnabled').checked,
    discordWebhookUrl: document.getElementById('discordWebhook').value.trim(),

    // History
    saveHistory: document.getElementById('saveHistory').checked,
    maxHistory: parseInt(document.getElementById('maxHistory').value, 10),

    // Export
    defaultExport: document.getElementById('defaultExport').value
  };
}

/**
 * Save settings
 */
async function saveSettings() {
  const newSettings = gatherSettings();

  if (newSettings.discordWebhookEnabled && newSettings.discordWebhookUrl) {
    if (!newSettings.discordWebhookUrl.startsWith('https://discord.com/api/webhooks/') &&
        !newSettings.discordWebhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
      showToast('Invalid Discord webhook URL', 'error');
      return;
    }
  }

  try {
    await chrome.storage.local.set({ settings: newSettings });
    settings = newSettings;
    hasChanges = false;
    showToast('Settings saved', 'success');
  } catch (e) {
    showToast('Error saving settings', 'error');
  }
}

/**
 * Reset to defaults
 */
function resetSettings() {
  if (confirm('Reset all settings to defaults?')) {
    settings = { ...DEFAULT_SETTINGS };
    populateForm();
    updateVisibility();
    hasChanges = true;
    showToast('Settings reset to defaults', 'success');
  }
}

/**
 * Test Discord webhook
 */
async function testDiscord() {
  const url = document.getElementById('discordWebhook').value.trim();
  const resultEl = document.getElementById('discordResult');

  if (!url) {
    resultEl.classList.remove('hidden');
    resultEl.classList.add('error');
    resultEl.textContent = 'Please enter a Discord webhook URL';
    return;
  }

  if (!url.startsWith('https://discord.com/api/webhooks/')) {
    resultEl.classList.remove('hidden');
    resultEl.classList.add('error');
    resultEl.textContent = 'Invalid webhook URL';
    return;
  }

  resultEl.classList.remove('hidden', 'success', 'error');
  resultEl.textContent = 'Sending test message...';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'BlueHawk API Key Finder',
        embeds: [{
          title: 'Webhook Test',
          description: 'BlueHawk webhook configured successfully!',
          color: 0x3b82f6,
          timestamp: new Date().toISOString()
        }]
      })
    });

    if (response.ok) {
      resultEl.classList.add('success');
      resultEl.textContent = 'Test message sent! Check your Discord channel.';
    } else {
      resultEl.classList.add('error');
      resultEl.textContent = `Error: ${response.status}`;
    }
  } catch (e) {
    resultEl.classList.add('error');
    resultEl.textContent = e.message;
  }
}

/**
 * Clear history
 */
async function clearHistory() {
  if (!confirm('Delete all scan history? This cannot be undone.')) {
    return;
  }

  try {
    await chrome.storage.local.remove('history');
    showToast('History cleared', 'success');
  } catch (e) {
    showToast('Error clearing history', 'error');
  }
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    background: var(--bg-tertiary);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: var(--font-size-sm);
    z-index: 1000;
  `;

  if (type === 'success') {
    toast.style.borderColor = 'var(--severity-low)';
  } else if (type === 'error') {
    toast.style.borderColor = 'var(--severity-critical)';
  }

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', init);
