/**
 * Gemini History Manager - Popup Script
 * Handles UI interactions and displays chat history data
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

// Initialize Day.js plugins
// It's assumed that dayjs core and these plugins are loaded globally,
// e.g., via script tags in the HTML or through the extension's manifest.
// The `window.dayjs.extend` syntax is used as per the prompt's implication.
try {
  if (window.dayjs && typeof window.dayjs.extend === 'function') {
    if (window.dayjs_plugin_relativeTime) {
      window.dayjs.extend(window.dayjs_plugin_relativeTime);
      Logger.debug("Day.js relativeTime plugin extended.");
    } else {
      Logger.warn("Day.js relativeTime plugin (window.dayjs_plugin_relativeTime) not found. 'Time ago' functionality might be affected.");
    }
    if (window.dayjs_plugin_calendar) {
      window.dayjs.extend(window.dayjs_plugin_calendar);
      Logger.debug("Day.js calendar plugink extended.");
    } else {
      Logger.warn("Day.js calendar plugin (window.dayjs_plugin_calendar) not found.");
    }
    if (window.dayjs_plugin_localizedFormat) {
      window.dayjs.extend(window.dayjs_plugin_localizedFormat);
      Logger.debug("Day.js localizedFormat plugin extended.");
    } else {
      Logger.warn("Day.js localizedFormat plugin (window.dayjs_plugin_localizedFormat) not found. Some date formats might be affected.");
    }
  } else if (window.dayjs) {
    Logger.warn("window.dayjs.extend is not a function. Plugins might not be loaded correctly.");
  } else {
    Logger.error("Day.js (window.dayjs) not found. Date functionalities will not work.");
  }
} catch (e) {
    Logger.error("Error extending Day.js plugins:", e);
}


// DOM Elements
const elements = {
  totalConversations: document.getElementById('totalConversations'),
  mostUsedModel: document.getElementById('mostUsedModel'),
  lastConversationTime: document.getElementById('lastConversationTime'),
  recentConversations: document.getElementById('recentConversations'),
  exportHistoryBtn: document.getElementById('exportHistory'),
  importHistoryBtn: document.getElementById('importHistory'),
  openFullPageBtn: document.getElementById('openFullPage'),
  importFileInput: document.getElementById('importFileInput')
};

// Constants
const STORAGE_KEY = 'geminiChatHistory';
const MAX_PREVIEW_CONVERSATIONS = 5;

/**
 * Initializes the popup
 */
async function initPopup() {
  try {
    Logger.log("Initializing Gemini History Manager popup...");
    // Load and display chat history data
    const historyData = await loadHistoryData();
    
    if (historyData && historyData.length > 0) {
      Logger.log(`Loaded ${historyData.length} conversations, updating UI`);
      updateStats(historyData);
      displayRecentConversations(historyData);
    } else {
      Logger.log("No history data found, displaying empty state");
      showEmptyState();
    }
    
    // Set up event listeners
    setupEventListeners();
    Logger.log("Popup initialization complete");
    
  } catch (error) {
    Logger.error("Error initializing popup:", error);
    showError('Failed to load history data');
  }
}

/**
 * Loads chat history data from storage
 */
async function loadHistoryData() {
  Logger.log("Loading history data from storage...");
  try {
    const data = await browser.storage.local.get(STORAGE_KEY);
    const history = data[STORAGE_KEY] || [];
    Logger.log(`Retrieved ${history.length} history entries from storage`);
    // Ensure timestamps are valid for dayjs processing
    return history.map(entry => ({
        ...entry,
        timestamp: entry.timestamp // Assuming timestamp is already in a format dayjs can parse (ISO 8601, Unix ms)
    }));
  } catch (error) {
    Logger.error("Error loading history data:", error);
    throw error;
  }
}

/**
 * Updates the statistics section with data from history
 */
function updateStats(historyData) {
  Logger.log("Updating statistics display...");
  // Update total conversations count
  elements.totalConversations.textContent = historyData.length;
  
  // Find most used model
  const modelCounts = historyData.reduce((acc, entry) => {
    const model = entry.model || 'Unknown';
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});
  
  const mostUsed = Object.entries(modelCounts)
    .sort((a, b) => b[1] - a[1])[0];
    
  elements.mostUsedModel.textContent = mostUsed ? mostUsed[0] : '-';
  Logger.log(`Most used model: ${mostUsed ? mostUsed[0] : 'None'} (${mostUsed ? mostUsed[1] : 0} uses)`);
  
  // Format last conversation time using Day.js
  if (historyData[0] && historyData[0].timestamp && window.dayjs) {
    const lastTimestamp = historyData[0].timestamp;
    const lastDateDayjs = window.dayjs(lastTimestamp);
    // Check if relativeTime plugin is loaded and fromNow method exists
    if (lastDateDayjs.isValid() && typeof lastDateDayjs.fromNow === 'function') {
        elements.lastConversationTime.textContent = lastDateDayjs.fromNow();
        Logger.log(`Last conversation: ${lastDateDayjs.fromNow()} (${lastDateDayjs.toISOString()})`);
    } else {
        elements.lastConversationTime.textContent = 'Invalid date';
        Logger.warn(`Could not format last conversation time: ${lastTimestamp}. Day.js valid: ${lastDateDayjs.isValid()}, fromNow exists: ${typeof lastDateDayjs.fromNow === 'function'}`);
    }
  } else {
    elements.lastConversationTime.textContent = '-';
  }
}

