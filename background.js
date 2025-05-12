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
  browser.browserAction.setBadgeText({
    text: STATE.historyCount > 0 ? STATE.historyCount.toString() : ''
  });
  
  // Set badge background color
  browser.browserAction.setBadgeBackgroundColor({
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
browser.browserAction.onClicked.addListener(() => {
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
        url: '/popup/dashboard.html'
      });
      break;
      
    case 'getHistoryCount':
      sendResponse({ count: STATE.historyCount });
      break;
  }
});

// Initialize the extension
initializeExtension();