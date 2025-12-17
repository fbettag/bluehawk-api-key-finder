/**
 * BlueHawk API Key Finder - Popup Script
 */

// Helper to set scanning state (theme turns red while scanning)
async function setScanningState(isScanning) {
  const { settings } = await chrome.storage.local.get('settings');
  const isAutoMode = settings && settings.autoScanEnabled;

  if (isScanning || isAutoMode) {
    document.body.classList.add('theme-red');
  } else {
    document.body.classList.remove('theme-red');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const scanBtn = document.getElementById('scanBtn');
  const loading = document.getElementById('loading');
  const stats = document.getElementById('stats');
  const results = document.getElementById('results');
  const scriptsCount = document.getElementById('scriptsCount');
  const tokensCount = document.getElementById('tokensCount');

  // Load auto mode state
  loadAutoModeState();

  // Check if Deep Scan in progress
  checkDeepScanState();

  // Event listeners
  scanBtn.addEventListener('click', performScan);
  document.getElementById('deepScanBtn').addEventListener('click', performDeepScan);
  document.getElementById('settingsBtn').addEventListener('click', openSettings);
  document.getElementById('historyBtn').addEventListener('click', openHistory);
  document.getElementById('modeIndicator').addEventListener('click', toggleAutoMode);
});

// Load auto mode state
async function loadAutoModeState() {
  try {
    const { settings } = await chrome.storage.local.get('settings');
    const modeIndicator = document.getElementById('modeIndicator');
    const isAutoMode = settings && settings.autoScanEnabled;

    // Update theme and mode indicator
    if (isAutoMode) {
      document.body.classList.add('theme-red');
      modeIndicator.textContent = '🔴 Auto Mode Active';
      modeIndicator.className = 'mode-indicator clickable auto-on';
    } else {
      document.body.classList.remove('theme-red');
      modeIndicator.textContent = '🔵 Manual Mode';
      modeIndicator.className = 'mode-indicator clickable auto-off';
    }
  } catch (error) {
    console.error('Error loading state:', error);
  }
}

