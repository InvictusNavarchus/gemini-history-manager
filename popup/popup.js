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
    return history;
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
  
  // Format last conversation time
  if (historyData[0] && historyData[0].timestamp) {
    const lastDate = new Date(historyData[0].timestamp);
    elements.lastConversationTime.textContent = formatTimeAgo(lastDate);
    Logger.log(`Last conversation: ${formatTimeAgo(lastDate)} (${lastDate.toISOString()})`);
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
  date.textContent = formatDate(new Date(entry.timestamp));
  
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
    try {
      const historyData = await loadHistoryData();
      if (historyData.length === 0) {
        Logger.warn('No history data to export');
        alert('No history data to export');
        return;
      }
      
      Logger.log(`Preparing to export ${historyData.length} conversations`);
      const blob = new Blob([JSON.stringify(historyData, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const filename = `gemini-history-export-${formatDateForFilename(new Date())}.json`;
      
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
      alert('Failed to export history data');
    }
  });
  
  // Open import file dialog
  elements.importHistoryBtn.addEventListener('click', () => {
    Logger.log("Import history button clicked, opening file dialog");
    elements.importFileInput.click();
  });
  
  // Handle import file selection
  elements.importFileInput.addEventListener('change', handleImportFile);
}

/**
 * Handles file import
 */
async function handleImportFile(event) {
  Logger.log("File selected for import");
  const file = event.target.files[0];
  if (!file) {
    Logger.warn("No file selected for import");
    return;
  }
  
  Logger.log(`Selected file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
  
  try {
    Logger.log("Reading file content...");
    const text = await readFile(file);
    Logger.log("File content read, parsing JSON...");
    const importedData = JSON.parse(text);
    
    if (!Array.isArray(importedData)) {
      Logger.error("Imported data is not an array. Invalid format.");
      throw new Error('Invalid data format: Expected an array.');
    }
    Logger.log(`Parsed ${importedData.length} items from imported file.`);
    
    // Get current data and merge, avoiding duplicates
    Logger.log("Loading current history data for merging...");
    const currentData = await loadHistoryData();
    const existingUrls = new Set(currentData.map(item => item.url));
    Logger.log(`Current history has ${currentData.length} items. Found ${existingUrls.size} unique URLs.`);
    
    const newItems = importedData.filter(item => {
      if (!item || typeof item.url !== 'string') {
        Logger.warn("Skipping invalid item in imported data (missing or invalid URL):", item);
        return false;
      }
      return !existingUrls.has(item.url);
    });
    
    Logger.log(`Found ${newItems.length} new items to import.`);
    
    if (newItems.length === 0) {
      Logger.log('No new conversations found in import file. Import aborted.');
      alert('No new conversations found in import file');
      // Reset the input
      event.target.value = '';
      return;
    }
    
    // Merge and sort by timestamp (newest first)
    Logger.log("Merging new items with current history...");
    const mergedData = [...currentData, ...newItems].sort((a, b) => {
      // Ensure timestamps are valid dates for sorting
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      if (isNaN(dateA) || isNaN(dateB)) {
        Logger.warn("Invalid timestamp found during sort:", a, b);
        return 0; // or handle as appropriate
      }
      return dateB - dateA;
    });
    Logger.log(`Merged data contains ${mergedData.length} items. Saving to storage...`);
    
    // Save merged data
    await browser.storage.local.set({ [STORAGE_KEY]: mergedData });
    Logger.log("Merged data saved to storage.");
    
    // Update badge
    Logger.log("Sending message to update history count in badge...");
    browser.runtime.sendMessage({
      action: 'updateHistoryCount',
      count: mergedData.length
    });
    
    alert(`Import complete: Added ${newItems.length} new conversations`);
    Logger.log(`Import successful. Added ${newItems.length} new conversations. Reloading popup.`);
    window.location.reload();
  } catch (error) {
    Logger.error('Import error:', error.message, error.stack);
    alert(`Import error: ${error.message}`);
  }
  
  // Reset the input
  Logger.log("Resetting file input.");
  event.target.value = '';
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
 * Formats a date for display in the conversation list
 */
function formatDate(date) {
  // For today, show time only
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // For this year, show month and day
  if (date.getFullYear() === today.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  
  // For other years, include year
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Formats a time difference as a human-readable string (e.g. "5 minutes ago")
 */
function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  
  if (diffSecs < 60) {
    return 'Just now';
  }
  
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) {
    return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  }
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
  
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
}

/**
 * Formats a date for use in filenames
 */
function formatDateForFilename(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', initPopup);
