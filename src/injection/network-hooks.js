/**
 * BlueHawk API Key Finder - Network Hooks
 *
 * Main world injection script for intercepting network requests.
 * Captures secrets in fetch/XHR requests and responses.
 *
 * This script runs in the page's main world, not the isolated extension context.
 */

(function() {
  'use strict';

  const HAWK_PREFIX = 'HAWK_NETWORK';

  // ========================================
  // FETCH INTERCEPTION
  // ========================================

  const originalFetch = window.fetch;

  window.fetch = async function(...args) {
    const [input, init] = args;

    // Capture request details
    const requestUrl = typeof input === 'string' ? input : input.url;
    const requestHeaders = init?.headers || {};

    // Check for secrets in request headers
    analyzeHeaders(requestHeaders, requestUrl, 'request');

    // Check for secrets in request body
    if (init?.body) {
      analyzeBody(init.body, requestUrl, 'request');
    }

    // Call original fetch
    const response = await originalFetch.apply(this, args);

    // Clone response to allow dual reading
    const clone = response.clone();

    // Analyze response asynchronously
    clone.text().then(body => {
      analyzeBody(body, response.url, 'response');
    }).catch(() => {
      // Ignore stream errors
    });

    return response;
  };

  // ========================================
  // XHR INTERCEPTION
  // ========================================

  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const originalXHRSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._hawkUrl = url;
    this._hawkMethod = method;
    this._hawkHeaders = {};
    return originalXHROpen.apply(this, [method, url, ...args]);
  };

  XMLHttpRequest.prototype.setRequestHeader = function(name, value) {
    if (this._hawkHeaders) {
      this._hawkHeaders[name] = value;
    }
    return originalXHRSetRequestHeader.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    // Analyze request headers
    if (this._hawkHeaders) {
      analyzeHeaders(this._hawkHeaders, this._hawkUrl, 'request');
    }

    // Analyze request body
    if (body) {
      analyzeBody(body, this._hawkUrl, 'request');
    }

    // Listen for response
    this.addEventListener('load', function() {
      try {
        analyzeBody(this.responseText, this._hawkUrl, 'response');
      } catch {
        // Ignore errors
      }
    });

    return originalXHRSend.apply(this, arguments);
  };

  // ========================================
  // ANALYSIS FUNCTIONS
  // ========================================

  /**
   * Analyze headers for potential secrets
   */
  function analyzeHeaders(headers, url, direction) {
    const sensitiveHeaders = [
      'authorization',
      'x-api-key',
      'x-auth-token',
      'api-key',
      'bearer',
    ];

    const headersObj = headers instanceof Headers
      ? Object.fromEntries(headers.entries())
      : headers;

    for (const [name, value] of Object.entries(headersObj)) {
      const lowerName = name.toLowerCase();

      if (sensitiveHeaders.some(h => lowerName.includes(h))) {
        reportFinding({
          type: 'header',
          name,
          value,
          url,
          direction,
        });
      }
    }
  }

  /**
   * Analyze body content for potential secrets
   */
  function analyzeBody(body, url, direction) {
    if (!body || typeof body !== 'string') return;

    // Skip large bodies
    if (body.length > 1000000) return;

    // Try to parse as JSON
    try {
      const json = JSON.parse(body);
      analyzeJsonForSecrets(json, url, direction);
    } catch {
      // Not JSON, analyze as text
      analyzeTextForSecrets(body, url, direction);
    }
  }

  /**
   * Analyze JSON object for secrets
   */
  function analyzeJsonForSecrets(obj, url, direction, path = '') {
    if (!obj || typeof obj !== 'object') return;

    const secretKeys = [
      'api_key', 'apikey', 'api-key',
      'secret', 'password', 'token',
      'access_token', 'auth_token',
      'private_key', 'client_secret',
    ];

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      const lowerKey = key.toLowerCase();

      if (typeof value === 'string' && value.length > 10) {
        const isSensitiveKey = secretKeys.some(sk => lowerKey.includes(sk));

        if (isSensitiveKey) {
          reportFinding({
            type: 'json',
            key: currentPath,
            value,
            url,
            direction,
          });
        }
      } else if (typeof value === 'object') {
        analyzeJsonForSecrets(value, url, direction, currentPath);
      }
    }
  }

  /**
   * Analyze text for secret patterns
   */
  function analyzeTextForSecrets(text, url, direction) {
    // Quick patterns for common secrets
    const patterns = [
      { name: 'AWS', pattern: /(AKIA|ASIA)[A-Z0-9]{16}/g },
      { name: 'GitHub', pattern: /ghp_[a-zA-Z0-9]{36}/g },
      { name: 'Stripe', pattern: /sk_live_[0-9a-zA-Z]{24,}/g },
    ];

    for (const { name, pattern } of patterns) {
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(text)) !== null) {
        reportFinding({
          type: 'pattern',
          name,
          value: match[0],
          url,
          direction,
        });
      }
    }
  }

  /**
   * Report finding to content script
   */
  function reportFinding(finding) {
    window.postMessage({
      type: HAWK_PREFIX,
      finding: {
        ...finding,
        timestamp: Date.now(),
        source: 'network-hooks',
      },
    }, '*');
  }

  // Notify content script that hooks are installed
  window.postMessage({
    type: HAWK_PREFIX + '_READY',
    timestamp: Date.now(),
  }, '*');

})();