// Check if Deep Scan in progress
async function checkDeepScanState() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'getDeepScanState' });

    if (response.status === 'success' && response.state.isRunning) {
      const state = response.state;
      const loading = document.getElementById('loading');
      const loadingText = document.getElementById('loadingText');
      const scanBtn = document.getElementById('scanBtn');
      const deepScanBtn = document.getElementById('deepScanBtn');
      const results = document.getElementById('results');

      scanBtn.style.display = 'none';
      deepScanBtn.style.display = 'none';
      loading.style.display = 'flex';

      const elapsedTime = Math.floor((Date.now() - state.startTime) / 1000);
      const minutes = Math.floor(elapsedTime / 60);
      const seconds = elapsedTime % 60;

      loadingText.innerHTML = `
        Deep Scan in progress...<br>
        <small>Time: ${minutes}m ${seconds}s | Scripts: ${state.progress.scriptsAnalyzed} | Tokens: ${state.progress.tokensFound}</small>
      `;

      results.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">🔄</div>
          <p>Deep Scan in progress...</p>
          <p style="font-size: 10px; margin-top: 5px;">
            The scan will continue running in background even if you close the popup.
          </p>
        </div>
      `;
    }
  } catch (error) {
    console.log('No Deep Scan in progress');
  }
}

// Perform manual scan
async function performScan() {
  const scanBtn = document.getElementById('scanBtn');
  const loading = document.getElementById('loading');
  const stats = document.getElementById('stats');
  const results = document.getElementById('results');
  const scriptsCount = document.getElementById('scriptsCount');
  const tokensCount = document.getElementById('tokensCount');

  results.innerHTML = '';
  stats.style.display = 'none';
  scanBtn.style.display = 'none';
  loading.style.display = 'flex';
  setScanningState(true);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      throw new Error('No active tab found');
    }

    const response = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scanForHardcodedTokens
    });

    if (!response || !response[0] || !response[0].result) {
      throw new Error('Error executing scan on page');
    }

    const foundTokens = response[0].result;

    if (foundTokens.tokens.length > 0) {
      chrome.runtime.sendMessage({
        action: 'manualScan',
        data: foundTokens
      }).catch(err => console.log('Background not available:', err));
    }

    loading.style.display = 'none';
    stats.style.display = 'block';
    scanBtn.style.display = 'block';
    setScanningState(false);

    scriptsCount.textContent = foundTokens.scriptsAnalyzed;
    tokensCount.textContent = foundTokens.tokens.length;

    if (foundTokens.tokens.length > 0) {
      foundTokens.tokens.forEach(token => {
        const resultItem = createResultItem(token);
        results.appendChild(resultItem);
      });
    } else {
      results.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">✅</div>
          <p>No hardcoded tokens found!</p>
          <p style="font-size: 10px; margin-top: 5px;">The page appears to be secure.</p>
        </div>
      `;
    }
  } catch (error) {
    loading.style.display = 'none';
    scanBtn.style.display = 'block';
    setScanningState(false);
    console.error('Error:', error);
    results.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">❌</div>
        <p>Error scanning the page</p>
        <p style="font-size: 10px; margin-top: 5px;">${error.message}</p>
        <p style="font-size: 9px; margin-top: 3px; color: #999;">Tip: Reload the page (F5) and try again</p>
      </div>
    `;
  }
}

// Scan function to be injected in page
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

function createResultItem(token) {
  const div = document.createElement('div');

  let itemClass = 'result-item';
  if (token.validation?.valid === true) {
    itemClass += ' result-item-critical';
  }
  div.className = itemClass;

  const typeEmoji = getTypeEmoji(token.type);
  const typeLabel = getTypeLabel(token.type);

  let validationBadge = '';
  if (token.validation) {
    if (token.validation.valid === true) {
      validationBadge = `<span class="validation-badge validation-valid">VALID</span>`;
    } else if (token.validation.valid === false) {
      validationBadge = `<span class="validation-badge validation-invalid">Invalid</span>`;
    } else {
      validationBadge = `<span class="validation-badge validation-unknown">Not validated</span>`;
    }
  }

  const tokenId = `token-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  token.id = token.id || tokenId;

  const isViewed = token.viewed === true;

  div.innerHTML = `
    <div class="result-header">
      <span class="result-icon">${typeEmoji}</span>
      <span class="result-title">${typeLabel}</span>
      <span class="result-type">${token.type}</span>
      ${validationBadge}
      ${isViewed ? '<span class="viewed-badge">Viewed</span>' : ''}
    </div>
    ${token.validation && token.validation.valid === true ? `
      <div class="validation-warning">
        ALERT: This token is ACTIVE and FUNCTIONAL!<br>
        <strong>Status:</strong> ${escapeHtml(token.validation.status)}
        ${token.validation.severity ? `<br><strong>Severity:</strong> ${token.validation.severity}` : ''}
        ${token.validation.metadata ? `<br><strong>Info:</strong> ${JSON.stringify(token.validation.metadata)}` : ''}
      </div>
    ` : ''}
    ${token.validation && token.validation.status && token.validation.valid !== true ? `
      <div class="validation-info">
        <strong>Validation:</strong> ${escapeHtml(token.validation.status)}
      </div>
    ` : ''}
    <div class="result-script">
      Script: <a href="${token.scriptUrl}" target="_blank">${truncateUrl(token.scriptUrl)}</a>
    </div>
    <div class="result-token">
      <strong>Token found:</strong><br>
      ${escapeHtml(token.value)}
    </div>
    ${token.context ? `<div class="result-token" style="margin-top: 5px; border-left-color: #667eea;">
      <strong>Context:</strong><br>
      ${escapeHtml(token.context)}
    </div>` : ''}
    ${!isViewed ? `
      <button class="mark-viewed-btn" data-token-id="${token.id}">
        Mark as Viewed
      </button>
    ` : ''}
  `;

  if (!isViewed) {
    const viewedBtn = div.querySelector('.mark-viewed-btn');
    if (viewedBtn) {
      viewedBtn.addEventListener('click', function() {
        markAsViewed(token, div);
      });
    }
  }

  return div;
}

function getTypeEmoji(type) {
  const emojis = {
    'API_KEY': '🔑',
    'JWT': '🎫',
    'AWS': '☁️',
    'GITHUB': '🐙',
    'GITLAB': '🦊',
    'VERCEL': '▲',
    'SUPABASE': '⚡',
    'SLACK': '💬',
    'STRIPE': '💳',
    'FIREBASE': '🔥',
    'GOOGLE': '🔍',
    'FACEBOOK': '👤',
    'TWITTER': '🐦',
    'PASSWORD': '🔐',
    'SECRET': '🤫',
    'TOKEN': '🎟️',
    'PRIVATE_KEY': '🔒'
  };
  return emojis[type] || '⚠️';
}

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
    'API_KEY': 'API Key Detected',
    'JWT': 'JWT Token',
    'SECRET': 'Secret Key',
    'TOKEN': 'Token',
    'PASSWORD': 'Password',
    'PRIVATE_KEY': 'Private Key'
  };
  return labels[type] || 'Suspicious Credential';
}

