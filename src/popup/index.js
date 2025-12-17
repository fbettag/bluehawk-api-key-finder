/**
 * BlueHawk API Key Finder - Popup Script
 * Aligned with WhiteDragon Web Security styling
 */

// DOM Elements cache
let elements = {};

// State
let currentTab = null;
let scanResults = [];
let isScanning = false;
let settings = {};

/**
 * Initialize popup
 */
async function init() {
  console.log('[BlueHawk] Popup initializing...');

  // Cache DOM elements
  cacheElements();

  // Set up event listeners
  setupEventListeners();

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  // Update target info
  updateTargetInfo();

  // Load settings and mode state
  await loadSettings();

  // Check if Deep Scan in progress
  await checkDeepScanState();

  console.log('[BlueHawk] Popup initialized');
}

/**
 * Cache DOM elements
 */
function cacheElements() {
  elements = {
    // Header
    logoIcon: document.getElementById('logoIcon'),
    historyBtn: document.getElementById('historyBtn'),
    settingsBtn: document.getElementById('settingsBtn'),

    // Mode
    modeToggle: document.getElementById('modeToggle'),

    // Target
    targetUrl: document.getElementById('targetUrl'),
    scriptsInfo: document.getElementById('scriptsInfo'),

    // Scan
    scanBtn: document.getElementById('scanBtn'),
    deepScanBtn: document.getElementById('deepScanBtn'),
    progressSection: document.getElementById('progressSection'),
    progressBar: document.getElementById('progressBar'),
    progressText: document.getElementById('progressText'),

    // Results
    tokenCount: document.getElementById('tokenCount'),
    resultsList: document.getElementById('resultsList'),
    emptyState: document.getElementById('emptyState'),
    exportBtn: document.getElementById('exportBtn'),
    exportDropdown: document.getElementById('exportDropdown'),
    clearBtn: document.getElementById('clearBtn'),

    // Stats
    statValid: document.getElementById('statValid'),
    statInvalid: document.getElementById('statInvalid'),
    statUnknown: document.getElementById('statUnknown'),

    // Modal
    tokenModal: document.getElementById('tokenModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    closeModal: document.getElementById('closeModal'),
    modalCopyBtn: document.getElementById('modalCopyBtn'),
    modalMarkViewedBtn: document.getElementById('modalMarkViewedBtn'),

    // Container
    app: document.getElementById('app')
  };
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Navigation buttons
  elements.historyBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
  });

  elements.settingsBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
  });

  // Mode toggle button
  elements.modeToggle.addEventListener('click', handleModeToggle);

  // Scan buttons
  elements.scanBtn.addEventListener('click', performScan);
  elements.deepScanBtn.addEventListener('click', performDeepScan);

  // Export dropdown
  elements.exportBtn.addEventListener('click', () => {
    elements.exportDropdown.classList.toggle('open');
  });

  document.querySelectorAll('#exportDropdown .dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const format = e.target.dataset.format;
      exportResults(format);
      elements.exportDropdown.classList.remove('open');
    });
  });

  // Clear button
  elements.clearBtn.addEventListener('click', clearResults);

  // Modal
  elements.closeModal.addEventListener('click', closeModal);
  elements.tokenModal.addEventListener('click', (e) => {
    if (e.target === elements.tokenModal) closeModal();
  });
  elements.modalCopyBtn.addEventListener('click', copyTokenDetails);
  elements.modalMarkViewedBtn.addEventListener('click', markCurrentTokenViewed);

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!elements.exportDropdown.contains(e.target)) {
      elements.exportDropdown.classList.remove('open');
    }
  });
}

/**
 * Load settings
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get('settings');
    settings = result.settings || {
      autoScanEnabled: false,
      notificationsEnabled: true,
      discordWebhookEnabled: false,
      discordWebhookUrl: '',
      saveHistory: true,
      scanDelay: 3000,
      minTokenLength: 15
    };
    updateModeUI();
  } catch (e) {
    console.warn('[BlueHawk] Failed to load settings:', e);
  }
}

/**
 * Update target information display
 */
