/**
 * Gemini History Manager - Logging Configuration
 * Central configuration for controlling logging throughout the extension
 */

// Default configuration - all logging enabled
const DEFAULT_CONFIG = {
  // Global enable/disable for all logging
  enabled: true,

  // Enable/disable specific log levels
  levels: {
    debug: true,
    log: true,
    warn: true,
    error: true,
  },

  // Enable/disable logging for specific components/modules
  // If a component is not listed here, it inherits from the global setting
  components: {
    // Core modules
    App: true,
    Background: true,
    ContentScript: true,

    // Dashboard components
    ConversationDetail: true,
    ConversationsList: true,
    DashboardHeader: true,
    Filters: true,
    StatsOverview: true,
    TabNavigation: true,
    Visualizations: true,
    ToastNotification: true,

    // Popup components
    PopupApp: true,
    Header: true,
    ConversationList: true,

    // Utilities
    ThemeManager: true,
    DataHelpers: true,
    ChartHelpers: true,
    ModalHelpers: true,
    UIHelpers: true,
  },
};

// Storage key for persisted config
const CONFIG_STORAGE_KEY = "gemini_log_config";

// Cache for the loaded configuration to avoid frequent localStorage reads
let configCache = null;

/**
 * Load logging configuration from storage, falling back to defaults if not found
 * Uses in-memory cache to reduce storage reads
 * @param {boolean} [forceRefresh=false] - Force refresh from storage
 * @returns {Object} The current logging configuration
 */
export function loadLogConfig(forceRefresh = false) {
  // Return cached config if available and no refresh is requested
  if (configCache !== null && !forceRefresh) {
    return configCache;
  }

  // Determine if we're in a service worker environment (no localStorage)
  const isServiceWorker = typeof localStorage === "undefined";

  // For service worker (background script in Chrome)
  if (isServiceWorker) {
    try {
      // Set default config while we wait for the async storage call to complete
      configCache = DEFAULT_CONFIG;

      // Start the async storage operation but don't wait for it
      // This will update the cache on the next call if needed
      browser.storage.local
        .get(CONFIG_STORAGE_KEY)
        .then((result) => {
          if (result && result[CONFIG_STORAGE_KEY]) {
            const parsedConfig = result[CONFIG_STORAGE_KEY];
            configCache = {
              ...DEFAULT_CONFIG,
              ...parsedConfig,
              levels: {
                ...DEFAULT_CONFIG.levels,
                ...(parsedConfig.levels || {}),
              },
              components: {
                ...DEFAULT_CONFIG.components,
                ...(parsedConfig.components || {}),
              },
            };
          }
        })
        .catch((error) => {
          console.error("Error loading logging config from browser.storage:", error);
          configCache = DEFAULT_CONFIG;
        });

      return DEFAULT_CONFIG;
    } catch (error) {
      console.error("Error in service worker loadLogConfig:", error);
      configCache = DEFAULT_CONFIG;
      return DEFAULT_CONFIG;
    }
  }

  // For regular environments (content scripts, popup, etc.)
  try {
    const storedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);

    if (storedConfig) {
      // Merge with default config to ensure all properties exist
      const parsedConfig = JSON.parse(storedConfig);
      configCache = {
        ...DEFAULT_CONFIG,
        ...parsedConfig,
        levels: {
          ...DEFAULT_CONFIG.levels,
          ...(parsedConfig.levels || {}),
        },
        components: {
          ...DEFAULT_CONFIG.components,
          ...(parsedConfig.components || {}),
        },
      };
      return configCache;
    }
  } catch (error) {
    console.error("Error loading logging config from localStorage:", error);
    // On error, invalidate the cache
    configCache = null;
  }

  // Cache the default config if nothing was loaded
  configCache = DEFAULT_CONFIG;
  return DEFAULT_CONFIG;
}

/**
 * Invalidate the configuration cache
 */
export function invalidateConfigCache() {
  configCache = null;
}

/**
 * Save logging configuration to storage
 * @param {Object} config - The configuration to save
 */
export function saveLogConfig(config) {
  // Determine if we're in a service worker environment (no localStorage)
  const isServiceWorker = typeof localStorage === "undefined";

  // Update the cache with the new config regardless of environment
  configCache = config;

  if (isServiceWorker) {
    try {
      // In service worker, use browser.storage.local (async)
      const saveObj = {};
      saveObj[CONFIG_STORAGE_KEY] = config;
      browser.storage.local.set(saveObj).catch((error) => {
        console.error("Error saving logging config to browser.storage:", error);
      });
      return true;
    } catch (error) {
      console.error("Error in service worker saveLogConfig:", error);
      return false;
    }
  } else {
    // In regular environment, use localStorage (sync)
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
      return true;
    } catch (error) {
      console.error("Error saving logging config to localStorage:", error);
      return false;
    }
  }
}

/**
 * Check if logging is enabled for a specific component and level
 * @param {string} component - The component/module name
 * @param {string} level - The log level (debug, log, warn, error)
 * @returns {boolean} Whether logging is enabled
 */
export function isLoggingEnabled(component, level) {
  const config = loadLogConfig();

  // If logging is globally disabled, return false
  if (!config.enabled) {
    return false;
  }

  // If the log level is disabled, return false
  if (!config.levels[level]) {
    return false;
  }

  // If the component is explicitly configured, use that setting
  if (component && Object.hasOwn(config.components, component)) {
    return config.components[component];
  }

  // Default to true if not explicitly configured
  return true;
}

/**
 * Reset logging configuration to defaults
 * @returns {Object} The default configuration
 */
export function resetLogConfig() {
  saveLogConfig(DEFAULT_CONFIG);
  return DEFAULT_CONFIG;
}

/**
 * Enable or disable a specific component
 * @param {string} component - The component/module name
 * @param {boolean} enabled - Whether to enable logging
 */
export function setComponentLogging(component, enabled) {
  const config = loadLogConfig();
  if (Object.hasOwn(config.components, component)) {
    config.components[component] = enabled;
    saveLogConfig(config);
  }
}

/**
 * Toggle all logging on or off
 * @param {boolean} enabled - Whether to enable all logging
 */
export function setGlobalLogging(enabled) {
  const config = loadLogConfig();
  config.enabled = enabled;
  saveLogConfig(config);
}

/**
 * Enable or disable a specific log level
 * @param {string} level - The log level (debug, log, warn, error)
 * @param {boolean} enabled - Whether to enable the log level
 */
export function setLogLevel(level, enabled) {
  const config = loadLogConfig();
  if (Object.hasOwn(config.levels, level)) {
    config.levels[level] = enabled;
    saveLogConfig(config);
  }
}

export default {
  loadLogConfig,
  saveLogConfig,
  isLoggingEnabled,
  resetLogConfig,
  setComponentLogging,
  setGlobalLogging,
  setLogLevel,
  invalidateConfigCache,
};
