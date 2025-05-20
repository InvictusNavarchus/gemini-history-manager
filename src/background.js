/**
 * Gemini History Manager - Background Script
 * Manages background events and browser action functionality
 */
import { Logger } from './lib/utils.js';

// Initialize logger with background context
Logger.initLogger('BACKGROUND');

// Store global state
const STATE = {
  historyCount: 0
};

/**
 * Updates the browser action badge with the current history count
 */
function updateBadge(count) {
  Logger.debug("background", `Updating badge with count: ${count}`);
  
  // Update local state
  const previousCount = STATE.historyCount;
  STATE.historyCount = count || STATE.historyCount;
  
  Logger.debug("background", `Badge count: previous=${previousCount}, new=${STATE.historyCount}`);
  
  // Update badge text with the count
  browser.action.setBadgeText({
    text: STATE.historyCount > 0 ? STATE.historyCount.toString() : ''
  });
  
  // Set badge background color
  browser.action.setBadgeBackgroundColor({
    color: '#6e41e2' // Purple color matching Gemini's theme
  });
  
  Logger.log("background", `Badge updated: ${STATE.historyCount > 0 ? STATE.historyCount.toString() : 'empty'}`);
}

/**
 * Initialize the extension on install or update
 */
function initializeExtension() {
  Logger.log("background", 'Background script initializing');
  
  // Get history count from storage and update badge
  Logger.debug("background", 'Loading history data from storage to update badge');
  browser.storage.local.get('geminiChatHistory')
    .then(data => {
      const history = data.geminiChatHistory || [];
      Logger.debug("background", `Loaded ${history.length} history items from storage`);
      updateBadge(history.length);
      Logger.log("background", `Badge updated with count: ${history.length}`);
    })
    .catch(error => {
      Logger.error("background", 'Error loading history for badge:', error);
    });
    
  Logger.log("background", 'Background script initialized successfully');
}

/**
 * Handle browser action icon click
 * Opens the popup by default
 */
browser.action.onClicked.addListener(() => {
  // The popup will be shown automatically if defined in manifest
  Logger.log("background", 'Browser action clicked');
});

/**
 * Listen for messages from content scripts and popup
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  Logger.log("background", `Received message: ${JSON.stringify(message)}`);
  const senderInfo = sender.tab ? 
    `from content script in tab ${sender.tab.id} (${sender.tab.url})` : 
    'from extension page';
  Logger.debug("background", `Message source: ${senderInfo}`);
  
  switch (message.action) {
    case 'updateHistoryCount':
      Logger.log("background", `Updating badge count to ${message.count}`);
      updateBadge(message.count);
      break;
      
    case 'openHistoryPage':
      Logger.log("background", 'Opening dashboard/history page in new tab');
      browser.tabs.create({
        url: '/dashboard/dashboard.html'
      }).then(tab => {
        Logger.debug("background", `Dashboard opened in tab ID: ${tab.id}`);
      }).catch(err => {
        Logger.error("background", 'Error opening dashboard tab:', err);
      });
      break;
      
    case 'getHistoryCount':
      Logger.log("background", `Responding with current history count: ${STATE.historyCount}`);
      sendResponse({ count: STATE.historyCount });
      break;
      
    default:
      Logger.warn("background", `Received unknown action: ${message.action}`);
  }
});

/**
 * Handle extension installation and updates
 */
browser.runtime.onInstalled.addListener((details) => {
  Logger.log("background", `Extension ${details.reason} event triggered`);
  Logger.debug("background", `Install details: ${JSON.stringify({
    reason: details.reason,
    previousVersion: details.previousVersion,
    id: details.id
  })}`);
  
  // Additional setup that should only happen on install could go here
  if (details.reason === 'install') {
    // First-time installation specific setup
    Logger.log("background", 'Extension installed for the first time - initializing setup');
  } else if (details.reason === 'update') {
    Logger.log("background", `Extension updated from version ${details.previousVersion}`);
  }
});

/**
 * Handle browser startup event
 */
browser.runtime.onStartup.addListener(() => {
  Logger.log("background", 'Browser started - initializing extension');
  Logger.debug("background", 'onStartup event triggered - this happens when browser starts with extension already installed');
});

/**
 * Log errors that occur in the background script context
 */
window.addEventListener('error', (event) => {
  Logger.error("background", `Uncaught error: ${event.message}`, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

// Initialize the extension - this only needs to happen once
// when the background script loads initially
Logger.log("background", 'Background script loaded - starting initialization');
initializeExtension();