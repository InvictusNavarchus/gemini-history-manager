/**
 * Gemini History Manager - Theme Management
 * Functions for handling light/dark theme preferences and transitions
 */

// Internal Logger implementation to avoid circular dependencies
// Note: This duplicates the Logger in utils.js to prevent circular dependencies
const Logger = {
  LOG_PREFIX: "[Gemini History]",
  log: function(...args) {
    console.log(this.LOG_PREFIX, ...args);
  },
  warn: function(...args) {
    console.warn(this.LOG_PREFIX, ...args);
  },
  error: function(...args) {
    console.error(this.LOG_PREFIX, ...args);
  },
  debug: function(...args) {
    if (localStorage.getItem('gemini_debug') === 'true') {
      console.debug(this.LOG_PREFIX, ...args);
    }
  }
};

// Theme management
export const THEME_STORAGE_KEY = 'geminiHistoryTheme';

/**
 * Initializes the theme for the application based on user preference or system settings
 * 
 * This function merges the functionality of the previous initTheme (with browser.storage)
 * and additional features like transition handling and detailed logging.
 * 
 * @param {Object} options - Theme initialization options
 * @param {boolean} [options.enableTransitions=false] - Whether to handle transitions during theme initialization
 * @param {string} [options.context='general'] - The context where theme is being initialized (e.g., 'popup', 'dashboard')
 * @param {boolean} [options.checkBrowserStorage=false] - Whether to also check browser.storage (in addition to localStorage)
 * @returns {string} The applied theme ('light' or 'dark')
 */
export function initializeTheme(options = {}) {
  const { enableTransitions = false, context = 'general', checkBrowserStorage = false } = options;
  let appliedTheme = 'light';
  
  Logger.log(`Initializing theme for context: ${context}`);
  Logger.debug(`Theme initialization parameters: ${JSON.stringify({
    enableTransitions,
    context,
    checkBrowserStorage
  })}`);
  
  // If transitions should be disabled initially
  if (enableTransitions) {
    document.documentElement.classList.add('initial-load');
    Logger.debug('Transitions temporarily disabled for theme initialization to prevent flash');
    
    // Log the current document element state
    Logger.debug(`Document element classes: ${document.documentElement.className}`);
  }
  
  try {
    // Always check localStorage first for immediate access
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    Logger.debug(`Retrieved saved theme from localStorage: ${savedTheme || 'none'}`);
    
    if (savedTheme) {
      // Apply saved theme from localStorage
      document.documentElement.setAttribute('data-theme', savedTheme);
      appliedTheme = savedTheme;
      Logger.log(`Applied saved theme from localStorage: ${savedTheme}`);
      
      // Re-enable transitions early if we already have theme from localStorage
      _handleTransitions(enableTransitions);
      
      return appliedTheme;
    } 
    
    // No theme in localStorage, check browser.storage if requested
    if (checkBrowserStorage && typeof browser !== 'undefined' && browser.storage) {
      Logger.debug('No theme in localStorage. Checking browser.storage for theme preference');
      
      // We need to return the theme synchronously for immediate UI rendering,
      // but also check browser.storage asynchronously for the stored preference
      // 1. First, apply system preference as a fallback for immediate display
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const prefersDark = mediaQuery.matches;
      Logger.debug(`System preference detection - prefers-dark: ${prefersDark}`);
      Logger.debug(`Media query status: ${JSON.stringify({
        matches: mediaQuery.matches,
        media: mediaQuery.media
      })}`);
      
      const systemTheme = prefersDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', systemTheme);
      appliedTheme = systemTheme;
      Logger.log(`Applied interim system preference theme: ${systemTheme} (from media query)`);
      
      // 2. Then check browser.storage asynchronously and update if needed
      Logger.debug(`Checking browser.storage.local for key: ${THEME_STORAGE_KEY}`);
      browser.storage.local.get(THEME_STORAGE_KEY)
        .then(result => {
          Logger.debug(`Browser storage lookup result: ${JSON.stringify(result)}`);
          
          if (result[THEME_STORAGE_KEY]) {
            const storageTheme = result[THEME_STORAGE_KEY];
            Logger.log(`Retrieved theme from browser.storage: ${storageTheme}`);
            
            if (storageTheme !== systemTheme) {
              // Only update if different from what we already applied
              Logger.debug(`Storage theme (${storageTheme}) differs from system theme (${systemTheme}), updating...`);
              document.documentElement.setAttribute('data-theme', storageTheme);
              Logger.log(`Updated theme from browser.storage: ${storageTheme}`);
              
              // Cache in localStorage for future use
              localStorage.setItem(THEME_STORAGE_KEY, storageTheme);
              Logger.debug(`Cached browser storage theme in localStorage: ${storageTheme}`);
            } else {
              Logger.debug(`Storage theme matches system theme (${systemTheme}), no update needed`);
            }
          } else {
            // No theme in browser.storage either, save system preference
            Logger.log(`No theme found in browser.storage, saving system preference (${systemTheme})`);
            
            browser.storage.local.set({ [THEME_STORAGE_KEY]: systemTheme })
              .then(() => {
                Logger.debug(`Successfully saved system theme (${systemTheme}) to browser.storage`);
              })
              .catch(e => Logger.error(`Failed to save system preference to browser.storage: ${e.message}`, e));
            
            // Cache in localStorage for future use
            localStorage.setItem(THEME_STORAGE_KEY, systemTheme);
            Logger.debug(`Cached system theme in localStorage: ${systemTheme}`);
          }
        })
        .catch(e => Logger.error(`Error getting theme from browser.storage: ${e.message}`, e));
    } else {
      // No theme in localStorage and not checking browser.storage, use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const systemTheme = prefersDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', systemTheme);
      appliedTheme = systemTheme;
      Logger.log(`Applied system preference theme: ${systemTheme}`);
      
      // Save to localStorage for future use
      localStorage.setItem(THEME_STORAGE_KEY, systemTheme);
    }
    
    // Re-enable transitions if they were disabled
    _handleTransitions(enableTransitions);
    
  } catch (e) {
    Logger.error(`Error initializing theme:`, e);
    // Default to light theme if there's an error
    document.documentElement.setAttribute('data-theme', 'light');
    appliedTheme = 'light';
    
    // Re-enable transitions if they were disabled
    _handleTransitions(enableTransitions);
  }
  
  return appliedTheme;
}

