/**
 * Gemini History Manager - Utility Functions
 * Common helper functions shared across the extension
 */

// Logger Module
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
function parseTimestamp(timestamp) {
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
function dayjsFormatDate(dateInput, includeYear = false) {
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
function formatDateForDisplay(djsDate) {
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
function readFile(file) {
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
}

/**
 * Initialize Day.js plugins
 * Makes sure all needed plugins are loaded and available
 */
function initDayjsPlugins() {
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
}

// Theme management
const THEME_STORAGE_KEY = 'geminiHistoryTheme';

/**
 * Initialize theme based on storage or system preference
 * @param {function} callback - Function to call with the theme value once determined
 */
function initTheme(callback) {
  // Get stored theme preference
  browser.storage.local.get(THEME_STORAGE_KEY)
    .then(result => {
      let theme;
      if (result[THEME_STORAGE_KEY]) {
        theme = result[THEME_STORAGE_KEY];
        Logger.log(`Retrieved stored theme preference: ${theme}`);
      } else {
        // Default to system preference via CSS media query, but track as 'light'
        // The CSS will handle the system preference via @media (prefers-color-scheme: dark)
        theme = 'light';
        Logger.log('No stored theme preference, defaulting to light with system detection via CSS');
      }
      
      if (callback && typeof callback === 'function') {
        callback(theme);
      }
    })
    .catch(error => {
      Logger.error('Error retrieving theme preference:', error);
      // Fall back to light
      if (callback && typeof callback === 'function') {
        callback('light');
      }
    });
}

/**
 * Apply the specified theme
 * @param {string} theme - 'light' or 'dark'
 * @param {HTMLElement} themeIcon - Optional SVG icon element to update
 */
function applyTheme(theme, themeIcon = null) {
  const htmlElement = document.documentElement;
  
  // Set explicit theme attribute
  htmlElement.setAttribute('data-theme', theme);
  Logger.log(`Applied ${theme} theme`);
  
  // Store the theme preference
  browser.storage.local.set({ [THEME_STORAGE_KEY]: theme })
    .catch(error => Logger.error('Error storing theme preference:', error));
  
  // Update the toggle button icon if provided
  if (themeIcon) {
    updateThemeToggleIcon(theme, themeIcon);
  }
}

/**
 * Toggle between light and dark themes
 * @param {string} currentTheme - The current theme ('light' or 'dark')
 * @param {HTMLElement} themeIcon - Optional SVG icon element to update
 * @returns {string} The new theme after toggling
 */
function toggleTheme(currentTheme, themeIcon = null) {
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme, themeIcon);
  return newTheme;
}

/**
 * Update the theme toggle button icon based on current theme
 * @param {string} currentTheme - The current theme ('light' or 'dark')
 * @param {HTMLElement} themeIcon - The SVG icon element to update
 */
function updateThemeToggleIcon(currentTheme, themeIcon) {
  if (themeIcon) {
    if (currentTheme === 'dark') {
      themeIcon.style.fill = 'currentColor';
      themeIcon.style.stroke = 'none';
    } else {
      themeIcon.style.fill = 'none';
      themeIcon.style.stroke = 'currentColor';
    }
  }
}

// Export all utility functions for use in other scripts
// They will be available as global functions since they're included via <script> tag
// No module system needed
window.Logger = Logger;
window.parseTimestamp = parseTimestamp;
window.dayjsFormatDate = dayjsFormatDate;
window.formatDateForDisplay = formatDateForDisplay;
window.readFile = readFile;
window.initDayjsPlugins = initDayjsPlugins;
window.initTheme = initTheme;
window.applyTheme = applyTheme;
window.toggleTheme = toggleTheme;
window.updateThemeToggleIcon = updateThemeToggleIcon;
window.THEME_STORAGE_KEY = THEME_STORAGE_KEY;