function updateTargetInfo() {
  if (!currentTab?.url) {
    elements.targetUrl.textContent = 'No active tab';
    return;
  }

  try {
    const url = new URL(currentTab.url);
    elements.targetUrl.textContent = url.hostname + url.pathname;
    elements.targetUrl.title = currentTab.url;
  } catch (e) {
    elements.targetUrl.textContent = currentTab.url;
  }
}

/**
 * Handle mode toggle
 */
async function handleModeToggle() {
  // Toggle the current state
  const isCurrentlyActive = settings.autoScanEnabled;
  settings.autoScanEnabled = !isCurrentlyActive;

  // Update UI
  updateModeUI();

  // Save settings
  await chrome.storage.local.set({ settings });

  // Animate the button
  elements.modeToggle.style.transform = 'scale(1.1)';
  setTimeout(() => {
    elements.modeToggle.style.transform = 'scale(1)';
  }, 200);
}

/**
 * Update mode UI
 */
function updateModeUI() {
  const isActive = settings.autoScanEnabled;
  const modeText = elements.modeToggle.querySelector('.mode-text');

  if (isActive) {
    elements.modeToggle.classList.add('active');
    modeText.textContent = 'Auto';
  } else {
    elements.modeToggle.classList.remove('active');
    modeText.textContent = 'Manual';
  }

  // Update icon with/without orange dot
  setIconWithDot(isActive);
}

/**
 * Set icon with optional orange dot overlay
 */
function setIconWithDot(showDot) {
  const sizes = [16, 48, 128];
  const imageData = {};

  let loaded = 0;
  sizes.forEach(size => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Draw base icon
      ctx.drawImage(img, 0, 0, size, size);

      // Add orange dot if active
      if (showDot) {
        const dotRadius = size === 16 ? 4 : size === 48 ? 10 : 24;
        const cx = size - dotRadius - 1;
        const cy = size - dotRadius - 1;

        ctx.beginPath();
        ctx.arc(cx, cy, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#f97316';
        ctx.fill();
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      imageData[size] = ctx.getImageData(0, 0, size, size);
      loaded++;

      if (loaded === sizes.length) {
        chrome.action.setIcon({ imageData }).catch(() => {});
      }
    };
    img.src = chrome.runtime.getURL(`icons/icon${size}.png`);
  });
}

/**
 * Check if Deep Scan in progress
 */
async function checkDeepScanState() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getDeepScanState' });

    if (response?.status === 'success' && response.state?.isRunning) {
      const state = response.state;

      elements.scanBtn.disabled = true;
      elements.deepScanBtn.disabled = true;
      elements.progressSection.classList.remove('hidden');

      const elapsedTime = Math.floor((Date.now() - state.startTime) / 1000);
      const minutes = Math.floor(elapsedTime / 60);
      const seconds = elapsedTime % 60;

      elements.progressText.textContent = `Deep Scan: ${minutes}m ${seconds}s | Scripts: ${state.progress.scriptsAnalyzed}`;
      elements.progressBar.style.width = '50%';

      elements.scriptsInfo.textContent = `${state.progress.scriptsAnalyzed} analyzed`;
    }
  } catch (error) {
    console.log('[BlueHawk] No Deep Scan in progress');
  }
}

/**
 * Perform manual scan
 */
async function performScan() {
  if (isScanning) return;

  isScanning = true;
  elements.app.classList.add('scanning');
  elements.progressSection.classList.remove('hidden');
  elements.progressBar.style.width = '10%';
  elements.progressText.textContent = 'Starting scan...';
  elements.scriptsInfo.textContent = 'Scanning...';

  try {
    if (!currentTab?.id) {
      throw new Error('No active tab found');
    }

    elements.progressBar.style.width = '30%';
    elements.progressText.textContent = 'Analyzing scripts...';

    const response = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: scanForHardcodedTokens
    });

    if (!response?.[0]?.result) {
      throw new Error('Error executing scan on page');
    }

    const foundTokens = response[0].result;

    // Notify background
    if (foundTokens.tokens.length > 0) {
      chrome.runtime.sendMessage({
        action: 'manualScan',
        data: foundTokens
      }).catch(err => console.log('Background not available:', err));
    }

    elements.progressBar.style.width = '100%';
    elements.progressText.textContent = 'Scan complete';

    // Update scripts info
    elements.scriptsInfo.textContent = `${foundTokens.scriptsAnalyzed} scripts analyzed`;

    // Store results and render
    scanResults = foundTokens.tokens;
    renderResults();

    showToast(`Scan complete: ${scanResults.length} findings`, 'success');

  } catch (error) {
    console.error('[BlueHawk] Scan error:', error);
    showToast(error.message || 'Failed to scan', 'error');
  } finally {
    isScanning = false;
    elements.app.classList.remove('scanning');
    setTimeout(() => {
      elements.progressSection.classList.add('hidden');
    }, 1000);
  }
}

