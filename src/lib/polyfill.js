/**
 * WebExtension Polyfill Setup
 * Uses the battle-tested webextension-polyfill library for cross-browser compatibility
 */

import browser from "webextension-polyfill";

// Make browser API available globally
globalThis.browser = browser;

console.log("[Polyfill] WebExtension polyfill loaded, cross-browser API available");