/**
 * Displays recent conversations in the list
 */
function displayRecentConversations(historyData) {
  Logger.log(`Displaying the ${Math.min(historyData.length, MAX_PREVIEW_CONVERSATIONS)} most recent conversations...`);
  // Clear any existing content
  elements.recentConversations.innerHTML = '';
  
  // Get the most recent conversations (limited by MAX_PREVIEW_CONVERSATIONS)
  const recentEntries = historyData.slice(0, MAX_PREVIEW_CONVERSATIONS);
  
  // Create and append conversation items
  recentEntries.forEach(entry => {
    const conversationItem = createConversationItem(entry);
    elements.recentConversations.appendChild(conversationItem);
  });
  Logger.log("Recent conversations display updated");
}

/**
 * Creates a DOM element for a conversation item
 */
function createConversationItem(entry) {
  Logger.debug(`Creating conversation item element for "${entry.title || 'Untitled'}" (${entry.url})`);
  const item = document.createElement('div');
  item.className = 'conversation-item';
  item.dataset.url = entry.url;
  
  const title = document.createElement('div');
  title.className = 'conversation-title';
  title.textContent = entry.title || 'Untitled Conversation';
  
  const meta = document.createElement('div');
  meta.className = 'conversation-meta';
  
  const date = document.createElement('span');
  date.className = 'conversation-date';
  if (entry.timestamp && window.dayjs) {
    date.textContent = formatDateForDisplay(window.dayjs(entry.timestamp));
  } else {
    date.textContent = 'No date';
  }
  
  const model = document.createElement('span');
  model.className = 'conversation-model';
  model.textContent = entry.model || 'Unknown';
  
  meta.appendChild(date);
  meta.appendChild(model);
  
  item.appendChild(title);
  item.appendChild(meta);
  
  // Add click event to open the conversation
  item.addEventListener('click', () => {
    browser.tabs.create({ url: entry.url });
    window.close(); // Close the popup
  });
  
  return item;
}

/**
 * Shows empty state when no conversations are found
 */
function showEmptyState() {
  // Clear existing content
  while (elements.recentConversations.firstChild) {
    elements.recentConversations.removeChild(elements.recentConversations.firstChild);
  }
  
  // Create empty state container
  const emptyStateDiv = document.createElement('div');
  emptyStateDiv.className = 'empty-state';
  
  // Create message
  const message = document.createElement('p');
  message.textContent = 'No conversation history found';
  
  // Create start button
  const startButton = document.createElement('button');
  startButton.id = 'startChatBtn';
  startButton.className = 'button primary-button';
  startButton.textContent = 'Start a Gemini Chat';
  
  // Add event listener for the start button
  startButton.addEventListener('click', () => {
    browser.tabs.create({ url: 'https://gemini.google.com/app' });
    window.close();
  });
  
  // Append elements to container
  emptyStateDiv.appendChild(message);
  emptyStateDiv.appendChild(startButton);
  
  // Add to DOM
  elements.recentConversations.appendChild(emptyStateDiv);
  
  // Update stats to show zero/empty
  elements.totalConversations.textContent = '0';
  elements.mostUsedModel.textContent = '-';
  elements.lastConversationTime.textContent = '-';
}

/**
 * Shows error message
 */
function showError(message) {
  // Clear existing content
  while (elements.recentConversations.firstChild) {
    elements.recentConversations.removeChild(elements.recentConversations.firstChild);
  }
  
  // Create empty state container
  const errorDiv = document.createElement('div');
  errorDiv.className = 'empty-state';
  
  // Create error message
  const errorMsg = document.createElement('p');
  errorMsg.textContent = `Error: ${message}`;
  
  // Create reload button
  const reloadBtn = document.createElement('button');
  reloadBtn.id = 'reloadBtn';
  reloadBtn.className = 'button primary-button';
  reloadBtn.textContent = 'Reload';
  
  // Add event listener to reload button
  reloadBtn.addEventListener('click', () => {
    window.location.reload();
  });
  
  // Append elements
  errorDiv.appendChild(errorMsg);
  errorDiv.appendChild(reloadBtn);
  elements.recentConversations.appendChild(errorDiv);
}

