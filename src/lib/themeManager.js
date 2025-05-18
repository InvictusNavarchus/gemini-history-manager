/**
 * Gemini History Manager - Theme Management
 * Functions for handling light/dark theme preferences and transitions
 */

import { Logger } from './utils';

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
  
  Logger.debug(`Initializing theme (context: ${context}, transitions: ${enableTransitions})`);
  
  // If transitions should be disabled initially
  if (enableTransitions) {
    document.documentElement.classList.add('initial-load');
    Logger.debug('Transitions temporarily disabled for theme initialization');
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
      Logger.debug('Checking browser.storage for theme preference');
      
      // We need to return the theme synchronously for immediate UI rendering,
      // but also check browser.storage asynchronously for the stored preference
      // 1. First, apply system preference as a fallback for immediate display
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const systemTheme = prefersDark ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', systemTheme);
      appliedTheme = systemTheme;
      Logger.log(`Applied interim system preference theme: ${systemTheme}`);
      
      // 2. Then check browser.storage asynchronously and update if needed
      browser.storage.local.get(THEME_STORAGE_KEY)
        .then(result => {
          if (result[THEME_STORAGE_KEY]) {
            const storageTheme = result[THEME_STORAGE_KEY];
            Logger.log(`Retrieved theme from browser.storage: ${storageTheme}`);
            
            if (storageTheme !== systemTheme) {
              // Only update if different from what we already applied
              document.documentElement.setAttribute('data-theme', storageTheme);
              Logger.log(`Updated theme from browser.storage: ${storageTheme}`);
              
              // Cache in localStorage for future use
              localStorage.setItem(THEME_STORAGE_KEY, storageTheme);
            }
          } else {
            // No theme in browser.storage either, save system preference
            Logger.debug('No theme in browser.storage, saving system preference');
            browser.storage.local.set({ [THEME_STORAGE_KEY]: systemTheme })
              .catch(e => Logger.error('Failed to save system preference to browser.storage:', e));
            
            // Cache in localStorage for future use
            localStorage.setItem(THEME_STORAGE_KEY, systemTheme);
          }
        })
        .catch(e => Logger.error('Error getting theme from browser.storage:', e));
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
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('initial-load');
        Logger.debug('Transitions re-enabled after theme initialization');
      });
    });
  }
}

/**
 * Apply the specified theme
 * @param {string} theme - 'light' or 'dark'
 * @param {HTMLElement} themeIcon - Optional SVG icon element to update
 */
export function applyTheme(theme, themeIcon = null) {
  const htmlElement = document.documentElement;
  
  // Set explicit theme attribute
  htmlElement.setAttribute('data-theme', theme);
  Logger.log(`Applied ${theme} theme`);
  
  // Store the theme preference in extension storage
  browser.storage.local.set({ [THEME_STORAGE_KEY]: theme })
    .catch(error => Logger.error('Error storing theme preference in browser.storage:', error));
  
  // Also store in localStorage for immediate access when popup opens
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    Logger.error('Error storing theme preference in localStorage:', error);
  }
  
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
export function toggleTheme(currentTheme, themeIcon = null) {
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(newTheme, themeIcon);
  return newTheme;
}

/**
 * Update the theme toggle button icon based on current theme
 * @param {string} currentTheme - The current theme ('light' or 'dark')
 * @param {HTMLElement} themeIcon - The SVG icon element to update
 */
export function updateThemeToggleIcon(currentTheme, themeIcon) {
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
