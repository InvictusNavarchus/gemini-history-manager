/**
 * Gemini History Manager - Popup Script
 * Handles UI interactions and displays chat history data
 */

// Initialize Day.js plugins
initDayjsPlugins();

// DOM Elements
const elements = {
  totalConversations: document.getElementById('totalConversations'),
  mostUsedModel: document.getElementById('mostUsedModel'),
  lastConversationTime: document.getElementById('lastConversationTime'),
  recentConversations: document.getElementById('recentConversations'),
  exportHistoryBtn: document.getElementById('exportHistory'),
  importHistoryBtn: document.getElementById('importHistory'),
  openFullPageBtn: document.getElementById('openFullPage'),
  importFileInput: document.getElementById('importFileInput'),
  themeToggle: document.getElementById('themeToggle'),
  footerVersion: document.querySelector('footer p') // Add reference to footer version element
};

// Constants
const STORAGE_KEY = 'geminiChatHistory';
const MAX_PREVIEW_CONVERSATIONS = 5;

// Current theme state (shared with dashboard)
let currentTheme = 'light'; // Default theme that will be updated in initTheme()

/**
 * Initializes the popup
 */
async function initPopup() {
  try {
    Logger.log("Initializing Gemini History Manager popup...");
    
    // Initialize theme before loading UI
    initThemeForPopup();
    
    // Load extension version from manifest
    loadExtensionVersion();
    
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
 * Loads and displays the extension version from manifest.json
 */
function loadExtensionVersion() {
  try {
    const manifestData = browser.runtime.getManifest();
    if (manifestData && manifestData.version && elements.footerVersion) {
      elements.footerVersion.textContent = `Gemini History Manager v${manifestData.version}`;
      Logger.log(`Extension version loaded: ${manifestData.version}`);
    } else {
      Logger.warn("Could not load extension version from manifest");
    }
  } catch (error) {
    Logger.error("Error loading extension version:", error);
  }
}

/**
 * Initialize theme based on storage or system preference
 */
function initThemeForPopup() {
  // Use the shared initTheme function from utils.js
  window.initTheme((theme) => {
    currentTheme = theme;
    applyTheme(currentTheme, elements.themeToggle.querySelector('svg'));
  });
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
  
  // Format last conversation time 
  if (historyData[0] && historyData[0].timestamp) {
    const lastDateDayjs = parseTimestamp(historyData[0].timestamp);
    // Check if relativeTime plugin is loaded and fromNow method exists
    if (lastDateDayjs.isValid() && typeof lastDateDayjs.fromNow === 'function') {
        elements.lastConversationTime.textContent = lastDateDayjs.fromNow();
        Logger.log(`Last conversation: ${lastDateDayjs.fromNow()} (${lastDateDayjs.toISOString()})`);
    } else {
        elements.lastConversationTime.textContent = 'Invalid date';
        Logger.warn(`Could not format last conversation time: ${historyData[0].timestamp}. Day.js valid: ${lastDateDayjs.isValid()}, fromNow exists: ${typeof lastDateDayjs.fromNow === 'function'}`);
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
  if (entry.timestamp) {
    date.textContent = formatDateForDisplay(parseTimestamp(entry.timestamp));
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
    if (!dayjs) {
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
      const filename = `gemini-history-export-${dayjs().format('YYYY-MM-DD')}.json`;
      
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
        url: '/dashboard/dashboard.html?action=import'
      });
      window.close();
    }, 1500);
  });

  // Theme toggle button
  elements.themeToggle.addEventListener('click', () => {
    Logger.log("Theme toggle button clicked");
    currentTheme = window.toggleTheme(currentTheme, elements.themeToggle.querySelector('svg'));
  });
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', initPopup);
