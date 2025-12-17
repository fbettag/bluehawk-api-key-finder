/**
 * BlueHawk API Key Finder - Content Script
 *
 * Main content script that runs in web page context.
 * Handles script extraction, analysis coordination, message passing,
 * and dynamic injection for runtime analysis.
 */

import { TOKEN_PATTERNS, API_ENDPOINT_PATTERNS } from '@shared/patterns';
import { isFalsePositive } from '@shared/false-positive-filters';
import {
  getTokenSeverity,
  shouldSkipDomain,
  isCDNUrl,
  isSameDomain,
  SCAN_CONFIG,
  CACHE_CONFIG,
} from '@shared/constants';

// ========================================
// STATE MANAGEMENT
// ========================================

// Prevent multiple executions
if (window.bluehawkApiKeyFinderLoaded) {
  console.log('BlueHawk API Key Finder already loaded');
} else {
  window.bluehawkApiKeyFinderLoaded = true;
  console.log('BlueHawk API Key Finder - Content Script loaded (v2.0)');

  // State for dynamic findings
  const dynamicFindings = [];
  let dynamicAnalysisEnabled = false;
  let hooksReady = {
    network: false,
    react: false,
    redux: false
  };

  // ========================================
  // DYNAMIC INJECTION SYSTEM
  // ========================================

  /**
   * Inject a script into the page's main world
   * @param {string} scriptPath - Path relative to extension root
   * @returns {Promise<void>}
   */
  function injectScript(scriptPath) {
    return new Promise((resolve, reject) => {
      try {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL(scriptPath);
        script.onload = () => {
          script.remove();
          resolve();
        };
        script.onerror = (err) => {
          script.remove();
          reject(new Error(`Failed to inject ${scriptPath}`));
        };
        (document.head || document.documentElement).appendChild(script);
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Set up listener for messages from injected scripts
   */
  function setupDynamicListener() {
    window.addEventListener('message', (event) => {
      // Only accept messages from same window
      if (event.source !== window) return;

      const data = event.data;
      if (!data || typeof data.type !== 'string') return;

      // Handle BlueHawk messages
      if (data.type.startsWith('HAWK_')) {
        handleDynamicMessage(data);
      }
    });
  }

  /**
   * Handle messages from injected scripts
   */
  function handleDynamicMessage(data) {
    const { type, ...payload } = data;

    switch (type) {
      case 'HAWK_NETWORK':
        // Network hook finding
        if (payload.finding) {
          dynamicFindings.push({
            ...payload.finding,
            analysisType: 'dynamic',
            hookType: 'network'
          });
          console.log('[BlueHawk] Network finding:', payload.finding.type, payload.finding.name);
        }
        break;

      case 'HAWK_NETWORK_READY':
        hooksReady.network = true;
        console.log('[BlueHawk] Network hooks installed');
        break;

      case 'HAWK_REACT':
        // React inspector finding
        if (payload.finding) {
          dynamicFindings.push({
            ...payload.finding,
            analysisType: 'dynamic',
            hookType: 'react'
          });
          console.log('[BlueHawk] React finding:', payload.finding.component, payload.finding.prop);
        }
        break;

      case 'HAWK_REACT_READY':
        hooksReady.react = true;
        console.log('[BlueHawk] React inspector installed');
        break;

      case 'HAWK_REDUX':
        // Redux inspector finding
        if (payload.finding) {
          dynamicFindings.push({
            ...payload.finding,
            analysisType: 'dynamic',
            hookType: 'redux'
          });
          console.log('[BlueHawk] Redux finding:', payload.finding.path);
        }
        break;

      case 'HAWK_REDUX_READY':
        hooksReady.redux = true;
        console.log('[BlueHawk] Redux inspector installed');
        break;

      default:
        // Unknown message type, ignore
        break;
    }

    // Notify background script of dynamic findings
    if (payload.finding) {
      try {
        chrome.runtime.sendMessage({
          action: 'dynamicFinding',
          finding: payload.finding,
          url: window.location.href
        });
      } catch (err) {
        // Extension context may be invalidated, ignore
      }
    }
  }

  /**
   * Enable dynamic analysis by injecting hooks
   */
  async function enableDynamicAnalysis() {
    if (dynamicAnalysisEnabled) return;

    try {
      // Set up listener first
      setupDynamicListener();

      // Inject network hooks immediately
      await injectScript('injected/network-hooks.js');
      console.log('[BlueHawk] Network hooks injected');

      // Inject framework inspectors after a delay (wait for app to initialize)
      setTimeout(async () => {
        try {
          await injectScript('injected/react-inspector.js');
          console.log('[BlueHawk] React inspector injected');
        } catch (err) {
          console.warn('[BlueHawk] React inspector failed:', err.message);
        }

        try {
          await injectScript('injected/redux-inspector.js');
          console.log('[BlueHawk] Redux inspector injected');
        } catch (err) {
          console.warn('[BlueHawk] Redux inspector failed:', err.message);
        }
      }, 1000);

      dynamicAnalysisEnabled = true;
    } catch (err) {
      console.error('[BlueHawk] Dynamic analysis injection failed:', err);
    }
  }

  /**
   * Get all dynamic findings
   */
  function getDynamicFindings() {
    return [...dynamicFindings];
  }

  /**
   * Clear dynamic findings
   */
  function clearDynamicFindings() {
    dynamicFindings.length = 0;
  }

  /**
   * Check if hooks are ready
   */
  function areHooksReady() {
    return { ...hooksReady };
  }

  // ========================================
  // STATIC ANALYSIS HELPERS
  // ========================================

  /**
   * Scan text for tokens using patterns
   */
  function scanForTokens(text, sourceUrl = '') {
    const findings = [];

    for (const [patternName, patternRegex] of Object.entries(TOKEN_PATTERNS)) {
      // Clone regex to reset lastIndex
      const regex = new RegExp(patternRegex.source, patternRegex.flags);
      let match;

      while ((match = regex.exec(text)) !== null) {
        const value = match[0];

        // Skip false positives
        if (isFalsePositive(value)) continue;

        findings.push({
          type: patternName,
          value,
          severity: getTokenSeverity(patternName),
          source: sourceUrl,
          analysisType: 'static'
        });
      }
    }

    return findings;
  }

  // ========================================
  // MESSAGE HANDLING
  // ========================================

  /**
   * Handle messages from popup/background
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'enableDynamicAnalysis':
        enableDynamicAnalysis().then(() => {
          sendResponse({ success: true, hooksReady: areHooksReady() });
        }).catch(err => {
          sendResponse({ success: false, error: err.message });
        });
        return true; // Async response

      case 'getDynamicFindings':
        sendResponse({ findings: getDynamicFindings() });
        break;

      case 'clearDynamicFindings':
        clearDynamicFindings();
        sendResponse({ success: true });
        break;

      case 'getHooksStatus':
        sendResponse({ hooksReady: areHooksReady(), enabled: dynamicAnalysisEnabled });
        break;

      case 'scanText':
        const findings = scanForTokens(request.text, request.source);
        sendResponse({ findings });
        break;

      default:
        // Unknown action
        break;
    }
  });

  // ========================================
  // INITIALIZATION
  // ========================================

  /**
   * Check settings and auto-enable dynamic analysis if configured
   */
  async function initializeDynamicAnalysis() {
    try {
      const settings = await chrome.storage.sync.get(['enableDynamicAnalysis']);
      if (settings.enableDynamicAnalysis) {
        console.log('[BlueHawk] Auto-enabling dynamic analysis from settings');
        await enableDynamicAnalysis();
      }
    } catch (err) {
      console.warn('[BlueHawk] Could not load settings:', err.message);
    }
  }

  // Initialize on load
  initializeDynamicAnalysis();

  // Log loaded patterns count
  console.log(`[BlueHawk] Loaded ${Object.keys(TOKEN_PATTERNS).length} token pattern types`);

  // Export functions to window for debugging
  window.bluehawkDebug = {
    getDynamicFindings,
    areHooksReady,
    enableDynamicAnalysis,
    scanForTokens,
    dynamicAnalysisEnabled: () => dynamicAnalysisEnabled
  };
}

// Export for module bundling
export { TOKEN_PATTERNS, isFalsePositive, getTokenSeverity };
