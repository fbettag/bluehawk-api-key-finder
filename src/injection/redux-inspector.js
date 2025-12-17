/**
 * BlueHawk API Key Finder - Redux Inspector
 *
 * Main world injection script for inspecting Redux store state.
 */

(function() {
  'use strict';

  const HAWK_PREFIX = 'HAWK_REDUX';

  // ========================================
  // REDUX STORE DETECTION
  // ========================================

  /**
   * Find Redux store in common locations
   */
  function findReduxStore() {
    const locations = [
      window.store,
      window.__REDUX_STORE__,
      window.__store,
      // Next.js
      window.__NEXT_REDUX_STORE__,
      window.__NEXT_DATA__?.props?.pageProps?.store,
    ];

    for (const store of locations) {
      if (store && typeof store.getState === 'function') {
        return store;
      }
    }

    // Try Redux DevTools extension
    const devTools = window.__REDUX_DEVTOOLS_EXTENSION__;
    if (devTools && devTools.store) {
      return devTools.store;
    }

    return null;
  }

  /**
   * Check if Redux is present
   */
  function hasRedux() {
    return !!findReduxStore();
  }

  // ========================================
  // SECRET DETECTION
  // ========================================

  const SECRET_KEYS = [
    'apikey', 'api_key', 'apiKey',
    'secret', 'secretKey', 'secret_key',
    'token', 'accessToken', 'access_token', 'authToken', 'auth_token',
    'password', 'passwd', 'pwd',
    'credential', 'credentials',
    'privateKey', 'private_key',
    'clientSecret', 'client_secret',
    'jwt', 'bearer',
  ];

  /**
   * Check if a key looks like a secret
   */
  function isSecretKey(key) {
    const lower = key.toLowerCase();
    return SECRET_KEYS.some(s => lower.includes(s.toLowerCase()));
  }

  /**
   * Recursively scan object for secrets
   */
  function scanObject(obj, path = '', findings = [], depth = 0) {
    if (!obj || typeof obj !== 'object' || depth > 10) return findings;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === 'string' && value.length > 10) {
        if (isSecretKey(key)) {
          findings.push({
            path: currentPath,
            key,
            value,
            type: 'redux-state',
          });
        }
      } else if (typeof value === 'object' && value !== null) {
        scanObject(value, currentPath, findings, depth + 1);
      }
    }

    return findings;
  }

  /**
   * Scan Redux store for secrets
   */
  function scanReduxStore() {
    const store = findReduxStore();

    if (!store) {
      return { success: false, error: 'Redux store not found' };
    }

    try {
      const state = store.getState();
      const findings = scanObject(state);

      return {
        success: true,
        findings,
        stateKeys: Object.keys(state),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ========================================
  // STORE SUBSCRIPTION
  // ========================================

  let unsubscribe = null;

  /**
   * Subscribe to store changes
   */
  function subscribeToStore() {
    const store = findReduxStore();
    if (!store || unsubscribe) return;

    try {
      unsubscribe = store.subscribe(() => {
        const result = scanReduxStore();

        if (result.success && result.findings.length > 0) {
          window.postMessage({
            type: HAWK_PREFIX + '_UPDATE',
            result,
            timestamp: Date.now(),
          }, '*');
        }
      });

      return true;
    } catch {
      return false;
    }
  }

  // ========================================
  // MESSAGE HANDLING
  // ========================================

  window.addEventListener('message', (event) => {
    if (event.data?.type === HAWK_PREFIX + '_SCAN') {
      const result = scanReduxStore();

      window.postMessage({
        type: HAWK_PREFIX + '_RESULT',
        result,
        timestamp: Date.now(),
      }, '*');
    }

    if (event.data?.type === HAWK_PREFIX + '_SUBSCRIBE') {
      const success = subscribeToStore();

      window.postMessage({
        type: HAWK_PREFIX + '_SUBSCRIBED',
        success,
        timestamp: Date.now(),
      }, '*');
    }
  });

  // Notify content script that inspector is ready
  window.postMessage({
    type: HAWK_PREFIX + '_READY',
    hasRedux: hasRedux(),
    timestamp: Date.now(),
  }, '*');

})();
