/**
 * Gemini History Manager - Utility Functions
 * Common helper functions shared across the extension
 */

// Logger Module for consistent logging
const Logger = {
  LOG_PREFIX: "[Gemini History]",
  log: (...args) => console.log(Logger.LOG_PREFIX, ...args),
  warn: (...args) => console.warn(Logger.LOG_PREFIX, ...args),
  error: (...args) => console.error(Logger.LOG_PREFIX, ...args),
  debug: (...args) => {
    if (localStorage.getItem('gemini_debug') === 'true') {
      console.debug(Logger.LOG_PREFIX, ...args);
    }
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
const parseTimestamp = (timestamp) => {
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
};

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
const dayjsFormatDate = (dateInput, includeYear = false) => {
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
};

/**
 * Formats a Day.js object for display in the conversation list using the calendar plugin.
 * @param {Object} djsDate - A Day.js date object.
 * @returns {string} Formatted date string (e.g., "Today at 2:30 PM", "Yesterday at 10:00 AM", "01/15/2023").
 */
const formatDateForDisplay = (djsDate) => {
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
};

/**
 * Reads a file and returns its contents as text
 * @param {File} file - The file object to read
 * @returns {Promise<string>} A promise that resolves with the file contents as text
 */
const readFile = (file) => {
  Logger.debug(`Reading file: ${file.name}`);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      Logger.debug(`File ${file.name} read successfully.`);
      resolve(event.target.result);
    };
    reader.onerror = error => {
      Logger.error(`Error reading file ${file.name}:`, error);
      reject(error);
    };
    reader.readAsText(file);
  });
};

/**
 * Initialize Day.js plugins
 * Makes sure all needed plugins are loaded and available
 */
const initDayjsPlugins = () => {
  try {
    if (dayjs && typeof dayjs.extend === 'function') {
      if (window.dayjs_plugin_relativeTime) {
        dayjs.extend(window.dayjs_plugin_relativeTime);
        Logger.debug("Day.js relativeTime plugin extended.");
      } else {
        Logger.warn("Day.js relativeTime plugin not found. 'Time ago' functionality might be affected.");
      }
      
      if (window.dayjs_plugin_isToday) {
        dayjs.extend(window.dayjs_plugin_isToday);
        Logger.debug("Day.js isToday plugin extended.");
      }
      
      if (window.dayjs_plugin_calendar) {
        dayjs.extend(window.dayjs_plugin_calendar);
        Logger.debug("Day.js calendar plugin extended.");
      }
      
      if (window.dayjs_plugin_localizedFormat) {
        dayjs.extend(window.dayjs_plugin_localizedFormat);
        Logger.debug("Day.js localizedFormat plugin extended.");
      }
      
      if (window.dayjs_plugin_utc) {
        dayjs.extend(window.dayjs_plugin_utc);
        Logger.debug("Day.js utc plugin extended.");
      }
    } else {
      Logger.error("Day.js not found or dayjs.extend is not a function. Date functionality may not work correctly.");
    }
  } catch (e) {
    Logger.error("Error initializing Day.js plugins:", e);
  }
};

// Export all utility functions for use in other scripts
// They will be available as global functions since they're included via <script> tag
// No module system needed
window.Logger = Logger;
window.parseTimestamp = parseTimestamp;
window.dayjsFormatDate = dayjsFormatDate;
window.formatDateForDisplay = formatDateForDisplay;
window.readFile = readFile;
window.initDayjsPlugins = initDayjsPlugins;