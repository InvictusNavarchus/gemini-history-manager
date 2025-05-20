/**
 * Gemini History Manager - Theme Management
 * Functions for handling light/dark theme preferences and transitions
 */

import { isLoggingEnabled } from "./logConfig.js";
import { Logger } from "./logger.js";

// Theme management
export const THEME_STORAGE_KEY = "geminiHistoryTheme";

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
  const { enableTransitions = false, context = "general", checkBrowserStorage = false } = options;
  let appliedTheme = "light";

  Logger.log("ThemeManager", "Initializing theme", { context });
  Logger.debug("ThemeManager", "Theme initialization parameters", {
    enableTransitions,
    context,
    checkBrowserStorage,
  });

  // If transitions should be disabled initially
  if (enableTransitions) {
    document.documentElement.classList.add("initial-load");
    Logger.debug(
      "ThemeManager",
      "Transitions temporarily disabled for theme initialization to prevent flash"
    );

    // Log the current document element state
    Logger.debug("ThemeManager", "Document element classes", { classes: document.documentElement.className });
  }

  try {
    // Always check localStorage first for immediate access
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    Logger.debug("ThemeManager", "Retrieved saved theme from localStorage", { theme: savedTheme || "none" });

    if (savedTheme) {
      // Apply saved theme from localStorage
      document.documentElement.setAttribute("data-theme", savedTheme);
      appliedTheme = savedTheme;
      Logger.log("ThemeManager", "Applied saved theme from localStorage", { theme: savedTheme });

      // Re-enable transitions early if we already have theme from localStorage
      _handleTransitions(enableTransitions);

      return appliedTheme;
    }

    // No theme in localStorage, check browser.storage if requested
    if (checkBrowserStorage && typeof browser !== "undefined" && browser.storage) {
      Logger.debug("ThemeManager", "No theme in localStorage, checking browser.storage for preference");

      // We need to return the theme synchronously for immediate UI rendering,
      // but also check browser.storage asynchronously for the stored preference
      // 1. First, apply system preference as a fallback for immediate display
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const prefersDark = mediaQuery.matches;
      Logger.debug("ThemeManager", "System preference detection", { prefersDark });
      Logger.debug("ThemeManager", "Media query status", {
        matches: mediaQuery.matches,
        media: mediaQuery.media,
      });

      const systemTheme = prefersDark ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", systemTheme);
      appliedTheme = systemTheme;
      Logger.log("ThemeManager", "Applied interim system preference theme", {
        theme: systemTheme,
        source: "media query",
      });

      // 2. Then check browser.storage asynchronously and update if needed
      Logger.debug("ThemeManager", "Checking browser.storage.local for theme", { key: THEME_STORAGE_KEY });
      browser.storage.local
        .get(THEME_STORAGE_KEY)
        .then((result) => {
          Logger.debug("ThemeManager", "Browser storage lookup result", { result });

          if (result[THEME_STORAGE_KEY]) {
            const storageTheme = result[THEME_STORAGE_KEY];
            Logger.log("ThemeManager", "Retrieved theme from browser.storage", { theme: storageTheme });

            if (storageTheme !== systemTheme) {
              // Only update if different from what we already applied
              Logger.debug("ThemeManager", "Storage theme differs from system theme", {
                storageTheme,
                systemTheme,
              });
              document.documentElement.setAttribute("data-theme", storageTheme);
              Logger.log("ThemeManager", "Updated theme from browser.storage", { theme: storageTheme });

              // Cache in localStorage for future use
              localStorage.setItem(THEME_STORAGE_KEY, storageTheme);
              Logger.debug("ThemeManager", "Cached browser storage theme in localStorage", {
                theme: storageTheme,
              });
            } else {
              Logger.debug("ThemeManager", "Storage theme matches system theme, no update needed", {
                theme: systemTheme,
              });
            }
          } else {
            // No theme in browser.storage either, save system preference
            Logger.log("ThemeManager", "No theme found in browser.storage, saving system preference", {
              theme: systemTheme,
            });

            browser.storage.local
              .set({ [THEME_STORAGE_KEY]: systemTheme })
              .then(() => {
                Logger.debug("ThemeManager", "Successfully saved system theme to browser.storage", {
                  theme: systemTheme,
                });
              })
              .catch((e) =>
                Logger.error("ThemeManager", "Failed to save system preference to browser.storage", e)
              );

            // Cache in localStorage for future use
            localStorage.setItem(THEME_STORAGE_KEY, systemTheme);
            Logger.debug("ThemeManager", "Cached system theme in localStorage", { theme: systemTheme });
          }
        })
        .catch((e) => Logger.error("ThemeManager", "Error getting theme from browser.storage", e));
    } else {
      // No theme in localStorage and not checking browser.storage, use system preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const systemTheme = prefersDark ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", systemTheme);
      appliedTheme = systemTheme;
      Logger.log("ThemeManager", "Applied system preference theme", { theme: systemTheme });

      // Save to localStorage for future use
      localStorage.setItem(THEME_STORAGE_KEY, systemTheme);
    }

    // Re-enable transitions if they were disabled
    _handleTransitions(enableTransitions);
  } catch (e) {
    Logger.error("ThemeManager", "Error initializing theme", e);
    // Default to light theme if there's an error
    document.documentElement.setAttribute("data-theme", "light");
    appliedTheme = "light";

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
    Logger.debug("ThemeManager", "Setting up transition re-enablement via requestAnimationFrame");

    requestAnimationFrame(() => {
      Logger.debug("ThemeManager", "First animation frame - preparing to re-enable transitions");

      requestAnimationFrame(() => {
        document.documentElement.classList.remove("initial-load");
        Logger.debug(
          "ThemeManager",
          "Second animation frame - transitions re-enabled after theme initialization"
        );
        Logger.debug("ThemeManager", "Document element classes after re-enabling transitions", {
          classes: document.documentElement.className,
        });
      });
    });
  } else {
    Logger.debug("ThemeManager", "Transition handling not required for this context");
  }
}

