/**
 * Gemini History Manager - Logger Injection Script
 * Injects the logger functionality into content scripts
 */

// This script will be injected into the content script context to provide logging functionality
// without requiring ES module support in content scripts

(function () {
  /**
   * Import the logConfig.js logic directly into content script
   */
  const LogConfig = {
    CONFIG_STORAGE_KEY: "gemini_log_config",
    DEFAULT_CONFIG: {
      enabled: true,
      levels: {
        debug: true,
        log: true,
        warn: true,
        error: true,
      },
      components: {
        ContentScript: true,
      },
    },
    configCache: null,

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

    invalidateConfigCache: function () {
      this.configCache = null;
    },

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
      if (component && Object.hasOwn(config.components, component)) {
        return config.components[component];
      }

      // Default to true if not explicitly configured
      return true;
    },
  };

  /**
   * Logger Module for Content Scripts
   */
  window.GeminiHistoryLogger = {
    LOG_PREFIX: "[Gemini History]",
    CONTEXT_PREFIX: "[CONTENT]", // Default context for content scripts

    formatObject: function (obj) {
      try {
        if (typeof obj === "object" && obj !== null) {
          return JSON.stringify(obj, null, 2);
        }
        return obj;
      } catch (e) {
        console.error("Error formatting object for logging:", e);
        return "[Object conversion error]";
      }
    },

    _log: function (method, context, message, error, ...args) {
      const logLevel = method.toLowerCase();
      if (!LogConfig.isLoggingEnabled(context, logLevel)) {
        return;
      }

      // Always include context in brackets and the message
      if (error instanceof Error) {
        console[method](this.LOG_PREFIX, this.CONTEXT_PREFIX, `[${context}]`, message, error, ...args);
      } else {
        console[method](
          this.LOG_PREFIX,
          this.CONTEXT_PREFIX,
          `[${context}]`,
          message,
          ...(error !== undefined ? [error] : []),
          ...args
        );
      }
    },

    log: function (context, message, ...args) {
      this._log("log", context, message, undefined, ...args);
    },

    warn: function (context, message, ...args) {
      this._log("warn", context, message, undefined, ...args);
    },

    error: function (context, message, error, ...args) {
      this._log("error", context, message, error, ...args);
    },

    debug: function (context, message, ...args) {
      this._log("debug", context, message, undefined, ...args);
    },
  };
})();
