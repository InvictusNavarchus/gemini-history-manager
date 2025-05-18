/**
 * Shared theme detection helper for Gemini History Manager
 * This provides consistent theme detection across popup and dashboard
 */

/**
 * Detects and returns the system color scheme preference
 * Uses a more robust detection method that's consistent across contexts
 * @returns {string} 'dark' or 'light'
 */
export function detectSystemColorScheme() {
  // Primary method - using matchMedia
  if (window.matchMedia) {
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (darkModeQuery.matches) {
      return 'dark';
    }
  }
  
  // Fallback - check if browser provides colorScheme
  if (window.navigator && window.navigator.userAgentData && 
      window.navigator.userAgentData.getHighEntropyValues) {
    try {
      const values = window.navigator.userAgentData.getHighEntropyValues(['prefersColorScheme']);
      if (values && values.prefersColorScheme === 'dark') {
        return 'dark';
      }
    } catch (e) {
      console.error('[Gemini History] Error checking navigator color scheme:', e);
    }
  }
  
  // Default to light if no dark mode detected
  return 'light';
}

/**
 * Applies the theme to the document based on storage or system preference
 * @param {boolean} useTransitionDelay - Whether to add transition delay
 */
export function applyInitialTheme(useTransitionDelay = true) {
  // Start with the initial load class if using transition delay
  if (useTransitionDelay) {
    document.documentElement.classList.add('initial-load');
  }
  
  try {
    // Check for saved theme
    const savedTheme = localStorage.getItem('geminiHistoryTheme');
    
    if (savedTheme) {
      // Apply saved theme
      console.log('[Gemini History] Applying saved theme from localStorage:', savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      // If no saved theme, use consistent system preference detection
      const systemTheme = detectSystemColorScheme();
      console.log('[Gemini History] No saved theme found. Using system preference:', systemTheme);
      document.documentElement.setAttribute('data-theme', systemTheme);
    }
    
    // Enable transitions after rendering if using delay
    if (useTransitionDelay) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.documentElement.classList.remove('initial-load');
        });
      });
    }
    
  } catch (e) {
    console.error('[Gemini History] Error setting initial theme:', e);
    // Default to light theme if there's an error
    document.documentElement.setAttribute('data-theme', 'light');
    
    if (useTransitionDelay) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.documentElement.classList.remove('initial-load');
        });
      });
    }
  }
}