/**
 * Sets up event listeners for buttons and interactions
 */
function setupEventListeners() {
  // Open full history page
  elements.openFullPageBtn.addEventListener('click', () => {
    Logger.log("Open full page button clicked");
    browser.runtime.sendMessage({ action: 'openHistoryPage' });
    window.close();
  });
  
  // Export history
  elements.exportHistoryBtn.addEventListener('click', async () => {
    Logger.log("Export history button clicked");
    if (!window.dayjs) {
        Logger.error("Day.js not available for formatting filename in export.");
        alert('Date library not available. Cannot export.'); // Consider using a less intrusive notification
        return;
    }
    try {
      const historyData = await loadHistoryData();
      if (historyData.length === 0) {
        Logger.warn('No history data to export');
        alert('No history data to export'); // Consider using a less intrusive notification
        return;
      }
      
      Logger.log(`Preparing to export ${historyData.length} conversations`);
      const blob = new Blob([JSON.stringify(historyData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      // Format date for filename using Day.js
      const filename = `gemini-history-export-${window.dayjs().format('YYYY-MM-DD')}.json`;
      
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = filename;
      
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      URL.revokeObjectURL(url);
      Logger.log(`History exported successfully as ${filename}`);
    } catch (error) {
      Logger.error('Error exporting history:', error);
      alert('Failed to export history data'); // Consider using a less intrusive notification
    }
  });

  // Import button - Redirects to history page with a clear message
  elements.importHistoryBtn.addEventListener('click', () => {
    Logger.log("Import history button clicked, preparing to redirect to full view");
    
    // Show a brief message explaining the redirection
    const messageDiv = document.createElement('div');
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '0';
    messageDiv.style.left = '0';
    messageDiv.style.right = '0';
    messageDiv.style.bottom = '0';
    messageDiv.style.backgroundColor = 'rgba(0,0,0,0.85)';
    messageDiv.style.color = 'white';
    messageDiv.style.display = 'flex';
    messageDiv.style.flexDirection = 'column';
    messageDiv.style.alignItems = 'center';
    messageDiv.style.justifyContent = 'center';
    messageDiv.style.padding = '20px';
    messageDiv.style.zIndex = '9999';
    messageDiv.style.textAlign = 'center';
    
    messageDiv.innerHTML = `
      <div style="font-size: 24px; margin-bottom: 10px;">Opening Import...</div>
      <div style="font-size: 14px; margin-bottom: 20px;">Due to browser limitations, the import function will open in the full history view.</div>
      <div class="loading-spinner" style="border: 4px solid #f3f3f3; border-top: 4px solid #6e41e2; border-radius: 50%; width: 30px; height: 30px; animation: spin 2s linear infinite;"></div>
    `;
    
    // Add keyframe animation for spinner
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    // Add to DOM
    document.body.appendChild(messageDiv);
    
    // Wait a moment to show the message before redirecting
    setTimeout(() => {
      // Open history page with import parameter
      browser.tabs.create({
        url: '/popup/history.html?action=import'
      });
      window.close();
    }, 1500);
  });
}

/**
 * Reads a file as text
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
 * Formats a Day.js object for display in the conversation list using the calendar plugin.
 * Replaces the original formatDate and its custom Day.js logic.
 * @param {Object} djsDate - A Day.js date object.
 * @returns {string} Formatted date string (e.g., "Today at 2:30 PM", "Yesterday at 10:00 AM", "01/15/2023").
 */
function formatDateForDisplay(djsDate) {
  if (!window.dayjs || !djsDate || !djsDate.isValid()) {
    Logger.warn("Invalid date or Day.js not available for formatDateForDisplay");
    return "Invalid Date";
  }
  
  // Use the Day.js calendar plugin for human-friendly, relative time display.
  // The output format will depend on the proximity of the date and the loaded locale/plugins.
  // For example: "Today at 2:30 PM", "Yesterday at 10:00 AM", "Last Monday at 5:00 PM", or "01/15/2023".
  if (typeof djsDate.calendar === 'function') {
    return djsDate.calendar();
  } else {
    // Fallback if calendar plugin somehow isn't loaded on the instance,
    // though it should be if extended globally. This is a safety measure.
    Logger.warn("Day.js calendar function not found on date instance, falling back to basic format.");
    // Using a generic ISO-like format as a fallback that's clearly different from calendar output
    return djsDate.format('YYYY-MM-DD HH:mm'); 
  }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', initPopup);
