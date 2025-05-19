/**
 * Gemini History Manager - Utility Functions
 * Common helper functions shared across the extension
 */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
import isToday from 'dayjs/plugin/isToday';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import calendar from 'dayjs/plugin/calendar';
import timezone from 'dayjs/plugin/timezone';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { isLoggingEnabled } from './logConfig.js';

// Logger Module
export const Logger = {
    LOG_PREFIX: "[Gemini History]",
    
    /**
     * Format object for logging by converting to JSON string with 2 space indentation
     * @param {Object} obj - Object to stringify
     * @returns {string} JSON string representation
     */
    formatObject: (obj) => {
      try {
        if (typeof obj === 'object' && obj !== null) {
          return JSON.stringify(obj, null, 2);
        }
        return obj;
      } catch (e) {
        console.error("Error formatting object for logging:", e);
        return "[Object conversion error]";
      }
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
    _log: function(method, context, message, error, ...args) {
      const logLevel = method.toLowerCase();
      if (!isLoggingEnabled(context, logLevel)) {
        return;
      }
      
      if (typeof message === 'string' && args.length === 0) {
        // Legacy format support
        console[method](this.LOG_PREFIX, context);
      } else if (error instanceof Error) {
        console[method](this.LOG_PREFIX, `[${context}]`, message, error, ...args);
      } else {
        console[method](this.LOG_PREFIX, `[${context}]`, message, ...(error !== undefined ? [error] : []), ...args);
      }
    },
    
    /**
     * Logs an informational message
     * @param {string} context - Where the log is coming from (component/file name)
     * @param {string} message - The log message
     * @param {...any} args - Additional arguments to log
     */
    log: function(context, message, ...args) {
      this._log('log', context, message, undefined, ...args);
    },
    
    /**
     * Logs a warning message
     * @param {string} context - Where the warning is coming from (component/file name)
     * @param {string} message - The warning message
     * @param {...any} args - Additional arguments to log
     */
    warn: function(context, message, ...args) {
      this._log('warn', context, message, undefined, ...args);
    },
    
    /**
     * Logs an error message
     * @param {string} context - Where the error is coming from (component/file name)
     * @param {string} message - The error message
     * @param {Error|any} [error] - Optional error object
     * @param {...any} args - Additional arguments to log
     */
    error: function(context, message, error, ...args) {
      this._log('error', context, message, error, ...args);
    },
    
    /**
     * Logs a debug message (only shown when debug logging is enabled)
     * @param {string} context - Where the debug message is coming from (component/file name)
     * @param {string} message - The debug message
     * @param {...any} args - Additional arguments to log
     */
    debug: function(context, message, ...args) {
      this._log('debug', context, message, undefined, ...args);
    }
  };

/**
 * Parse timestamp to dayjs object, handling different timestamp formats
 * - Full ISO 8601 with Z (UTC): "2025-05-12T07:09:57.992Z"
 * - Local time without Z: "2025-05-12T11:32:40"
 * - With timezone offset: "2025-05-12T11:32:40+01:00"
 * @param {string|number|Date|dayjs.Dayjs} timestamp - The timestamp to parse
 * @returns {dayjs.Dayjs} A dayjs object in local time
 */
export function parseTimestamp(timestamp) {
  if (!timestamp) return dayjs(); // Return current time if no timestamp
  
  // If already a dayjs object, return it
  if (dayjs.isDayjs(timestamp)) return timestamp;
  
  const timestampStr = String(timestamp);
  
  // Check if it's full ISO 8601 with Z (UTC)
  if (timestampStr.endsWith('Z')) {
    // Parse as UTC and convert to local
    return dayjs(timestamp).local();
  }
  
  // Handle string with timezone offset (contains + or -)
  if (timestampStr.includes('+') || (timestampStr.includes('-') && timestampStr.indexOf('-') > 8)) {
    // dayjs will automatically handle the offset
    return dayjs(timestamp);
  }
  
  // Handle local time string without Z
  // Assume it's already in local time
  return dayjs(timestamp);
}

/**
 * Day.js based date formatting helper
 * Provides different formatting based on how recent the date is.
 * - For today: Shows time only (e.g., "2:30 PM")
 * - For this year: Shows month and day (e.g., "Jan 15")
 * - For previous years or when includeYear is true: Shows month, day and year (e.g., "Jan 15, 2023")
 * @param {string|number|Date|dayjs.Dayjs} dateInput - The date to format
 * @param {boolean} [includeYear=false] - Whether to force include the year
 * @returns {string} Formatted date string
 */
export function dayjsFormatDate(dateInput, includeYear = false) {
  const d = parseTimestamp(dateInput);
  
  if (!d.isValid()) {
    Logger.warn(`Invalid date input: ${dateInput}`);
    return 'Invalid date';
  }
  
  if (d.isToday()) { // Requires isToday plugin
    return d.format('LT'); // Localized time, e.g., "8:30 PM" - requires localizedFormat plugin
  }
  if (d.year() === dayjs().year() && !includeYear) {
    return d.format('MMM D'); // e.g., "Jan 15"
  }
  return d.format('MMM D, YYYY'); // e.g., "Jan 15, 2023"
}

/**
 * Formats a Day.js object for display in the conversation list using the calendar plugin.
 * @param {Object} djsDate - A Day.js date object.
 * @returns {string} Formatted date string (e.g., "Today at 2:30 PM", "Yesterday at 10:00 AM", "01/15/2023").
 */
export function formatDateForDisplay(djsDate) {
  if (!djsDate || !djsDate.isValid()) {
    Logger.warn("Invalid date for formatDateForDisplay");
    return "Invalid Date";
  }
  
  // Use the Day.js calendar plugin for human-friendly, relative time display.
  if (typeof djsDate.calendar === 'function') {
    return djsDate.calendar();
  } else {
    // Fallback if calendar plugin somehow isn't loaded on the instance
    Logger.warn("Day.js calendar function not found on date instance, falling back to basic format.");
    return djsDate.format('YYYY-MM-DD HH:mm'); 
  }
}

/**
 * Reads a file and returns its contents as text
 * @param {File} file - The file object to read
 * @returns {Promise<string>} A promise that resolves with the file contents as text
 */
export function readFile(file) {
  Logger.debug("FileUtils", "Reading file", { fileName: file.name, fileSize: file.size });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      Logger.debug("FileUtils", "File read successfully", { fileName: file.name, contentLength: event.target.result.length });
      resolve(event.target.result);
    };
    reader.onerror = error => {
      Logger.error("FileUtils", "Error reading file", error, { fileName: file.name });
      reject(error);
    };
    reader.readAsText(file);
  });
}

/**
 * Initialize Day.js plugins
 * Makes sure all needed plugins are loaded and available
 */
export function initDayjsPlugins() {
  try {
    // Use our imported plugins
    dayjs.extend(utc);
    dayjs.extend(relativeTime);
    dayjs.extend(isToday);
    dayjs.extend(localizedFormat);
    dayjs.extend(calendar);
    dayjs.extend(timezone);
    dayjs.extend(isSameOrBefore);
    
    Logger.debug("Day.js plugins initialized.");
  } catch (e) {
    Logger.error("Error initializing Day.js plugins:", e);
  }
}

// Re-export theme management functions after Logger has been defined
export * from './themeManager';

// No need to export to window anymore
// We're using ES modules now and can import directly