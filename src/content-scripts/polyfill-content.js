/**
 * WebExtension Polyfill for Content Scripts (Non-module)
 * Standalone version that can be injected into content scripts
 */

// Import the webextension-polyfill module dynamically for content scripts
(function () {
  // Check if we're in a browser extension environment
  if (typeof chrome !== "undefined" || typeof browser !== "undefined") {
    // For Chrome, create a basic polyfill that matches Firefox's promise-based API
    if (typeof browser === "undefined" && typeof chrome !== "undefined") {
      globalThis.browser = {
        runtime: {
          sendMessage: (...args) => {
            return new Promise((resolve, reject) => {
              chrome.runtime.sendMessage(...args, (response) => {
                if (chrome.runtime.lastError) {
                  reject(chrome.runtime.lastError);
                } else {
                  resolve(response);
                }
              });
            });
          },
          getURL: (path) => chrome.runtime.getURL(path),
          onMessage: chrome.runtime.onMessage,
        },
        storage: {
          local: {
            get: (keys) => {
              return new Promise((resolve, reject) => {
                chrome.storage.local.get(keys, (result) => {
                  if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                  } else {
                    resolve(result);
                  }
                });
              });
            },
            set: (items) => {
              return new Promise((resolve, reject) => {
                chrome.storage.local.set(items, () => {
                  if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                  } else {
                    resolve();
                  }
                });
              });
            },
            remove: (keys) => {
              return new Promise((resolve, reject) => {
                chrome.storage.local.remove(keys, () => {
                  if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                  } else {
                    resolve();
                  }
                });
              });
            },
          },
        },
      };
    }
    console.log(`[${new Date().toTimeString().slice(0, 8)}] Browser API polyfill loaded for content scripts`);
  }
})();
