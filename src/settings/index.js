/**
 * BlueHawk API Key Finder - Settings Page Script
 *
 * Configuration UI for extension settings.
 */

// Analysis depth presets - define what each level enables
const ANALYSIS_PRESETS = {
  quick: {
    enableAstAnalysis: false,
    enableDynamicAnalysis: false,
    enableWasmAnalysis: false,
    enableSourceMapAnalysis: false,
    enableObfuscationDetection: false,
    enableMlClassification: false
  },
  standard: {
    enableAstAnalysis: false,
    enableDynamicAnalysis: false,
    enableWasmAnalysis: false,
    enableSourceMapAnalysis: false,
    enableObfuscationDetection: true,
    enableMlClassification: false
  },
  deep: {
    enableAstAnalysis: true,
    enableDynamicAnalysis: true,
    enableWasmAnalysis: true,
    enableSourceMapAnalysis: true,
    enableObfuscationDetection: true,
    enableMlClassification: false
  },
  full: {
    enableAstAnalysis: true,
    enableDynamicAnalysis: true,
    enableWasmAnalysis: true,
    enableSourceMapAnalysis: true,
    enableObfuscationDetection: true,
    enableMlClassification: true
  }
};

// Flag to prevent circular updates
let isUpdatingFromPreset = false;

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  // Event listeners
  document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
  document.getElementById('resetSettingsBtn').addEventListener('click', resetSettings);
  document.getElementById('testWebhookBtn').addEventListener('click', testWebhook);

  // Analysis depth preset listener
  document.getElementById('analysisDepth').addEventListener('change', handleAnalysisDepthChange);

  // Individual toggle listeners - switch to Custom when manually changed
  document.querySelectorAll('.analysis-toggle').forEach(toggle => {
    toggle.addEventListener('change', handleToggleChange);
  });
});

// Handle analysis depth preset change
function handleAnalysisDepthChange(e) {
  const depth = e.target.value;
  if (depth === 'custom') {
    // Custom selected - keep current toggle states
    return;
  }

  const preset = ANALYSIS_PRESETS[depth];
  if (!preset) return;

  isUpdatingFromPreset = true;

  // Apply preset to toggles
  document.getElementById('enableAstAnalysis').checked = preset.enableAstAnalysis;
  document.getElementById('enableDynamicAnalysis').checked = preset.enableDynamicAnalysis;
  document.getElementById('enableWasmAnalysis').checked = preset.enableWasmAnalysis;
  document.getElementById('enableSourceMapAnalysis').checked = preset.enableSourceMapAnalysis;
  document.getElementById('enableObfuscationDetection').checked = preset.enableObfuscationDetection;
  document.getElementById('enableMlClassification').checked = preset.enableMlClassification;

  isUpdatingFromPreset = false;
}

// Handle individual toggle change - switch to Custom
function handleToggleChange() {
  if (isUpdatingFromPreset) return;

  const depthSelect = document.getElementById('analysisDepth');
  if (depthSelect.value !== 'custom') {
    depthSelect.value = 'custom';
  }
}

// Check if current toggles match a preset
function detectCurrentPreset() {
  const current = {
    enableAstAnalysis: document.getElementById('enableAstAnalysis').checked,
    enableDynamicAnalysis: document.getElementById('enableDynamicAnalysis').checked,
    enableWasmAnalysis: document.getElementById('enableWasmAnalysis').checked,
    enableSourceMapAnalysis: document.getElementById('enableSourceMapAnalysis').checked,
    enableObfuscationDetection: document.getElementById('enableObfuscationDetection').checked,
    enableMlClassification: document.getElementById('enableMlClassification').checked
  };

  for (const [presetName, preset] of Object.entries(ANALYSIS_PRESETS)) {
    if (JSON.stringify(current) === JSON.stringify(preset)) {
      return presetName;
    }
  }
  return 'custom';
}