/**
 * Helper function to handle enabling/disabling transitions
 * @private
 * @param {boolean} enableTransitions - Whether transitions were enabled/disabled
 */
function _handleTransitions(enableTransitions) {
  if (enableTransitions) {
    Logger.debug('Setting up transition re-enablement via requestAnimationFrame');
    
    requestAnimationFrame(() => {
      Logger.debug('First animation frame - preparing to re-enable transitions');
      
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('initial-load');
        Logger.debug('Second animation frame - transitions re-enabled after theme initialization');
        Logger.debug(`Document element classes (after re-enabling): ${document.documentElement.className}`);
      });
    });
  } else {
    Logger.debug('Transition handling not required for this context');
  }
}

/**
 * Apply the specified theme
 * @param {string} theme - 'light' or 'dark'
 * @param {HTMLElement} themeIcon - Optional SVG icon element to update
 */
export function applyTheme(theme, themeIcon = null) {
  Logger.log(`Applying theme: ${theme}`);
  
  if (theme !== 'light' && theme !== 'dark') {
    Logger.warn(`Invalid theme value: "${theme}". Must be 'light' or 'dark'. Defaulting to light.`);
    theme = 'light';
  }
  
  const htmlElement = document.documentElement;
  const previousTheme = htmlElement.getAttribute('data-theme') || 'light';
  
  Logger.debug(`Changing theme from "${previousTheme}" to "${theme}"`);
  
  // Set explicit theme attribute
  htmlElement.setAttribute('data-theme', theme);
  Logger.log(`Applied ${theme} theme to document element`);
  
  // Store the theme preference in extension storage
  Logger.debug(`Storing theme (${theme}) in browser.storage.local`);
  browser.storage.local.set({ [THEME_STORAGE_KEY]: theme })
    .then(() => {
      Logger.debug(`Successfully saved theme (${theme}) to browser.storage`);
    })
    .catch(error => Logger.error(`Error storing theme preference in browser.storage: ${error.message}`, error));
  
  // Also store in localStorage for immediate access when popup opens
  try {
    Logger.debug(`Storing theme (${theme}) in localStorage`);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    Logger.debug(`Successfully saved theme to localStorage`);
  } catch (error) {
    Logger.error(`Error storing theme preference in localStorage: ${error.message}`, error);
  }
  
  // Update the toggle button icon if provided
  if (themeIcon) {
    Logger.debug('Updating theme toggle icon');
    updateThemeToggleIcon(theme, themeIcon);
  } else {
    Logger.debug('No theme icon provided to update');
  }
}

/**
 * Toggle between light and dark themes
 * @param {string} currentTheme - The current theme ('light' or 'dark')
 * @param {HTMLElement} themeIcon - Optional SVG icon element to update
 * @returns {string} The new theme after toggling
 */
export function toggleTheme(currentTheme, themeIcon = null) {
  Logger.log(`Toggling theme from current: ${currentTheme}`);
  
  // Ensure we have a valid starting theme
  if (currentTheme !== 'light' && currentTheme !== 'dark') {
    Logger.warn(`Invalid current theme: "${currentTheme}". Defaulting to light before toggle.`);
    currentTheme = 'light';
  }
  
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  Logger.log(`Theme will be toggled to: ${newTheme}`);
  
  applyTheme(newTheme, themeIcon);
  
  Logger.log(`Theme successfully toggled from ${currentTheme} to ${newTheme}`);
  return newTheme;
}

/**
 * Update the theme toggle button icon based on current theme
 * @param {string} currentTheme - The current theme ('light' or 'dark')
 * @param {HTMLElement} themeIcon - The SVG icon element to update
 */
export function updateThemeToggleIcon(currentTheme, themeIcon) {
  if (!themeIcon) {
    Logger.warn('updateThemeToggleIcon called without a valid icon element');
    return;
  }
  
  Logger.debug(`Updating theme icon for ${currentTheme} theme`);
  
  try {
    if (currentTheme === 'dark') {
      Logger.debug('Setting icon styles for dark theme (filled)');
      themeIcon.style.fill = 'currentColor';
      themeIcon.style.stroke = 'none';
    } else {
      Logger.debug('Setting icon styles for light theme (outline)');
      themeIcon.style.fill = 'none';
      themeIcon.style.stroke = 'currentColor';
    }
    Logger.debug('Theme icon updated successfully');
  } catch (error) {
    Logger.error(`Error updating theme icon: ${error.message}`, error);
  }
}
