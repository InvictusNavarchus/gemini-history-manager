/**
 * Browser API compatibility shim
 * Provides unified browser API for both Chrome and Firefox extensions
 */

// Create a unified browser API that works in both Chrome and Firefox
if (typeof browser === "undefined" && typeof chrome !== "undefined") {
  // Chrome environment - create browser namespace from chrome API
  globalThis.browser = {
    // Storage API
    storage: {
      local: {
        get: (keys) => chrome.storage.local.get(keys),
        set: (items) => chrome.storage.local.set(items),
        remove: (keys) => chrome.storage.local.remove(keys),
        clear: () => chrome.storage.local.clear(),
      },
    },

    // Runtime API
    runtime: {
      getManifest: () => chrome.runtime.getManifest(),
      getURL: (path) => chrome.runtime.getURL(path),
      sendMessage: (message) => chrome.runtime.sendMessage(message),
      onMessage: {
        addListener: (callback) => chrome.runtime.onMessage.addListener(callback),
        removeListener: (callback) => chrome.runtime.onMessage.removeListener(callback),
      },
      onInstalled: {
        addListener: (callback) => chrome.runtime.onInstalled.addListener(callback),
        removeListener: (callback) => chrome.runtime.onInstalled.removeListener(callback),
      },
      onStartup: {
        addListener: (callback) => chrome.runtime.onStartup.addListener(callback),
        removeListener: (callback) => chrome.runtime.onStartup.removeListener(callback),
      },
    },

    // Action API (for browser action)
    action: {
      setBadgeText: (details) => chrome.action.setBadgeText(details),
      setBadgeBackgroundColor: (details) => chrome.action.setBadgeBackgroundColor(details),
      onClicked: {
        addListener: (callback) => chrome.action.onClicked.addListener(callback),
        removeListener: (callback) => chrome.action.onClicked.removeListener(callback),
      },
    },

    // Tabs API
    tabs: {
      create: (createProperties) => chrome.tabs.create(createProperties),
      query: (queryInfo) => chrome.tabs.query(queryInfo),
      sendMessage: (tabId, message) => chrome.tabs.sendMessage(tabId, message),
    },
  };

  console.log("[Browser Shim] Chrome environment detected, created browser API wrapper");
} else if (typeof browser !== "undefined") {
  console.log("[Browser Shim] Firefox environment detected, using native browser API");
} else {
  console.warn("[Browser Shim] No browser extension API detected");
}
