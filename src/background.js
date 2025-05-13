/**
 * Gemini History Manager - Background Script
 * Manages background events and browser action functionality
 */

// Store global state
const STATE = {
  historyCount: 0
};

/**
 * Updates the browser action badge with the current history count
 */
function updateBadge(count) {
  // Update local state
  STATE.historyCount = count || STATE.historyCount;
  
  // Update badge text with the count
  browser.action.setBadgeText({
    text: STATE.historyCount > 0 ? STATE.historyCount.toString() : ''
  });
  
  // Set badge background color
  browser.action.setBadgeBackgroundColor({
    color: '#6e41e2' // Purple color matching Gemini's theme
  });
}

/**
 * Initialize the extension on install or update
 */
function initializeExtension() {
  console.log('[Gemini History] Background script initialized');
  
  // Get history count from storage and update badge
  browser.storage.local.get('geminiChatHistory')
    .then(data => {
      const history = data.geminiChatHistory || [];
      updateBadge(history.length);
    })
    .catch(error => {
      console.error('[Gemini History] Error loading history for badge:', error);
    });
}

/**
 * Handle browser action icon click
 * Opens the popup by default
 */
browser.action.onClicked.addListener(() => {
  // The popup will be shown automatically if defined in manifest
  console.log('[Gemini History] Browser action clicked');
});

/**
 * Listen for messages from content scripts and popup
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Gemini History] Received message:', message);
  
  switch (message.action) {
    case 'updateHistoryCount':
      updateBadge(message.count);
      break;
      
    case 'openHistoryPage':
      // Open the history page in a new tab
      browser.tabs.create({
        url: '/dashboard/dashboard.html'
      });
      break;
      
    case 'getHistoryCount':
      sendResponse({ count: STATE.historyCount });
      break;
  }
});

/**
 * Handle extension installation and updates
 */
browser.runtime.onInstalled.addListener((details) => {
  console.log(`[Gemini History] Extension ${details.reason}:`, details);
  
  // Additional setup that should only happen on install could go here
  if (details.reason === 'install') {
    // First-time installation specific setup
    console.log('[Gemini History] Extension installed for the first time');
  }
});

/**
 * Handle browser startup event
 */
browser.runtime.onStartup.addListener(() => {
  console.log('[Gemini History] Browser started');
});

// Initialize the extension - this only needs to happen once
// when the background script loads initially

initializeExtension();