// Load saved settings
async function loadSettings() {
  try {
    const { settings } = await chrome.storage.local.get('settings');

    if (settings) {
      document.getElementById('autoScanEnabled').checked = settings.autoScanEnabled || false;
      document.getElementById('notificationsEnabled').checked = settings.notificationsEnabled !== false;
      document.getElementById('discordWebhookEnabled').checked = settings.discordWebhookEnabled || false;
      document.getElementById('discordWebhookUrl').value = settings.discordWebhookUrl || '';
      document.getElementById('saveHistory').checked = settings.saveHistory !== false;
      document.getElementById('scanDelay').value = settings.scanDelay || 3000;
      document.getElementById('minTokenLength').value = settings.minTokenLength || 15;

      // Social media filter (active by default)
      document.getElementById('skipSocialMediaScan').checked = settings.skipSocialMediaScan !== false;

      // Proxy settings
      document.getElementById('proxyEnabled').checked = settings.proxyEnabled || false;
      document.getElementById('proxyHost').value = settings.proxyHost || '127.0.0.1';
      document.getElementById('proxyPort').value = settings.proxyPort || '8080';

      // Advanced analysis settings
      document.getElementById('enableAstAnalysis').checked = settings.enableAstAnalysis || false;
      document.getElementById('enableDynamicAnalysis').checked = settings.enableDynamicAnalysis || false;
      document.getElementById('enableWasmAnalysis').checked = settings.enableWasmAnalysis || false;
      document.getElementById('enableSourceMapAnalysis').checked = settings.enableSourceMapAnalysis || false;
      document.getElementById('enableObfuscationDetection').checked = settings.enableObfuscationDetection !== false;
      document.getElementById('enableMlClassification').checked = settings.enableMlClassification || false;

      // Set analysis depth based on saved value or detect from toggles
      const savedDepth = settings.analysisDepth;
      if (savedDepth && savedDepth !== 'custom') {
        document.getElementById('analysisDepth').value = savedDepth;
      } else {
        // Detect which preset matches current toggle configuration
        document.getElementById('analysisDepth').value = detectCurrentPreset();
      }
    } else {
      // First load - apply defaults
      applyDefaultSettings();
    }
  } catch (error) {
    console.error('[BlueHawk] Error loading settings:', error);
    applyDefaultSettings();
  }
}

// Apply default settings on first load
function applyDefaultSettings() {
  document.getElementById('autoScanEnabled').checked = false;
  document.getElementById('notificationsEnabled').checked = true;
  document.getElementById('discordWebhookEnabled').checked = false;
  document.getElementById('discordWebhookUrl').value = '';
  document.getElementById('saveHistory').checked = true;
  document.getElementById('scanDelay').value = 3000;
  document.getElementById('minTokenLength').value = 15;
  document.getElementById('skipSocialMediaScan').checked = true;
  document.getElementById('proxyEnabled').checked = false;
  document.getElementById('proxyHost').value = '127.0.0.1';
  document.getElementById('proxyPort').value = '8080';

  // Standard preset by default
  document.getElementById('analysisDepth').value = 'standard';
  const preset = ANALYSIS_PRESETS.standard;
  document.getElementById('enableAstAnalysis').checked = preset.enableAstAnalysis;
  document.getElementById('enableDynamicAnalysis').checked = preset.enableDynamicAnalysis;
  document.getElementById('enableWasmAnalysis').checked = preset.enableWasmAnalysis;
  document.getElementById('enableSourceMapAnalysis').checked = preset.enableSourceMapAnalysis;
  document.getElementById('enableObfuscationDetection').checked = preset.enableObfuscationDetection;
  document.getElementById('enableMlClassification').checked = preset.enableMlClassification;
}

// Save settings
async function saveSettings() {
  try {
    const webhookUrl = document.getElementById('discordWebhookUrl').value.trim();
    const webhookEnabled = document.getElementById('discordWebhookEnabled').checked;

    // Validate webhook URL if enabled
    if (webhookEnabled && webhookUrl) {
      if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') &&
          !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
        alert('Invalid webhook URL!\n\nMust start with:\nhttps://discord.com/api/webhooks/\nor\nhttps://discordapp.com/api/webhooks/');
        return;
      }

      // Validate basic format
      const webhookParts = webhookUrl.split('/');
      if (webhookParts.length < 7) {
        alert('Incomplete webhook URL!\n\nExpected format:\nhttps://discord.com/api/webhooks/[ID]/[TOKEN]');
        return;
      }
    }

    const settings = {
      autoScanEnabled: document.getElementById('autoScanEnabled').checked,
      notificationsEnabled: document.getElementById('notificationsEnabled').checked,
      discordWebhookEnabled: webhookEnabled,
      discordWebhookUrl: webhookUrl,
      saveHistory: document.getElementById('saveHistory').checked,
      scanDelay: parseInt(document.getElementById('scanDelay').value) || 3000,
      minTokenLength: parseInt(document.getElementById('minTokenLength').value) || 15,

      // Social media filter
      skipSocialMediaScan: document.getElementById('skipSocialMediaScan').checked,

      // Proxy settings
      proxyEnabled: document.getElementById('proxyEnabled').checked,
      proxyHost: document.getElementById('proxyHost').value.trim() || '127.0.0.1',
      proxyPort: parseInt(document.getElementById('proxyPort').value) || 8080,

      // Advanced analysis settings
      analysisDepth: document.getElementById('analysisDepth').value || 'standard',
      enableAstAnalysis: document.getElementById('enableAstAnalysis').checked,
      enableDynamicAnalysis: document.getElementById('enableDynamicAnalysis').checked,
      enableWasmAnalysis: document.getElementById('enableWasmAnalysis').checked,
      enableSourceMapAnalysis: document.getElementById('enableSourceMapAnalysis').checked,
      enableObfuscationDetection: document.getElementById('enableObfuscationDetection').checked,
      enableMlClassification: document.getElementById('enableMlClassification').checked
    };

    await chrome.storage.local.set({ settings });

    // Show success message
    const successMessage = document.getElementById('successMessage');
    successMessage.style.display = 'block';
    setTimeout(() => {
      successMessage.style.display = 'none';
    }, 3000);

    console.log('[BlueHawk] Settings saved:', settings);
  } catch (error) {
    console.error('[BlueHawk] Error saving settings:', error);
    alert('Error saving settings: ' + error.message);
  }
}

