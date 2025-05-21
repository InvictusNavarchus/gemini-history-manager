/**
 * Gemini History Manager - Logger Module
 * Centralized logging implementation that can be used throughout the extension
 */
import { isLoggingEnabled } from "./logConfig.js";

/**
 * Logger Module
 * Provides consistent, configurable logging across the extension
 */
export const Logger = {
  LOG_PREFIX: "[Gemini History]",
  CONTEXT_PREFIX: "", // Will be set by initLogger function

  /**
   * Format object for logging by converting to JSON string with 2 space indentation
   * @param {Object} obj - Object to stringify
   * @returns {string} JSON string representation
   */
  formatObject: (obj) => {
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

  /**
   * Initialize logger with a specific context
   * @param {string} context - The context name ('popup', 'dashboard', 'background', etc.)
   */
  initLogger: function (context) {
    this.CONTEXT_PREFIX = `[${context}]`;
  },

  /**
   * Internal helper method to handle all logging operations
   * @private
   * @param {string} method - The console method to use ('log', 'warn', 'error', 'debug')
   * @param {string} context - Where the log is coming from (component/file name)
   * @param {string} message - The log message
   * @param {Error|any} [error] - Optional error object (for error method)
   * @param {...any} args - Additional arguments to log
   */
  _log: function (method, context, message, error, ...args) {
    const logLevel = method.toLowerCase();
    if (!isLoggingEnabled(context, logLevel)) {
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

  /**
   * Logs an informational message
   * @param {string} context - Where the log is coming from (component/file name)
   * @param {string} message - The log message
   * @param {...any} args - Additional arguments to log
   */
  log: function (context, message, ...args) {
    this._log("log", context, message, undefined, ...args);
  },

  /**
   * Logs a warning message
   * @param {string} context - Where the warning is coming from (component/file name)
   * @param {string} message - The warning message
   * @param {...any} args - Additional arguments to log
   */
  warn: function (context, message, ...args) {
    this._log("warn", context, message, undefined, ...args);
  },

  /**
   * Logs an error message
   * @param {string} context - Where the error is coming from (component/file name)
   * @param {string} message - The error message
   * @param {Error|any} [error] - Optional error object
   * @param {...any} args - Additional arguments to log
   */
  error: function (context, message, error, ...args) {
    this._log("error", context, message, error, ...args);
  },

  /**
   * Logs a debug message (only shown when debug logging is enabled)
   * @param {string} context - Where the debug message is coming from (component/file name)
   * @param {string} message - The debug message
   * @param {...any} args - Additional arguments to log
   */
  debug: function (context, message, ...args) {
    this._log("debug", context, message, undefined, ...args);
  },
};

export default Logger;