/**
 * Perform deep scan
 */
async function performDeepScan() {
  if (isScanning) return;

  isScanning = true;
  elements.app.classList.add('scanning');
  elements.progressSection.classList.remove('hidden');
  elements.progressBar.style.width = '10%';
  elements.progressText.textContent = 'Starting deep scan...';
  elements.scriptsInfo.textContent = 'Deep scanning...';

  try {
    if (!currentTab?.id) {
      throw new Error('No active tab found');
    }

    // Inject content script if needed
    try {
      await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        files: ['content.js']
      });
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.log('[BlueHawk] Content script may already be loaded:', error.message);
    }

    elements.progressBar.style.width = '30%';
    elements.progressText.textContent = 'Deep scanning (may take a few minutes)...';

    const response = await chrome.tabs.sendMessage(currentTab.id, {
      action: 'startDeepScan',
      depth: 10
    });

    if (!response) {
      throw new Error('Error executing deep scan');
    }

    elements.progressBar.style.width = '100%';
    elements.progressText.textContent = 'Deep scan complete';

    // Update scripts info
    elements.scriptsInfo.textContent = `${response.scriptsAnalyzed} scripts analyzed`;

    // Process results - prioritize valid tokens
    const validTokens = response.validTokens || [];
    const allTokens = response.tokens || [];

    // Store valid tokens first, then others
    scanResults = [...validTokens, ...allTokens.filter(t => !validTokens.some(v => v.value === t.value))];
    renderResults();

    const message = validTokens.length > 0
      ? `Deep scan complete: ${validTokens.length} VALID tokens found!`
      : `Deep scan complete: ${allTokens.length} findings`;
    showToast(message, validTokens.length > 0 ? 'error' : 'success');

  } catch (error) {
    console.error('[BlueHawk] Deep scan error:', error);
    showToast(error.message || 'Failed to deep scan', 'error');
  } finally {
    isScanning = false;
    elements.app.classList.remove('scanning');
    setTimeout(() => {
      elements.progressSection.classList.add('hidden');
    }, 1000);
  }
}

/**
 * Scan function to be injected in page
 */