// Restore default settings
async function resetSettings() {
  if (!confirm('Are you sure you want to reset to default settings?')) {
    return;
  }

  const defaultSettings = {
    autoScanEnabled: false,
    notificationsEnabled: true,
    discordWebhookEnabled: false,
    discordWebhookUrl: '',
    saveHistory: true,
    scanDelay: 3000,
    minTokenLength: 15,

    // Social media filter
    skipSocialMediaScan: true,

    // Proxy settings
    proxyEnabled: false,
    proxyHost: '127.0.0.1',
    proxyPort: 8080,

    // Advanced analysis settings - standard preset
    analysisDepth: 'standard',
    enableAstAnalysis: false,
    enableDynamicAnalysis: false,
    enableWasmAnalysis: false,
    enableSourceMapAnalysis: false,
    enableObfuscationDetection: true,
    enableMlClassification: false
  };

  try {
    await chrome.storage.local.set({ settings: defaultSettings });
    await loadSettings();

    const successMessage = document.getElementById('successMessage');
    successMessage.textContent = 'Settings reset to default!';
    successMessage.style.display = 'block';
    setTimeout(() => {
      successMessage.style.display = 'none';
      successMessage.textContent = 'Settings saved successfully!';
    }, 3000);

    console.log('[BlueHawk] Settings reset to default');
  } catch (error) {
    console.error('[BlueHawk] Error resetting settings:', error);
    alert('Error resetting settings: ' + error.message);
  }
}

// Test Discord webhook
async function testWebhook() {
  const webhookUrl = document.getElementById('discordWebhookUrl').value.trim();
  const statusDiv = document.getElementById('webhookStatus');

  if (!webhookUrl) {
    statusDiv.textContent = 'Please enter a webhook URL';
    statusDiv.className = 'webhook-status error';
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
    return;
  }

  if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') &&
      !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
    statusDiv.textContent = 'Invalid URL! Must start with https://discord.com/api/webhooks/ or https://discordapp.com/api/webhooks/';
    statusDiv.className = 'webhook-status error';
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
    return;
  }

  // Show loading
  statusDiv.textContent = 'Testing webhook...';
  statusDiv.className = 'webhook-status';
  statusDiv.style.background = '#e3f2fd';
  statusDiv.style.color = '#1976d2';
  statusDiv.style.border = '1px solid #2196f3';
  statusDiv.style.display = 'block';

  try {
    const testPayload = {
      username: 'BlueHawk API Key Finder',
      embeds: [{
        title: 'Webhook Test',
        description: 'This is a test message from **BlueHawk API Key Finder**!',
        color: 0x667EEA,
        fields: [
          {
            name: 'Status',
            value: 'Webhook configured correctly!',
            inline: true
          },
          {
            name: 'Mode',
            value: 'Test',
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: 'BlueHawk API Key Finder by fbettag'
        }
      }]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      statusDiv.textContent = 'Webhook tested successfully! Check your Discord channel.';
      statusDiv.className = 'webhook-status success';
      statusDiv.style.display = 'block';
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    } else {
      const errorText = await response.text();
      statusDiv.textContent = `Error ${response.status}: ${errorText || response.statusText}`;
      statusDiv.className = 'webhook-status error';
      statusDiv.style.display = 'block';
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    }
  } catch (error) {
    statusDiv.textContent = `Error testing webhook: ${error.message}`;
    statusDiv.className = 'webhook-status error';
    statusDiv.style.display = 'block';
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 5000);
  }
}

export {};
