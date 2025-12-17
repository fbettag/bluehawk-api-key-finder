/**
 * BlueHawk API Key Finder - Main World Injector
 *
 * Utility for injecting scripts into the page's main world.
 */

/**
 * Inject a script into the page's main world
 *
 * @param {string} scriptPath - Path to the script (relative to extension)
 */
export function injectScript(scriptPath) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(scriptPath);
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);
}

/**
 * Inject all dynamic analysis scripts
 */
export function injectDynamicAnalysis() {
  // Inject network hooks
  injectScript('injected/network-hooks.js');

  // Inject framework inspectors after a delay (wait for app to load)
  setTimeout(() => {
    injectScript('injected/react-inspector.js');
    injectScript('injected/redux-inspector.js');
  }, 1000);
}

/**
 * Listen for messages from injected scripts
 */
export function setupInjectionListener(callback) {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    const { type, ...data } = event.data || {};

    if (type?.startsWith('HAWK_')) {
      callback(type, data);
    }
  });
}

export default {
  injectScript,
  injectDynamicAnalysis,
  setupInjectionListener,
};