async function scanForHardcodedTokens() {
  const patterns = {
    API_KEY: [
      /['"](api[_-]?key|apikey)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{20,})['"]/gi,
      /['"](key|access[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{20,})['"]/gi,
    ],
    JWT: [
      /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
    ],
    AWS: [
      /AKIA[0-9A-Z]{16}/g,
      /['"](aws[_-]?access[_-]?key[_-]?id)['"]\s*[:=]\s*['"]([A-Z0-9]{20})['"]/gi,
      /['"](aws[_-]?secret[_-]?access[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9/+=]{40})['"]/gi,
    ],
    GITHUB: [
      /gh[pousr]_[A-Za-z0-9_]{36,}/g,
      /github[_-]?token['"]\s*[:=]\s*['"]([a-zA-Z0-9]{40})['"]/gi,
    ],
    GITLAB: [
      /glpat-[a-zA-Z0-9_\-]{20,}/g,
      /gitlab[_-]?token['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{20,})['"]/gi,
    ],
    VERCEL: [
      /['"](vercel[_-]?token)['"]\s*[:=]\s*['"]([a-zA-Z0-9_]{24})['"]/gi,
      /vercel_[a-zA-Z0-9]{24}/g,
    ],
    SUPABASE: [
      /['"](supabase[_-]?key|supabase[_-]?anon[_-]?key|supabase[_-]?service[_-]?role[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{100,})['"]/gi,
    ],
    SLACK: [
      /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24,}/g,
    ],
    STRIPE: [
      /sk_live_[0-9a-zA-Z]{24,}/g,
      /pk_live_[0-9a-zA-Z]{24,}/g,
    ],
    FIREBASE: [
      /['"](firebase[_-]?api[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{39})['"]/gi,
      /AIzaSy[a-zA-Z0-9_\-]{33}/g,
    ],
    GOOGLE: [
      /['"](google[_-]?api[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{39})['"]/gi,
    ],
    FACEBOOK: [
      /['"](facebook[_-]?app[_-]?secret)['"]\s*[:=]\s*['"]([a-z0-9]{32})['"]/gi,
    ],
    TWITTER: [
      /['"](twitter[_-]?api[_-]?key)['"]\s*[:=]\s*['"]([a-zA-Z0-9]{25})['"]/gi,
      /['"](twitter[_-]?api[_-]?secret)['"]\s*[:=]\s*['"]([a-zA-Z0-9]{50})['"]/gi,
    ],
    PASSWORD: [
      /['"](password|passwd|pwd)['"]\s*[:=]\s*['"]([^'"]{6,})['"]/gi,
    ],
    SECRET: [
      /['"](secret[_-]?key|client[_-]?secret)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-]{20,})['"]/gi,
    ],
    TOKEN: [
      /['"](auth[_-]?token|access[_-]?token|bearer[_-]?token)['"]\s*[:=]\s*['"]([a-zA-Z0-9_\-\.]{20,})['"]/gi,
    ],
    PRIVATE_KEY: [
      /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/g,
    ]
  };

  const foundTokens = {
    tokens: [],
    scriptsAnalyzed: 0
  };

  function analyzeScript(content, scriptUrl, results) {
    for (const [type, regexList] of Object.entries(patterns)) {
      for (const regex of regexList) {
        let match;
        while ((match = regex.exec(content)) !== null) {
          const value = match[2] || match[1] || match[0];

          const isDuplicate = results.tokens.some(t =>
            t.value === value && t.scriptUrl === scriptUrl
          );

          if (!isDuplicate && value.length > 10) {
            const matchIndex = match.index;
            const contextStart = Math.max(0, matchIndex - 50);
            const contextEnd = Math.min(content.length, matchIndex + match[0].length + 50);
            const context = content.substring(contextStart, contextEnd).replace(/\s+/g, ' ');

            results.tokens.push({
              id: `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type,
              value,
              scriptUrl,
              context: context.length < 200 ? context : context.substring(0, 200) + '...'
            });
          }
        }
      }
    }
  }

  try {
    const scripts = Array.from(document.scripts);

    scripts.forEach(script => {
      if (script.textContent) {
        foundTokens.scriptsAnalyzed++;
        analyzeScript(script.textContent, script.src || 'inline script', foundTokens);
      }
    });

    const externalScripts = scripts.filter(s => s.src);

    for (const script of externalScripts) {
      try {
        const response = await fetch(script.src);
        const content = await response.text();
        foundTokens.scriptsAnalyzed++;
        analyzeScript(content, script.src, foundTokens);
      } catch (error) {
        console.log('Could not analyze:', script.src);
      }
    }
  } catch (error) {
    console.error('Error during scan:', error);
  }

  return foundTokens;
}

/**
 * Render scan results
 */
function renderResults() {
  elements.tokenCount.textContent = scanResults.length;

  // Update stats
  const stats = {
    valid: scanResults.filter(r => r.validation?.valid === true).length,
    invalid: scanResults.filter(r => r.validation?.valid === false).length,
    unknown: scanResults.filter(r => !r.validation || r.validation.valid === undefined).length
  };

  elements.statValid.textContent = stats.valid;
  elements.statInvalid.textContent = stats.invalid;
  elements.statUnknown.textContent = stats.unknown;

  // Render list
  if (scanResults.length === 0) {
    elements.emptyState.classList.remove('hidden');
    elements.resultsList.innerHTML = '';
    elements.resultsList.appendChild(elements.emptyState);
    return;
  }

  elements.emptyState.classList.add('hidden');
  elements.resultsList.innerHTML = '';

  for (const result of scanResults) {
    const item = createTokenItem(result);
    elements.resultsList.appendChild(item);
  }
}

/**
 * Create token item element
 */
function createTokenItem(token) {
  const item = document.createElement('div');

  // Determine validation status
  let validationClass = 'unknown';
  let badgeClass = 'badge-unknown';
  let badgeText = 'UNKNOWN';

  if (token.validation) {
    if (token.validation.valid === true) {
      validationClass = 'valid';
      badgeClass = 'badge-valid';
      badgeText = 'VALID';
    } else if (token.validation.valid === false) {
      validationClass = 'invalid';
      badgeClass = 'badge-invalid';
      badgeText = 'INVALID';
    }
  }

  item.className = `token-item ${validationClass}`;
  item.dataset.id = token.id;

  const typeLabel = getTypeLabel(token.type);
  const scriptName = token.scriptUrl ? truncateUrl(token.scriptUrl, 40) : 'inline';

  item.innerHTML = `
    <div class="token-header">
      <div class="flex items-center gap-sm">
        <span class="severity-indicator ${validationClass}"></span>
        <span class="token-title">${escapeHtml(typeLabel)}</span>
      </div>
      <span class="badge ${badgeClass}">${badgeText}</span>
    </div>
    <div class="token-meta">
      <span class="token-type">${token.type}</span>
      <span class="token-source">${escapeHtml(scriptName)}</span>
    </div>
    <div class="token-value">
      <code>${escapeHtml(truncate(token.value, 60))}</code>
    </div>
    <div class="token-actions">
      <button class="btn btn-sm btn-ghost view-details">Details</button>
      ${!token.viewed ? '<button class="btn btn-sm btn-ghost mark-viewed">Mark Viewed</button>' : '<span class="badge badge-info">Viewed</span>'}
    </div>
  `;

  // Event listeners
  item.querySelector('.view-details').addEventListener('click', () => showTokenModal(token));

  const markViewedBtn = item.querySelector('.mark-viewed');
  if (markViewedBtn) {
    markViewedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      markAsViewed(token, item);
    });
  }

  return item;
}

/**
 * Show token detail modal
 */
function showTokenModal(token) {
  elements.modalTitle.textContent = getTypeLabel(token.type);

  elements.modalBody.innerHTML = `
    <div class="token-detail-section">
      <h4>Type</h4>
      <p>${token.type}</p>
    </div>

    ${token.validation ? `
    <div class="token-detail-section">
      <h4>Validation Status</h4>
      <p><span class="badge ${token.validation.valid === true ? 'badge-valid' : token.validation.valid === false ? 'badge-invalid' : 'badge-unknown'}">
        ${token.validation.valid === true ? 'VALID' : token.validation.valid === false ? 'INVALID' : 'UNKNOWN'}
      </span>
      ${token.validation.status ? `<span class="text-muted ml-sm">${escapeHtml(token.validation.status)}</span>` : ''}</p>
    </div>
    ` : ''}

    <div class="token-detail-section">
      <h4>Token Value</h4>
      <pre><code>${escapeHtml(token.value)}</code></pre>
    </div>

    <div class="token-detail-section">
      <h4>Source</h4>
      <p><code class="truncate">${escapeHtml(token.scriptUrl || 'inline script')}</code></p>
    </div>

    ${token.context ? `
    <div class="token-detail-section">
      <h4>Context</h4>
      <pre><code>${escapeHtml(token.context)}</code></pre>
    </div>
    ` : ''}
  `;

  // Store current token for actions
  elements.tokenModal.dataset.tokenId = token.id;

  // Update mark viewed button
  elements.modalMarkViewedBtn.classList.toggle('hidden', token.viewed === true);

  elements.tokenModal.classList.add('open');
}

/**
 * Close modal
 */
function closeModal() {
  elements.tokenModal.classList.remove('open');
}

/**
 * Copy token details to clipboard
 */
async function copyTokenDetails() {
  const tokenId = elements.tokenModal.dataset.tokenId;
  const token = scanResults.find(t => t.id === tokenId);

  if (!token) return;

  const text = `
${getTypeLabel(token.type)}
${'='.repeat(40)}
Type: ${token.type}
Value: ${token.value}
Source: ${token.scriptUrl || 'inline'}
${token.validation ? `Validation: ${token.validation.valid === true ? 'VALID' : token.validation.valid === false ? 'INVALID' : 'UNKNOWN'}` : ''}
${token.context ? `Context: ${token.context}` : ''}
  `.trim();

  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard', 'success');
  } catch (e) {
    showToast('Failed to copy', 'error');
  }
}

/**
 * Mark token as viewed from modal
 */
function markCurrentTokenViewed() {
  const tokenId = elements.tokenModal.dataset.tokenId;
  const token = scanResults.find(t => t.id === tokenId);

  if (!token) return;

  const item = elements.resultsList.querySelector(`[data-id="${tokenId}"]`);
  if (item) {
    markAsViewed(token, item);
  }

  elements.modalMarkViewedBtn.classList.add('hidden');
}

/**
 * Mark token as viewed
 */
async function markAsViewed(token, divElement) {
  try {
    token.viewed = true;
    token.viewedAt = new Date().toISOString();

    await chrome.runtime.sendMessage({
      action: 'markTokenViewed',
      tokenId: token.id,
      tokenValue: token.value
    });

    // Update the card
    const markViewedBtn = divElement.querySelector('.mark-viewed');
    if (markViewedBtn) {
      markViewedBtn.remove();
    }

    const actionsDiv = divElement.querySelector('.token-actions');
    const viewedBadge = document.createElement('span');
    viewedBadge.className = 'badge badge-info';
    viewedBadge.textContent = 'Viewed';
    actionsDiv.appendChild(viewedBadge);

    showToast('Marked as viewed', 'success');

  } catch (error) {
    console.error('[BlueHawk] Error marking as viewed:', error);
    showToast('Error marking token', 'error');
  }
}

/**
 * Export results
 */
async function exportResults(format) {
  if (scanResults.length === 0) {
    showToast('No results to export', 'error');
    return;
  }

  let content = '';
  let filename = '';

  if (format === 'json') {
    content = JSON.stringify(scanResults, null, 2);
    filename = `bluehawk-export-${Date.now()}.json`;
  } else if (format === 'csv') {
    const headers = ['Type', 'Value', 'Source', 'Validation', 'Context'];
    const rows = scanResults.map(t => [
      t.type,
      t.value,
      t.scriptUrl || 'inline',
      t.validation?.valid === true ? 'VALID' : t.validation?.valid === false ? 'INVALID' : 'UNKNOWN',
      t.context || ''
    ]);
    content = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    filename = `bluehawk-export-${Date.now()}.csv`;
  }

  // Download
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  showToast('Export downloaded', 'success');
}

/**
 * Clear results
 */
function clearResults() {
  scanResults = [];
  renderResults();
  showToast('Results cleared', 'success');
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/**
 * Helper functions
 */
function getTypeLabel(type) {
  const labels = {
    'AWS': 'AWS Credentials',
    'GOOGLE': 'Google API Key',
    'FIREBASE': 'Firebase Config',
    'GITHUB': 'GitHub Token',
    'GITLAB': 'GitLab Token',
    'VERCEL': 'Vercel Token',
    'STRIPE': 'Stripe Key',
    'SLACK': 'Slack Token',
    'SUPABASE': 'Supabase Key',
    'API_KEY': 'API Key',
    'JWT': 'JWT Token',
    'SECRET': 'Secret Key',
    'TOKEN': 'Auth Token',
    'PASSWORD': 'Password',
    'PRIVATE_KEY': 'Private Key'
  };
  return labels[type] || 'Suspicious Credential';
}

function truncateUrl(url, maxLength = 50) {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
}

function truncate(str, maxLength) {
  if (!str || str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
