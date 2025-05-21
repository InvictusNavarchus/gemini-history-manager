(function () {
  "use strict";

  const LogConfig = {
    // Storage key for persisted config
    CONFIG_STORAGE_KEY: "gemini_log_config",

    // Default configuration - all logging enabled
    DEFAULT_CONFIG: {
      // Global enable/disable for all logging
      enabled: true,

      // Enable/disable specific log levels
      levels: {
        debug: true,
        log: true,
        warn: true,
        error: true,
      },

      // Component specific settings
      components: {
        ContentScript: true,
      },
    },

    // Cache for the loaded configuration to avoid frequent localStorage reads
    configCache: null,

    /**
     * Load logging configuration from storage, falling back to defaults if not found
     * Uses in-memory cache to reduce localStorage reads
     * @param {boolean} [forceRefresh=false] - Force refresh from localStorage
     * @returns {Object} The current logging configuration
     */
    loadLogConfig: function (forceRefresh = false) {
      // Return cached config if available and no refresh is requested
      if (this.configCache !== null && !forceRefresh) {
        return this.configCache;
      }

      try {
        const storedConfig = localStorage.getItem(this.CONFIG_STORAGE_KEY);

        if (storedConfig) {
          // Merge with default config to ensure all properties exist
          const parsedConfig = JSON.parse(storedConfig);
          this.configCache = {
            ...this.DEFAULT_CONFIG,
            ...parsedConfig,
            levels: {
              ...this.DEFAULT_CONFIG.levels,
              ...(parsedConfig.levels || {}),
            },
            components: {
              ...this.DEFAULT_CONFIG.components,
              ...(parsedConfig.components || {}),
            },
          };
          return this.configCache;
        }
      } catch (error) {
        console.error("Error loading logging config:", error);
        // On error, invalidate the cache
        this.configCache = null;
      }

      // Cache the default config if nothing was loaded
      this.configCache = this.DEFAULT_CONFIG;
      return this.DEFAULT_CONFIG;
    },

    /**
     * Invalidate the configuration cache
     */
    invalidateConfigCache: function () {
      this.configCache = null;
    },

    /**
     * Check if logging is enabled for a specific component and level
     * @param {string} component - The component/module name
     * @param {string} level - The log level (debug, log, warn, error)
     * @returns {boolean} Whether logging is enabled
     */
    isLoggingEnabled: function (component, level) {
      const config = this.loadLogConfig();

      // If logging is globally disabled, return false
      if (!config.enabled) {
        return false;
      }

      // If the log level is disabled, return false
      if (level && !config.levels[level]) {
        return false;
      }

      // If the component is explicitly configured, use that setting
      if (component && config.components.hasOwnProperty(component)) {
        return config.components[component];
      }

      // Default to true if not explicitly configured
      return true;
    },
  };

  window.GeminiHistory_LogConfig = LogConfig;
})();
