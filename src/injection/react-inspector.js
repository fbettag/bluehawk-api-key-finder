/**
 * BlueHawk API Key Finder - React Inspector
 *
 * Main world injection script for inspecting React component state.
 * Uses React DevTools hook to traverse the Fiber tree.
 */

(function() {
  'use strict';

  const HAWK_PREFIX = 'HAWK_REACT';

  // ========================================
  // REACT DEVTOOLS HOOK ACCESS
  // ========================================

  /**
   * Get React DevTools global hook
   */
  function getReactHook() {
    return window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
  }

  /**
   * Check if React is present on the page
   */
  function hasReact() {
    return !!getReactHook();
  }

  // ========================================
  // FIBER TREE TRAVERSAL
  // ========================================

  /**
   * Get all Fiber roots from the page
   */
  function getFiberRoots() {
    const hook = getReactHook();
    if (!hook || !hook.getFiberRoots) return [];

    const roots = [];
    try {
      // getFiberRoots returns a Set of renderer IDs
      const renderers = hook.renderers;
      if (renderers) {
        for (const [id, renderer] of renderers) {
          const fiberRoots = hook.getFiberRoots(id);
          if (fiberRoots) {
            roots.push(...fiberRoots);
          }
        }
      }
    } catch {
      // Ignore errors
    }

    return roots;
  }

  /**
   * Traverse Fiber tree and extract props
   */
  function traverseFiber(fiber, callback, depth = 0, maxDepth = 50) {
    if (!fiber || depth > maxDepth) return;

    // Process current fiber
    callback(fiber, depth);

    // Traverse child
    if (fiber.child) {
      traverseFiber(fiber.child, callback, depth + 1, maxDepth);
    }

    // Traverse sibling
    if (fiber.sibling) {
      traverseFiber(fiber.sibling, callback, depth, maxDepth);
    }
  }

  // ========================================
  // SECRET DETECTION IN STATE
  // ========================================

  const SECRET_PROP_NAMES = [
    'apikey', 'api_key', 'apiKey',
    'secret', 'secretKey', 'secret_key',
    'token', 'accessToken', 'access_token', 'authToken', 'auth_token',
    'password', 'passwd', 'pwd',
    'credential', 'credentials',
    'privateKey', 'private_key',
    'clientSecret', 'client_secret',
  ];

  /**
   * Check if a prop name looks like a secret
   */
  function isSecretPropName(name) {
    const lower = name.toLowerCase();
    return SECRET_PROP_NAMES.some(s => lower.includes(s.toLowerCase()));
  }

  /**
   * Analyze object for secrets
   */
  function analyzeObject(obj, path = '', findings = []) {
    if (!obj || typeof obj !== 'object') return findings;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === 'string' && value.length > 10) {
        if (isSecretPropName(key)) {
          findings.push({
            path: currentPath,
            value,
            type: 'prop',
          });
        }
      } else if (typeof value === 'object' && value !== null) {
        // Limit recursion depth
        if (currentPath.split('.').length < 5) {
          analyzeObject(value, currentPath, findings);
        }
      }
    }

    return findings;
  }

  /**
   * Scan React component tree for secrets
   */
  function scanReactState() {
    if (!hasReact()) {
      return { success: false, error: 'React not detected' };
    }

    const findings = [];
    const roots = getFiberRoots();

    for (const root of roots) {
      const fiber = root.current;
      if (!fiber) continue;

      traverseFiber(fiber, (node, depth) => {
        // Check memoizedProps
        if (node.memoizedProps) {
          const propFindings = analyzeObject(node.memoizedProps, 'props');
          for (const finding of propFindings) {
            findings.push({
              ...finding,
              componentName: node.type?.displayName || node.type?.name || 'Unknown',
              depth,
            });
          }
        }

        // Check memoizedState
        if (node.memoizedState) {
          const stateFindings = analyzeObject(node.memoizedState, 'state');
          for (const finding of stateFindings) {
            findings.push({
              ...finding,
              componentName: node.type?.displayName || node.type?.name || 'Unknown',
              depth,
            });
          }
        }
      });
    }

    return { success: true, findings };
  }

  // ========================================
  // MESSAGE HANDLING
  // ========================================

  window.addEventListener('message', (event) => {
    if (event.data?.type === HAWK_PREFIX + '_SCAN') {
      const result = scanReactState();

      window.postMessage({
        type: HAWK_PREFIX + '_RESULT',
        result,
        timestamp: Date.now(),
      }, '*');
    }
  });

  // Notify content script that inspector is ready
  window.postMessage({
    type: HAWK_PREFIX + '_READY',
    hasReact: hasReact(),
    timestamp: Date.now(),
  }, '*');

})();