function truncateUrl(url, maxLength = 50) {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openSettings() {
  chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
}

function openHistory() {
  chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
}

// Deep Scan
async function performDeepScan() {
  const scanBtn = document.getElementById('scanBtn');
  const deepScanBtn = document.getElementById('deepScanBtn');
  const loading = document.getElementById('loading');
  const loadingText = document.getElementById('loadingText');
  const stats = document.getElementById('stats');
  const results = document.getElementById('results');

  results.innerHTML = '';
  stats.style.display = 'none';
  scanBtn.style.display = 'none';
  deepScanBtn.style.display = 'none';
  loading.style.display = 'flex';
  loadingText.textContent = 'Deep Scan in progress... (may take a few minutes)';
  setScanningState(true);

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.id) {
      throw new Error('No active tab found');
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.log('Content script may already be loaded:', error.message);
    }

    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'startDeepScan',
      depth: 10
    });

    if (!response) {
      throw new Error('Error executing deep scan on page');
    }

    loading.style.display = 'none';
    stats.style.display = 'block';
    scanBtn.style.display = 'block';
    deepScanBtn.style.display = 'block';
    setScanningState(false);

    const scriptsCountEl = document.getElementById('scriptsCount');
    const tokensCountEl = document.getElementById('tokensCount');

    scriptsCountEl.textContent = response.scriptsAnalyzed;

    const validTokens = response.validTokens || [];
    tokensCountEl.textContent = `${validTokens.length} valid of ${response.tokens.length} total`;

    const vulnerableBuckets = response.vulnerableBuckets || [];
    const totalCritical = validTokens.length + vulnerableBuckets.length;

    if (totalCritical > 0) {
      let alertMessage = '';
      if (validTokens.length > 0 && vulnerableBuckets.length > 0) {
        alertMessage = `${validTokens.length} VALID token(s) + ${vulnerableBuckets.length} VULNERABLE BUCKET(S)!`;
      } else if (validTokens.length > 0) {
        alertMessage = `${validTokens.length} VALID token(s) found!`;
      } else {
        alertMessage = `${vulnerableBuckets.length} VULNERABLE BUCKET(S) TO TAKEOVER!`;
      }

      results.innerHTML = `<div class="alert-banner">${alertMessage}</div>`;

      validTokens.forEach(token => {
        const resultItem = createResultItem(token);
        results.appendChild(resultItem);
      });
    } else if (response.tokens.length > 0) {
      results.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">✅</div>
          <p>${response.tokens.length} item(s) found, but none vulnerable!</p>
          <p style="font-size: 10px; margin-top: 5px;">All were validated and are secure/inactive.</p>
        </div>
      `;
    } else {
      results.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">✅</div>
          <p>No vulnerabilities found!</p>
          <p style="font-size: 10px; margin-top: 5px;">Deep scan complete.</p>
        </div>
      `;
    }
  } catch (error) {
    loading.style.display = 'none';
    scanBtn.style.display = 'block';
    deepScanBtn.style.display = 'block';
    setScanningState(false);
    console.error('Error:', error);
    results.innerHTML = `
      <div class="no-results">
        <div class="no-results-icon">❌</div>
        <p>Error executing deep scan</p>
        <p style="font-size: 10px; margin-top: 5px;">${error.message}</p>
        <p style="font-size: 9px; margin-top: 3px; color: #999;">Tip: Reload the page (F5) and try again</p>
      </div>
    `;
  }
}

async function markAsViewed(token, divElement) {
  try {
    token.viewed = true;
    token.viewedAt = new Date().toISOString();

    await chrome.runtime.sendMessage({
      action: 'markTokenViewed',
      tokenId: token.id,
      tokenValue: token.value
    });

    const resultHeader = divElement.querySelector('.result-header');
    const viewedBtn = divElement.querySelector('.mark-viewed-btn');
    if (viewedBtn) {
      viewedBtn.remove();
    }

    const viewedBadge = document.createElement('span');
    viewedBadge.className = 'viewed-badge viewed-badge-animate';
    viewedBadge.innerHTML = 'Viewed';
    resultHeader.appendChild(viewedBadge);

    setTimeout(() => {
      viewedBadge.classList.remove('viewed-badge-animate');
    }, 500);

  } catch (error) {
    console.error('Error marking as viewed:', error);
    alert('Error marking token: ' + error.message);
  }
}

async function toggleAutoMode() {
  try {
    let { settings } = await chrome.storage.local.get('settings');

    if (!settings) {
      settings = {
        autoScanEnabled: false,
        notificationsEnabled: true,
        discordWebhookEnabled: false,
        discordWebhookUrl: '',
        saveHistory: true,
        scanDelay: 3000,
        minTokenLength: 15
      };
    }

    settings.autoScanEnabled = !settings.autoScanEnabled;

    await chrome.storage.local.set({ settings });
    await loadAutoModeState();

    // Animate the mode indicator
    const modeIndicator = document.getElementById('modeIndicator');
    modeIndicator.style.transform = 'scale(1.1)';
    setTimeout(() => {
      modeIndicator.style.transform = 'scale(1)';
    }, 200);

  } catch (error) {
    console.error('Error toggling auto mode:', error);
    alert('Error toggling mode: ' + error.message);
  }
}