/**
 * Apply the specified theme
 * @param {string} theme - 'light' or 'dark'
 * @param {HTMLElement} themeIcon - Optional SVG icon element to update
 */
export function applyTheme(theme, themeIcon = null) {
  Logger.log("ThemeManager", "Applying theme", { theme });

  if (theme !== "light" && theme !== "dark") {
    Logger.warn("ThemeManager", "Invalid theme value, defaulting to light", { providedTheme: theme });
    theme = "light";
  }

  const htmlElement = document.documentElement;
  const previousTheme = htmlElement.getAttribute("data-theme") || "light";

  Logger.debug("ThemeManager", "Changing theme", { from: previousTheme, to: theme });

  // Set explicit theme attribute
  htmlElement.setAttribute("data-theme", theme);
  Logger.log("ThemeManager", "Applied theme to document element", { theme });

  // Store the theme preference in extension storage
  Logger.debug("ThemeManager", "Storing theme in browser.storage.local", { theme });
  browser.storage.local
    .set({ [THEME_STORAGE_KEY]: theme })
    .then(() => {
      Logger.debug("ThemeManager", "Successfully saved theme to browser.storage", { theme });
    })
    .catch((error) =>
      Logger.error("ThemeManager", "Error storing theme preference in browser.storage", error)
    );

  // Also store in localStorage for immediate access when popup opens
  try {
    Logger.debug("ThemeManager", "Storing theme in localStorage", { theme });
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    Logger.debug("ThemeManager", "Successfully saved theme to localStorage");
  } catch (error) {
    Logger.error("ThemeManager", "Error storing theme preference in localStorage", error);
  }

  // Update the toggle button icon if provided
  if (themeIcon) {
    Logger.debug("ThemeManager", "Updating theme toggle icon");
    updateThemeToggleIcon(theme, themeIcon);
  } else {
    Logger.debug("ThemeManager", "No theme icon provided to update");
  }
}

/**
 * Toggle between light and dark themes
 * @param {string} currentTheme - The current theme ('light' or 'dark')
 * @param {HTMLElement} themeIcon - Optional SVG icon element to update
 * @returns {string} The new theme after toggling
 */
export function toggleTheme(currentTheme, themeIcon = null) {
  Logger.log("ThemeManager", "Toggling theme", { currentTheme });

  // Ensure we have a valid starting theme
  if (currentTheme !== "light" && currentTheme !== "dark") {
    Logger.warn("ThemeManager", "Invalid current theme, defaulting to light before toggle", {
      providedTheme: currentTheme,
    });
    currentTheme = "light";
  }

  const newTheme = currentTheme === "light" ? "dark" : "light";
  Logger.log("ThemeManager", "Theme will be toggled", { from: currentTheme, to: newTheme });

  applyTheme(newTheme, themeIcon);

  Logger.log("ThemeManager", "Theme successfully toggled", { from: currentTheme, to: newTheme });
  return newTheme;
}

/**
 * Update the theme toggle button icon based on current theme
 * @param {string} currentTheme - The current theme ('light' or 'dark')
 * @param {HTMLElement} themeIcon - The SVG icon element to update
 */
export function updateThemeToggleIcon(currentTheme, themeIcon) {
  if (!themeIcon) {
    Logger.warn("ThemeManager", "updateThemeToggleIcon called without a valid icon element");
    return;
  }

  Logger.debug("ThemeManager", "Updating theme icon", { theme: currentTheme });

  try {
    if (currentTheme === "dark") {
      Logger.debug("ThemeManager", "Setting icon styles for dark theme (filled)");
      themeIcon.style.fill = "currentColor";
      themeIcon.style.stroke = "none";
    } else {
      Logger.debug("ThemeManager", "Setting icon styles for light theme (outline)");
      themeIcon.style.fill = "none";
      themeIcon.style.stroke = "currentColor";
    }
    Logger.debug("ThemeManager", "Theme icon updated successfully");
  } catch (error) {
    Logger.error("ThemeManager", "Error updating theme icon", error);
  }
}
