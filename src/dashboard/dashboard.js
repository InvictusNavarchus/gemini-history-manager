/**
 * Gemini History Manager - Full History View
 * Handles data visualization, filtering, and conversation management
 */
import { 
  initDayjsPlugins, 
  Logger, 
  dayjsFormatDate, 
  parseTimestamp, 
  formatDateForDisplay, 
  readFile,
  applyTheme, 
  toggleTheme 
} from '../lib/utils.js';
import Chart from 'chart.js/auto';

// Initialize Day.js plugins
initDayjsPlugins();

// DOM Elements
const elements = {
  // Main Page Tabs
  mainHistoryTab: document.getElementById('mainHistoryTab'),
  mainVisualizationTab: document.getElementById('mainVisualizationTab'),
  historyContent: document.getElementById('historyContent'),
  visualizationContent: document.getElementById('visualizationContent'),
  pageTabs: document.querySelectorAll('.page-tab'), // For main page tab switching
  pageTabContents: document.querySelectorAll('.page-tab-content'), // For main page tab content switching

  // Stats elements (now part of visualization tab)
  totalConversations: document.getElementById('totalConversations'),
  mostUsedModel: document.getElementById('mostUsedModel'),
  mostUsedModelCount: document.getElementById('mostUsedModelCount'),
  avgTitleLength: document.getElementById('avgTitleLength'),
  firstConversationTime: document.getElementById('firstConversationTime'),
  lastConversationTime: document.getElementById('lastConversationTime'),
  totalFilesUploaded: document.getElementById('totalFilesUploaded'),
  
  // Filter elements (in sidebar, within history tab)
  modelFilter: document.getElementById('modelFilter'),
  dateFilter: document.getElementById('dateFilter'),
  customDateRange: document.getElementById('customDateRange'),
  startDate: document.getElementById('startDate'),
  endDate: document.getElementById('endDate'),
  searchFilter: document.getElementById('searchFilter'), // In header, but affects history
  
  // Visualization elements (chart sub-tabs and canvas, within visualization tab)
  vizTabs: document.querySelectorAll('.viz-tab'), // Sub-tabs for charts
  vizChart: document.getElementById('vizChart'),
  vizOptions: document.getElementById('vizOptions'),
  activityVizOptions: document.getElementById('activityVizOptions'),
  activityModelSelect: document.getElementById('activityModelSelect'),
  activityModelFilter: document.getElementById('activityModelFilter'),
  
  // Conversation list elements (within history tab)
  conversationList: document.getElementById('conversationList'),
  conversationCount: document.getElementById('conversationCount'),
  sortBy: document.getElementById('sortBy'),
  emptyState: document.getElementById('emptyState'),
  loadingState: document.getElementById('loadingState'),
  
  // Modal elements
  conversationModal: document.getElementById('conversationModal'),
  modalTitle: document.getElementById('modalTitle'),
  detailTitle: document.getElementById('detailTitle'),
  detailDate: document.getElementById('detailDate'),
  detailModel: document.getElementById('detailModel'),
  detailAccount: document.getElementById('detailAccount'),
  detailPrompt: document.getElementById('detailPrompt'),
  detailFilesGroup: document.getElementById('detailFilesGroup'),
  detailFiles: document.getElementById('detailFiles'),
  closeModal: document.getElementById('closeModal'),
  openConversation: document.getElementById('openConversation'),
  deleteConversation: document.getElementById('deleteConversation'),
  
  // Confirmation modal elements
  confirmationModal: document.getElementById('confirmationModal'),
  confirmationTitle: document.getElementById('confirmationTitle'),
  confirmationMessage: document.getElementById('confirmationMessage'),
  closeConfirmation: document.getElementById('closeConfirmation'),
  cancelAction: document.getElementById('cancelAction'),
  confirmAction: document.getElementById('confirmAction'),
  
  // Button elements (in header)
  themeToggle: document.getElementById('themeToggle'),
  exportHistoryBtn: document.getElementById('exportHistory'),
  importHistoryBtn: document.getElementById('importHistory'),
  clearHistoryBtn: document.getElementById('clearHistory'),
  importFileInput: document.getElementById('importFileInput'),
  
  // Toast container (will be created dynamically)
  toastContainer: null
};

// Constants
const STORAGE_KEY = 'geminiChatHistory';
const CHART_COLORS = [
  'rgba(110, 65, 226, 0.8)', // Primary purple
  'rgba(71, 163, 255, 0.8)',  // Blue
  'rgba(0, 199, 176, 0.8)',   // Teal
  'rgba(255, 167, 38, 0.8)',  // Orange
  'rgba(239, 83, 80, 0.8)',   // Red
  'rgba(171, 71, 188, 0.8)'   // Pink
];

/**
 * Toast notification system
 */
const Toast = {
  types: {
    SUCCESS: 'success',
    ERROR: 'error',
    INFO: 'info',
    WARNING: 'warning'
  },
  
  /**
   * Create a toast notification
   * @param {string} message - The message to display
   * @param {string} type - Type of toast: 'success', 'error', 'info', or 'warning'
   * @param {number} duration - Duration in ms before auto-hide, default 5000ms
   * @returns {HTMLElement} - The created toast element
   */
  create: function(message, type = this.types.INFO, duration = 5000) {
    Logger.log(`Toast: ${type} - ${message}`);
    
    // Create toast container if it doesn't exist
    if (!elements.toastContainer) {
      elements.toastContainer = document.createElement('div');
      elements.toastContainer.className = 'toast-container';
      document.body.appendChild(elements.toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Toast icon
    const icon = document.createElement('div');
    icon.className = 'toast-icon';
    
    // Icon content based on type
    switch (type) {
      case this.types.SUCCESS:
        icon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        `;
        break;
      case this.types.ERROR:
        icon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        `;
        break;
      case this.types.WARNING:
        icon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        `;
        break;
      case this.types.INFO:
      default:
        icon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        `;
        break;
    }
    
    // Toast content
    const content = document.createElement('div');
    content.className = 'toast-content';
    content.textContent = message;
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', () => this.remove(toast));
    
    // Add progress bar if duration > 0
    if (duration > 0) {
      const progressContainer = document.createElement('div');
      progressContainer.className = 'toast-progress';
      
      const progressBar = document.createElement('div');
      progressBar.className = 'toast-progress-bar';
      progressBar.style.animation = `progress-animation ${duration/1000}s linear forwards`;
      
      progressContainer.appendChild(progressBar);
      toast.appendChild(progressContainer);
      
      // Auto remove after duration
      setTimeout(() => {
        if (toast.parentNode) {
          this.remove(toast);
        }
      }, duration);
    }
    
    // Assemble toast
    toast.appendChild(icon);
    toast.appendChild(content);
    toast.appendChild(closeBtn);
    
    // Add to container
    elements.toastContainer.appendChild(toast);
    
    return toast;
  },
  
  /**
   * Remove a toast with animation
   * @param {HTMLElement} toast - The toast element to remove
   */
  remove: function(toast) {
    toast.classList.add('hide');
    
    // Wait for animation to finish before removing from DOM
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      
      // If this was the last toast, remove the container
      if (elements.toastContainer && elements.toastContainer.children.length === 0) {
        document.body.removeChild(elements.toastContainer);
        elements.toastContainer = null;
      }
    }, 300); // Match the CSS animation duration
  },
  
  // Convenience methods for different toast types
  success: function(message, duration) {
    return this.create(message, this.types.SUCCESS, duration);
  },
  
  error: function(message, duration) {
    return this.create(message, this.types.ERROR, duration);
  },
  
  info: function(message, duration) {
    return this.create(message, this.types.INFO, duration);
  },
  
  warning: function(message, duration) {
    return this.create(message, this.types.WARNING, duration);
  }
};

// State management
let allHistory = []; // All history items
let filteredHistory = []; // Filtered history items
let currentChartVisualization = 'modelDistribution'; // For the sub-tabs in visualization section
let chart = null; // Chart.js instance
let confirmationCallback = null; // For handling confirmation modal actions
let currentTheme = null; // Current theme (light/dark)

/**
 * Initialize the application
 */
async function init() {
  try {
    Logger.log("Initializing History Manager application...");
    
    // Set up theme before loading UI
    initThemeForDashboard();
    
    // Load history data
    allHistory = await loadHistoryData();
    
    // Setup initial state (filters will apply to allHistory to get filteredHistory)
    updateFilteredHistory(); 
    
    // Populate UI elements that depend on allHistory
    populateModelFilter(); // Populates filter dropdown based on all models in history
    
    // Set up visualization options
    setupVisualizationOptions();
    
    // Setup date filters (doesn't depend on data, just sets up controls)
    setupDateFilters();
    
    // Update statistics (based on allHistory or filteredHistory, current implementation uses allHistory)
    updateStats(allHistory); 
    
    // Create visualizations (based on allHistory or filteredHistory, current implementation uses allHistory for charts)
    // This will render the default chart in the (initially hidden) visualization tab
    createVisualization(currentChartVisualization); 
    
    // Update conversation list (based on filteredHistory)
    // This will render the list in the (initially active) history tab
    updateConversationList(); 
    
    // Hide loading state
    elements.loadingState.style.display = 'none';
    
    // Setup event listeners (including main page tab switching)
    setupEventListeners();
    
    // Check URL parameters for automatic actions
    checkUrlParameters();
    
    Logger.log("History Manager initialization complete");
    
  } catch (error) {
    Logger.error("Error initializing application:", error);
    showError('Failed to load history data');
  }
}

/**
 * Initialize theme based on storage or system preference
 */
function initThemeForDashboard() {
  // Use the shared initTheme function from utils.js
  window.initTheme((theme) => {
    currentTheme = theme;
    applyTheme(currentTheme, elements.themeToggle.querySelector('svg'));
  });
}

/**
 * Check URL parameters for automatic actions
 */
function checkUrlParameters() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('action')) {
    const action = urlParams.get('action');
    
    if (action === 'import') {
      Logger.log("Import action detected in URL parameters, creating guided import experience");
      
      // Create overlay for guided experience
      createImportGuidedExperience();
    }
  }
}

/**
 * Creates a guided experience to highlight the import button
 * with a simple pulsing arrow below the button
 */
function createImportGuidedExperience() {
  // First, find the import button and get its position
  const importBtn = elements.importHistoryBtn;
  if (!importBtn) {
    Logger.error("Import button not found, cannot create guided experience");
    return;
  }

  const btnRect = importBtn.getBoundingClientRect();
  
  // Create container for the arrow to handle rotation separately from animation
  const arrowContainer = document.createElement('div');
  arrowContainer.className = 'guide-arrow-container';
  arrowContainer.style.position = 'absolute';
  arrowContainer.style.top = `${btnRect.bottom + 20}px`;
  arrowContainer.style.left = `${btnRect.left + (btnRect.width / 2) - 20}px`;
  arrowContainer.style.width = '40px';
  arrowContainer.style.height = '40px';
  arrowContainer.style.transform = 'rotate(225deg)'; // Point upward
  arrowContainer.style.zIndex = '9999';
  
  // Add the pulsing arrow inside the container
  const arrow = document.createElement('div');
  arrow.className = 'guide-arrow';
  arrow.style.width = '100%';
  arrow.style.height = '100%';
  arrow.style.borderRight = '8px solid #6e41e2';
  arrow.style.borderBottom = '8px solid #6e41e2';
  arrow.style.animation = 'pulse 1.5s infinite';
  
  // Add arrow to container
  arrowContainer.appendChild(arrow);
  
  // Add keyframes for the animation - now only animating the scale, not rotation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0% {
        opacity: 0.4;
        transform: scale(0.8);
      }
      50% {
        opacity: 1;
        transform: scale(1.2);
      }
      100% {
        opacity: 0.4;
        transform: scale(0.8);
      }
    }
  `;
  
  document.head.appendChild(style);
  
  // Add element to DOM
  document.body.appendChild(arrowContainer);
  
  // Slightly highlight the import button
  importBtn.style.backgroundColor = '#6e41e2';
  importBtn.style.color = 'white';
  importBtn.style.boxShadow = '0 0 8px 2px rgba(110, 65, 226, 0.5)';
  
  // Create a listener that removes the guided experience when import button is clicked
  const cleanupGuide = () => {
    if (arrowContainer.parentNode) arrowContainer.parentNode.removeChild(arrowContainer);
    
    // Remove the added styles from import button
    importBtn.style.backgroundColor = '';
    importBtn.style.color = '';
    importBtn.style.boxShadow = '';
    
    // Remove this event listener
    importBtn.removeEventListener('click', cleanupGuide);
  };
  
  // Add click event to clean up when import button is clicked
  importBtn.addEventListener('click', cleanupGuide);
}

/**
 * Load history data from storage
 */
async function loadHistoryData() {
  Logger.log("Loading history data from storage...");
  try {
    const data = await browser.storage.local.get(STORAGE_KEY);
    const history = data[STORAGE_KEY] || [];
    
    if (history.length === 0) {
      Logger.log("No history items found in storage");
      // Empty state for conversation list will be handled by updateConversationList
    } else {
      Logger.log(`Loaded ${history.length} history items from storage`);
    }
    
    return history;
  } catch (error) {
    Logger.error("Error loading history data:", error);
    throw error; // Rethrow to be caught by init()
  }
}

/**
 * Update filtered history based on current filters
 */
function updateFilteredHistory() {
  Logger.log("Applying filters to history data...");
  // Get filter values
  const modelValue = elements.modelFilter.value;
  const dateFilterValue = elements.dateFilter.value;
  const searchValue = elements.searchFilter.value.toLowerCase();
  const startDateValue = elements.startDate.value;
  const endDateValue = elements.endDate.value;
  
  // Log filter values
  Logger.log(`Filters: model="${modelValue}", date="${dateFilterValue}", search="${searchValue}"`);
  if (dateFilterValue === 'custom') {
    Logger.log(`Custom date range: ${startDateValue} to ${endDateValue}`);
  }
  
  const now = dayjs();
  
  // Apply filters
  filteredHistory = allHistory.filter(item => {
    // Model filter
    if (modelValue && item.model !== modelValue) {
      return false;
    }
    
    const itemDate = parseTimestamp(item.timestamp);
    
    // Date filter
    if (dateFilterValue !== 'all') {
      if (dateFilterValue === 'today') {
        if (!itemDate.isSame(now, 'day')) {
          return false;
        }
      } else if (dateFilterValue === 'week') {
        const weekStart = now.startOf('week');
        if (itemDate.isBefore(weekStart)) {
          return false;
        }
      } else if (dateFilterValue === 'month') {
        const monthStart = now.startOf('month');
        if (itemDate.isBefore(monthStart)) {
          return false;
        }
      } else if (dateFilterValue === 'custom' && (startDateValue || endDateValue)) {
        if (startDateValue) {
          const startDate = dayjs(startDateValue).startOf('day');
          if (itemDate.isBefore(startDate)) {
            return false;
          }
        }
        
        if (endDateValue) {
          const endDate = dayjs(endDateValue).endOf('day');
          if (itemDate.isAfter(endDate)) {
            return false;
          }
        }
      }
    }
    
    // Search filter
    if (searchValue) {
      const title = (item.title || '').toLowerCase();
      const prompt = (item.prompt || '').toLowerCase();
      
      if (!title.includes(searchValue) && !prompt.includes(searchValue)) {
        return false;
      }
    }
    
    return true;
  });
  
  // Apply sorting
  sortFilteredHistory(); // This sorts `filteredHistory` in place
  Logger.log(`Filtered history contains ${filteredHistory.length} items (from ${allHistory.length} total)`);
}

/**
 * Sort filtered history based on current sort option
 */
function sortFilteredHistory() {
  const sortOption = elements.sortBy.value;
  
  switch (sortOption) {
    case 'date-desc':
      filteredHistory.sort((a, b) => parseTimestamp(b.timestamp).valueOf() - parseTimestamp(a.timestamp).valueOf());
      break;
    case 'date-asc':
      filteredHistory.sort((a, b) => parseTimestamp(a.timestamp).valueOf() - parseTimestamp(b.timestamp).valueOf());
      break;
    case 'title':
      filteredHistory.sort((a, b) => {
        const titleA = a.title || 'Untitled';
        const titleB = b.title || 'Untitled';
        return titleA.localeCompare(titleB);
      });
      break;
    case 'model':
      filteredHistory.sort((a, b) => {
        const modelA = a.model || 'Unknown';
        const modelB = b.model || 'Unknown';
        return modelA.localeCompare(modelB);
      });
      break;
  }
}

/**
 * Update conversation list display (in History Tab)
 */
function updateConversationList() {
  // Update count display
  elements.conversationCount.textContent = `(${filteredHistory.length})`;
  
  // Clear current list
  elements.conversationList.innerHTML = '';
  
  // Show empty state if no conversations match the filter OR if allHistory is empty initially
  if (filteredHistory.length === 0) {
    if (allHistory.length === 0) { // Truly no data at all
        elements.emptyState.style.display = 'flex'; // Show initial empty state
        elements.loadingState.style.display = 'none'; // Ensure loading is hidden
    } else { // Data exists, but filters yield no results
        elements.emptyState.style.display = 'none'; // Hide initial empty state
        const emptyFilterElement = document.createElement('div');
        emptyFilterElement.className = 'empty-state'; // Reuse class for styling
        emptyFilterElement.innerHTML = `
          <div class="empty-icon">🤷</div>
          <h3>No Conversations Match Filters</h3>
          <p>Try adjusting your search or filter criteria.</p>
          <button id="clearFiltersBtn" class="button">Clear Filters</button>
        `;
        elements.conversationList.appendChild(emptyFilterElement);
        
        document.getElementById('clearFiltersBtn').addEventListener('click', () => {
          resetFilters(); // This will re-trigger updates
        });
    }
    return;
  }
  
  // If we have items, ensure initial empty state is hidden
  elements.emptyState.style.display = 'none';

  // Create and append conversation items
  filteredHistory.forEach(entry => {
    const conversationItem = createConversationItem(entry);
    elements.conversationList.appendChild(conversationItem);
  });
}


/**
 * Create a single conversation item element
 */
function createConversationItem(entry) {
  const item = document.createElement('div');
  item.className = 'conversation-item';
  item.dataset.id = entry.url; // Use URL as unique identifier
  
  const title = document.createElement('div');
  title.className = 'conversation-title';
  title.textContent = entry.title || 'Untitled Conversation';
  
  const meta = document.createElement('div');
  meta.className = 'conversation-meta';
  
  const metaLeft = document.createElement('div');
  metaLeft.className = 'meta-left';
  
  const date = document.createElement('span');
  date.className = 'conversation-date';
  date.textContent = dayjsFormatDate(entry.timestamp); // Use updated parser/formatter
  
  const model = document.createElement('span');
  model.className = 'conversation-model';
  model.textContent = entry.model || 'Unknown';
  
  metaLeft.appendChild(date);
  metaLeft.appendChild(model);
  
  const metaRight = document.createElement('div');
  metaRight.className = 'meta-right';
  
  // Display account info if available
  if (entry.accountName && entry.accountName !== 'Unknown') {
    const account = document.createElement('span');
    account.className = 'conversation-account';
    account.textContent = entry.accountEmail || entry.accountName;
    metaRight.appendChild(account);
  }
  
  // Display file count if available
  if (entry.attachedFiles && entry.attachedFiles.length > 0) {
    const fileCount = document.createElement('span');
    fileCount.className = 'conversation-files';
    fileCount.textContent = `${entry.attachedFiles.length} file${entry.attachedFiles.length !== 1 ? 's' : ''}`;
    metaRight.appendChild(fileCount);
  }
  
  meta.appendChild(metaLeft);
  meta.appendChild(metaRight);
  
  // Add prompt preview if available
  if (entry.prompt) {
    const prompt = document.createElement('div');
    prompt.className = 'conversation-prompt';
    prompt.textContent = entry.prompt;
    item.appendChild(title);
    item.appendChild(meta);
    item.appendChild(prompt);
  } else {
    item.appendChild(title);
    item.appendChild(meta);
  }
  
  // Add click event to show details
  item.addEventListener('click', () => {
    showConversationDetails(entry);
  });
  
  return item;
}

/**
 * Show conversation details in modal
 */
function showConversationDetails(conversation) {
  // Set modal content
  elements.detailTitle.textContent = conversation.title || 'Untitled Conversation';
  elements.detailDate.textContent = parseTimestamp(conversation.timestamp).format('llll'); 
  elements.detailModel.textContent = conversation.model || 'Unknown';
  
  if (conversation.accountName && conversation.accountEmail) {
    elements.detailAccount.textContent = `${conversation.accountName} (${conversation.accountEmail})`;
  } else {
    elements.detailAccount.textContent = conversation.accountName || conversation.accountEmail || 'Unknown';
  }
  
  elements.detailPrompt.textContent = conversation.prompt || 'No prompt data available';
  
  if (conversation.attachedFiles && conversation.attachedFiles.length > 0) {
    elements.detailFilesGroup.style.display = 'block';
    elements.detailFiles.innerHTML = '';
    conversation.attachedFiles.forEach(file => {
      const li = document.createElement('li');
      li.textContent = file;
      elements.detailFiles.appendChild(li);
    });
  } else {
    elements.detailFilesGroup.style.display = 'none';
  }
  
  elements.openConversation.href = conversation.url;
  
  elements.deleteConversation.onclick = () => {
    showConfirmation(
      'Delete Conversation', 
      `Are you sure you want to delete "${conversation.title || 'Untitled Conversation'}"? This cannot be undone.`,
      () => deleteConversation(conversation.url)
    );
  };
  
  elements.conversationModal.classList.add('active');
}

/**
 * Show confirmation modal
 */
function showConfirmation(title, message, callback) {
  elements.confirmationTitle.textContent = title;
  elements.confirmationMessage.textContent = message;
  confirmationCallback = callback;
  elements.confirmationModal.classList.add('active');
}

/**
 * Delete a conversation from history
 */
async function deleteConversation(url) {
  try {
    allHistory = allHistory.filter(item => item.url !== url);
    await browser.storage.local.set({ [STORAGE_KEY]: allHistory });
    
    browser.runtime.sendMessage({ action: 'updateHistoryCount', count: allHistory.length });
    
    closeModals();
    
    // Refresh UI elements based on the new allHistory
    updateFilteredHistory(); // This will re-filter and re-sort
    updateStats(allHistory); // Update stats based on potentially reduced allHistory
    updateConversationList(); // Update the list in History tab
    createVisualization(currentChartVisualization); // Re-create chart in Visualization tab
    
    if (allHistory.length === 0) {
        // updateConversationList will handle showing the main empty state
    }
    
    Toast.success('Conversation deleted successfully');
  } catch (error) {
    console.error('Error deleting conversation:', error);
    Toast.error('Failed to delete conversation');
  }
}

/**
 * Close all modals
 */
function closeModals() {
  elements.conversationModal.classList.remove('active');
  elements.confirmationModal.classList.remove('active');
}

/**
 * Update statistics display (in Visualization Tab)
 */
function updateStats(historyForStats) { // Renamed parameter for clarity
  elements.totalConversations.textContent = historyForStats.length;
  
  if (historyForStats.length === 0) {
    elements.mostUsedModel.textContent = '-';
    elements.mostUsedModelCount.textContent = '';
    elements.avgTitleLength.textContent = '-';
    elements.firstConversationTime.textContent = '-';
    elements.lastConversationTime.textContent = '-';
    elements.totalFilesUploaded.textContent = '0';
    return;
  }
  
  const modelCounts = historyForStats.reduce((acc, entry) => {
    const model = entry.model || 'Unknown';
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});
  
  const mostUsed = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0];
  elements.mostUsedModel.textContent = mostUsed ? mostUsed[0] : '-';
  elements.mostUsedModelCount.textContent = mostUsed ? `(${mostUsed[1]} chats)` : '';
  
  const totalTitleLength = historyForStats.reduce((acc, entry) => acc + (entry.title ? entry.title.length : 0), 0);
  const avgLength = historyForStats.length > 0 ? totalTitleLength / historyForStats.length : 0;
  elements.avgTitleLength.textContent = Math.round(avgLength);
  
  const sortedByDate = [...historyForStats].sort((a, b) => 
    parseTimestamp(a.timestamp).valueOf() - parseTimestamp(b.timestamp).valueOf()
  );
  
  if (sortedByDate.length > 0) {
      const firstDate = parseTimestamp(sortedByDate[0].timestamp);
      const lastDate = parseTimestamp(sortedByDate[sortedByDate.length - 1].timestamp);
      elements.firstConversationTime.textContent = dayjsFormatDate(firstDate, true);
      elements.lastConversationTime.textContent = lastDate.fromNow();
  } else {
      elements.firstConversationTime.textContent = '-';
      elements.lastConversationTime.textContent = '-';
  }

  const totalFiles = historyForStats.reduce((acc, entry) => acc + (entry.attachedFiles ? entry.attachedFiles.length : 0), 0);
  elements.totalFilesUploaded.textContent = totalFiles;
}

/**
 * Populate model filter dropdown with unique models from history
 */
function populateModelFilter() {
  const models = new Set();
  allHistory.forEach(item => {
    models.add(item.model || 'Unknown');
  });
  
  // Regular history filter
  const firstOption = elements.modelFilter.firstElementChild;
  elements.modelFilter.innerHTML = '';
  elements.modelFilter.appendChild(firstOption); // Keep "All Models"
  
  // Activity model filter
  const firstActivityOption = elements.activityModelFilter.firstElementChild;
  elements.activityModelFilter.innerHTML = '';
  elements.activityModelFilter.appendChild(firstActivityOption); // Keep "All Models"
  
  Array.from(models).sort().forEach(model => {
    // For history filter
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    elements.modelFilter.appendChild(option);
    
    // For activity chart filter
    const activityOption = document.createElement('option');
    activityOption.value = model;
    activityOption.textContent = model;
    elements.activityModelFilter.appendChild(activityOption);
  });
}

/**
 * Set up visualization options initial state
 */
function setupVisualizationOptions() {
  // Set initial state of activity visualization options
  // Hide model selector initially (shown when 'separate' mode is selected)
  elements.activityModelSelect.style.visibility = 'hidden';
  elements.activityModelSelect.style.opacity = '0';
  
  // Hide the options panel by default since model distribution tab is active initially
  elements.vizOptions.style.visibility = 'hidden';
  elements.vizOptions.style.opacity = '0';
  
  // Set combined mode as default
  const combinedRadio = document.querySelector('input[name="activityDisplayMode"][value="combined"]');
  if (combinedRadio) {
    combinedRadio.checked = true;
  }
}

/**
 * Set up date filter events and initialize date inputs
 */
function setupDateFilters() {
  elements.dateFilter.addEventListener('change', () => {
    elements.customDateRange.style.display = 
      elements.dateFilter.value === 'custom' ? 'grid' : 'none';
    // When date filter type changes, re-filter and update list
    handleFilterChange(); 
  });
  
  const today = dayjs();
  const thirtyDaysAgo = today.subtract(30, 'days');
  elements.startDate.value = thirtyDaysAgo.format('YYYY-MM-DD');
  elements.endDate.value = today.format('YYYY-MM-DD');

  // Add event listeners to custom date inputs to re-filter on change
  elements.startDate.addEventListener('change', () => {
    if (elements.dateFilter.value === 'custom') {
        handleFilterChange();
    }
  });
  elements.endDate.addEventListener('change', () => {
    if (elements.dateFilter.value === 'custom') {
        handleFilterChange();
    }
  });
}

/**
 * Reset all filters to default values
 */
function resetFilters() {
  elements.modelFilter.value = '';
  elements.dateFilter.value = 'all';
  elements.searchFilter.value = ''; // Clear search input
  elements.customDateRange.style.display = 'none'; // Hide custom date range
  elements.sortBy.value = 'date-desc'; // Reset sort
  
  // Re-apply filters and update UI
  handleFilterChange();
  Toast.info('Filters have been reset.');
}

/**
 * Create visualization based on the selected type (in Visualization Tab)
 */
function createVisualization(type) {
  if (chart) {
    chart.destroy();
  }
  
  // Toggle visualization options based on selected type
  if (type === 'activityOverTime') {
    // Show activity options at bottom for Activity Over Time chart
    elements.vizOptions.style.visibility = 'visible';
    elements.vizOptions.style.opacity = '1';
  } else {
    // Hide options for Model Distribution chart
    elements.vizOptions.style.visibility = 'hidden';
    elements.vizOptions.style.opacity = '0';
  }
  
  // Charts are based on allHistory, not filteredHistory, as per current logic
  if (allHistory.length === 0) {
    // Optionally, display a message in the chart area if no data
    const ctx = elements.vizChart.getContext('2d');
    ctx.clearRect(0, 0, elements.vizChart.width, elements.vizChart.height); // Clear canvas
    ctx.font = "16px Arial";
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-light').trim();
    ctx.textAlign = "center";
    ctx.fillText("No data available for visualization.", elements.vizChart.width / 2, elements.vizChart.height / 2);
    return;
  }
  
  switch (type) {
    case 'modelDistribution':
      createModelDistributionChart();
      break;
    case 'activityOverTime':
      createActivityOverTimeChart();
      break;
  }
}

/**
 * Create model distribution chart
 */
function createModelDistributionChart() {
  const modelCounts = allHistory.reduce((acc, entry) => {
    const model = entry.model || 'Unknown';
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});
  
  const labels = Object.keys(modelCounts);
  const data = Object.values(modelCounts);
  
  const ctx = elements.vizChart.getContext('2d');
  chart = new Chart(ctx, {
    type: 'bar', // Changed to bar for better readability with multiple models
    data: {
      labels: labels,
      datasets: [{
        label: 'Model Usage',
        data: data,
        backgroundColor: CHART_COLORS,
        borderColor: CHART_COLORS.map(color => color.replace('0.8', '1')), // Darker border
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y', // Horizontal bar chart if many models
      scales: {
        x: {
            beginAtZero: true,
            ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-light').trim() }
        },
        y: {
            ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-light').trim() }
        }
      },
      plugins: {
        legend: {
          display: false, // Already have a label for dataset
        },
        tooltip: {
            callbacks: {
                label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed.x !== null) {
                        label += context.parsed.x + ' conversations';
                    }
                    return label;
                }
            }
        }
      }
    }
  });
}

/**
 * Create activity over time chart
 */
function createActivityOverTimeChart() {
  // Get activity display mode
  const displayMode = document.querySelector('input[name="activityDisplayMode"]:checked').value;
  const selectedModel = document.getElementById('activityModelFilter').value;
  
  // Get all unique models from history
  const uniqueModels = [...new Set(allHistory.map(entry => entry.model || 'Unknown'))];
  
  // Group dates by all conversations
  const dateGroups = {};
  
  // For model-specific data: model -> date -> count
  const modelDateGroups = {};
  uniqueModels.forEach(model => {
    modelDateGroups[model] = {};
  });
  
  // Process history entries
  allHistory.forEach(entry => {
    const dateStr = parseTimestamp(entry.timestamp).format('YYYY-MM-DD');
    const model = entry.model || 'Unknown';
    
    // Update overall count
    dateGroups[dateStr] = (dateGroups[dateStr] || 0) + 1;
    
    // Update model-specific count
    if (!modelDateGroups[model][dateStr]) {
      modelDateGroups[model][dateStr] = 0;
    }
    modelDateGroups[model][dateStr]++;
  });
  
  const sortedDates = Object.keys(dateGroups).sort((a,b) => dayjs(a).valueOf() - dayjs(b).valueOf());
  
  // Fill missing dates for a continuous timeline
  const filledDateGroups = {};
  if (sortedDates.length > 0) {
    let currentDate = dayjs(sortedDates[0]);
    const lastDate = dayjs(sortedDates[sortedDates.length - 1]);
    
    while(currentDate.isBefore(lastDate) || currentDate.isSame(lastDate, 'day')) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      filledDateGroups[dateStr] = dateGroups[dateStr] || 0;
      
      // Also fill model-specific data
      uniqueModels.forEach(model => {
        if (!modelDateGroups[model][dateStr]) {
          modelDateGroups[model][dateStr] = 0;
        }
      });
      
      currentDate = currentDate.add(1, 'day');
    }
  }

  const finalSortedDates = Object.keys(filledDateGroups).sort((a,b) => dayjs(a).valueOf() - dayjs(b).valueOf());
  const displayDates = finalSortedDates.map(date => dayjs(date).format('MMM D, YY')); // More readable date format
  
  // Create datasets based on display mode
  let datasets = [];
  
  if (displayMode === 'combined' || !finalSortedDates.length) {
    // Combined mode - just show total conversations
    const counts = finalSortedDates.map(date => filledDateGroups[date]);
    datasets = [{
      label: 'All Conversations',
      data: counts,
      backgroundColor: 'rgba(110, 65, 226, 0.2)',
      borderColor: 'rgba(110, 65, 226, 1)',
      borderWidth: 2,
      tension: 0.2, // Smoother line
      fill: true,
      pointRadius: 3,
      pointBackgroundColor: 'white',
      pointBorderColor: 'rgba(110, 65, 226, 1)'
    }];
  } else {
    // Separate mode - show by model
    if (selectedModel === 'all') {
      // Show all models
      uniqueModels.forEach((model, index) => {
        const colorIndex = index % CHART_COLORS.length;
        const backgroundColor = CHART_COLORS[colorIndex].replace('0.8', '0.2');
        const borderColor = CHART_COLORS[colorIndex].replace('0.8', '1');
        
        const modelCounts = finalSortedDates.map(date => modelDateGroups[model][date] || 0);
        
        datasets.push({
          label: model,
          data: modelCounts,
          backgroundColor: backgroundColor,
          borderColor: borderColor,
          borderWidth: 2,
          tension: 0.2,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: 'white',
          pointBorderColor: borderColor
        });
      });
    } else {
      // Show specific model
      const colorIndex = uniqueModels.indexOf(selectedModel) % CHART_COLORS.length;
      const backgroundColor = CHART_COLORS[colorIndex].replace('0.8', '0.2');
      const borderColor = CHART_COLORS[colorIndex].replace('0.8', '1');
      
      const modelCounts = finalSortedDates.map(date => modelDateGroups[selectedModel][date] || 0);
      
      datasets.push({
        label: selectedModel,
        data: modelCounts,
        backgroundColor: backgroundColor,
        borderColor: borderColor,
        borderWidth: 2,
        tension: 0.2,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: 'white',
        pointBorderColor: borderColor
      });
    }
  }
  
  const ctx = elements.vizChart.getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: displayDates,
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          stacked: displayMode === 'combined',
          ticks: { 
            precision: 0,
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-light').trim()
          }
        },
        x: {
          ticks: { 
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-light').trim(),
            maxRotation: 45, // Rotate labels if too many
            minRotation: 0
          }
        }
      },
      plugins: {
        legend: {
          display: displayMode === 'separate',
          position: 'top',
          labels: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
            font: {
              size: 11
            }
          }
        },
        tooltip: {
            callbacks: {
                title: function(tooltipItems) {
                    return tooltipItems[0].label;
                },
                label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed.y !== null) {
                        label += context.parsed.y;
                    }
                    return label;
                }
            }
        }
      }
    }
  });
}


/**
 * Exports history data to a JSON file
 */
function exportHistoryData() {
  try {
    if (allHistory.length === 0) {
      Toast.warning('No history data to export');
      return;
    }
    
    // Determine if filters are active by comparing allHistory and filteredHistory lengths
    // and also checking if any filter inputs have values other than default.
    const modelFilterActive = elements.modelFilter.value !== '';
    const dateFilterActive = elements.dateFilter.value !== 'all';
    const searchFilterActive = elements.searchFilter.value !== '';
    const filtersActive = modelFilterActive || dateFilterActive || searchFilterActive;

    const dataToExport = filtersActive ? filteredHistory : allHistory;
    const exportTypeMessage = filtersActive ? 'filtered history' : 'all history';
    
    if (dataToExport.length === 0 && filtersActive) {
        Toast.warning('Current filters result in no data to export. Try adjusting filters or exporting all data.');
        return;
    }
    
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `gemini-history-export-${dayjs().format('YYYY-MM-DD')}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
    
    Toast.success(`Successfully exported ${exportTypeMessage} (${dataToExport.length} items).`);
  } catch (error) {
    console.error('Error exporting history:', error);
    Toast.error('Failed to export history data');
  }
}

/**
 * Handle import file
 */
async function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const text = await readFile(file); // readFile should be defined in utils.js or globally
    const importedData = JSON.parse(text);
    
    if (!Array.isArray(importedData)) {
      throw new Error('Invalid data format: Expected an array of conversations.');
    }
    // Basic validation for items in array (optional, but good practice)
    if (importedData.length > 0 && (!importedData[0].url || !importedData[0].timestamp)) {
        throw new Error('Invalid item format: Conversations must have at least a URL and timestamp.');
    }

    const existingUrls = new Set(allHistory.map(item => item.url));
    const newItems = importedData.filter(item => item.url && !existingUrls.has(item.url)); // Ensure item.url exists
    
    if (newItems.length === 0) {
      Toast.warning('No new conversations found in import file, or data format is incorrect.');
      return;
    }
    
    const mergedData = [...allHistory, ...newItems].sort((a, b) => 
      parseTimestamp(b.timestamp).valueOf() - parseTimestamp(a.timestamp).valueOf()
    );
    
    await browser.storage.local.set({ [STORAGE_KEY]: mergedData });
    browser.runtime.sendMessage({ action: 'updateHistoryCount', count: mergedData.length });
    
    allHistory = mergedData;
    
    // Full UI refresh after import
    updateFilteredHistory(); // Re-filter based on current filter settings
    updateStats(allHistory); // Update stats with new merged data
    populateModelFilter(); // Repopulate model filter with potentially new models
    updateConversationList(); // Update history list
    createVisualization(currentChartVisualization); // Recreate current chart
    
    elements.emptyState.style.display = allHistory.length > 0 ? 'none' : 'flex';

    Toast.success(`Import complete: Added ${newItems.length} new conversation${newItems.length !== 1 ? 's' : ''}.`);
  } catch (error) {
    console.error('Import error:', error);
    Toast.error(`Import error: ${error.message}`);
  }
  
  event.target.value = ''; // Reset file input
}

/**
 * Generic handler for any filter change.
 */
function handleFilterChange() {
    updateFilteredHistory(); // This re-calculates `filteredHistory` and sorts it
    updateConversationList(); // This updates the displayed list in the History tab
    // Note: Stats and Visualizations are currently based on `allHistory`.
    // If they should react to filters, `updateStats(filteredHistory)` and
    // `createVisualization(currentChartVisualization, filteredHistory)` would be needed here.
    // For now, they remain based on `allHistory`.
}


/**
 * Set up all event listeners
 */
function setupEventListeners() {
  // Main Page Tab switching
  elements.pageTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Deactivate all tabs and contents
      elements.pageTabs.forEach(t => t.classList.remove('active'));
      elements.pageTabContents.forEach(c => c.classList.remove('active'));
      
      // Activate clicked tab and its content
      tab.classList.add('active');
      const targetContentId = tab.dataset.tabTarget;
      document.querySelector(targetContentId).classList.add('active');

      // If switching to visualization tab and chart needs refresh or initial draw
      if (targetContentId === '#visualizationContent') {
        // Ensure chart is created/updated if it hasn't been or if data changed
        // The chart is already created during init. If it needs to be responsive to window resize,
        // that would be a separate event listener on `window.resize`.
        // For now, just ensure it's the correct one.
        createVisualization(currentChartVisualization);
      }
    });
  });


  // Close modal buttons
  elements.closeModal.addEventListener('click', closeModals);
  elements.closeConfirmation.addEventListener('click', closeModals);
  elements.cancelAction.addEventListener('click', closeModals);
  
  // Confirmation action button
  elements.confirmAction.addEventListener('click', () => {
    if (typeof confirmationCallback === 'function') {
      confirmationCallback();
    }
    confirmationCallback = null; // Reset after use
    closeModals(); // Close confirmation modal after action
  });
  
  // Filter change events (call generic handler)
  elements.modelFilter.addEventListener('change', handleFilterChange);
  // elements.dateFilter change is handled in setupDateFilters to also toggle custom range
  // elements.startDate and elements.endDate changes are handled in setupDateFilters

  elements.searchFilter.addEventListener('input', handleFilterChange); // Use 'input' for live search
  
  // Add focus and blur effects for search input (visual only)
  elements.searchFilter.addEventListener('focus', () => elements.searchFilter.parentElement.classList.add('focused'));
  elements.searchFilter.addEventListener('blur', () => elements.searchFilter.parentElement.classList.remove('focused'));
  
  // Sort change event
  elements.sortBy.addEventListener('change', () => {
    sortFilteredHistory(); // Sorts `filteredHistory` in place
    updateConversationList(); // Updates the display
  });
  
  // Visualization sub-tab events (for charts)
  elements.vizTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.vizTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentChartVisualization = tab.dataset.viz;
      createVisualization(currentChartVisualization); // Re-create chart for the new selection
    });
  });
  
  // Activity over time visualization options
  document.querySelectorAll('input[name="activityDisplayMode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      // Show/hide model selector based on selected display mode
      if (radio.value === 'separate') {
        elements.activityModelSelect.style.visibility = 'visible';
        elements.activityModelSelect.style.opacity = '1';
      } else {
        elements.activityModelSelect.style.visibility = 'hidden';
        elements.activityModelSelect.style.opacity = '0';
      }
      
      // Re-create chart with new display mode
      if (currentChartVisualization === 'activityOverTime') {
        // Destroy chart first to avoid Canvas already in use error
        if (chart) {
          chart.destroy();
        }
        createActivityOverTimeChart();
      }
    });
  });
  
  // Activity model filter change event
  elements.activityModelFilter.addEventListener('change', () => {
    if (currentChartVisualization === 'activityOverTime') {
      // Destroy chart first to avoid Canvas already in use error
      if (chart) {
        chart.destroy();
      }
      createActivityOverTimeChart();
    }
  });
  
  // Header Buttons
  elements.exportHistoryBtn.addEventListener('click', exportHistoryData);
  
  elements.importHistoryBtn.addEventListener('click', () => {
    // Clear URL parameters if they exist from guided import
    if (window.location.search.includes('action=import')) {
      const currentPath = window.location.pathname;
      window.history.replaceState({}, document.title, currentPath);
      // If there was a guided experience arrow, it might need manual removal here if not already handled
      // by its own cleanup logic.
      const guideArrow = document.querySelector('.guide-arrow-container');
      if (guideArrow) guideArrow.remove();
      const guideStyle = document.querySelector('style[textContent*="@keyframes pulse"]'); // More specific selector
      if (guideStyle) guideStyle.remove();
    }
    elements.importFileInput.click();
  });
  elements.importFileInput.addEventListener('change', handleImportFile);
  
  elements.clearHistoryBtn.addEventListener('click', () => {
    showConfirmation(
      'Clear All History',
      'Are you sure you want to delete all conversation history? This action cannot be undone.',
      clearAllHistory // Pass the function reference
    );
  });
  
  // Start chat button (in empty state for history tab)
  const startChatBtn = document.getElementById('startChatBtn');
  if (startChatBtn) {
    startChatBtn.addEventListener('click', () => {
      browser.tabs.create({ url: 'https://gemini.google.com/app' });
    });
  }

  // Theme toggle button
  elements.themeToggle.addEventListener('click', () => {
    currentTheme = window.toggleTheme(currentTheme, elements.themeToggle.querySelector('svg'));
    // Re-render charts if theme changes, as colors might need to update
    if (elements.visualizationContent.classList.contains('active') && chart) {
        createVisualization(currentChartVisualization);
    }
  });
}

/**
 * Clear all history data
 */
async function clearAllHistory() {
  try {
    await browser.storage.local.set({ [STORAGE_KEY]: [] });
    browser.runtime.sendMessage({ action: 'updateHistoryCount', count: 0 });
    
    allHistory = [];
    filteredHistory = []; // Also clear filtered history
    
    // Update UI comprehensively
    updateStats(allHistory); // Stats will show zeros
    updateConversationList(); // Will show the main empty state
    populateModelFilter(); // Model filter will be empty (except "All Models")
    createVisualization(currentChartVisualization); // Chart will show "No data" message
    
    // Ensure the main empty state for the history tab is correctly displayed
    // elements.emptyState.style.display = 'flex'; // This is handled by updateConversationList

    Toast.success('All history has been cleared');
  } catch (error) {
    console.error('Error clearing history:', error);
    Toast.error('Failed to clear history');
  }
  // Confirmation modal is closed by the confirmAction handler
}

/**
 * Show error message (typically during init if loading fails)
 */
function showError(message) {
  // Ensure loading state is visible to replace its content
  elements.loadingState.style.display = 'flex'; 
  elements.loadingState.innerHTML = ''; // Clear spinner and old message

  const errorIcon = document.createElement('div');
  errorIcon.className = 'empty-icon'; // Reuse class for styling
  errorIcon.textContent = '⚠️'; 
  elements.loadingState.appendChild(errorIcon);
  
  const errorMsg = document.createElement('h3'); // Use h3 for better semantics
  errorMsg.textContent = `Error: ${message}`;
  elements.loadingState.appendChild(errorMsg);
  
  const errorDetail = document.createElement('p');
  errorDetail.textContent = 'Please try reloading the page. If the problem persists, check browser console for details or try re-installing the extension.';
  elements.loadingState.appendChild(errorDetail);

  const reloadBtn = document.createElement('button');
  reloadBtn.id = 'reloadBtn';
  reloadBtn.className = 'button primary-button';
  reloadBtn.textContent = 'Reload Page';
  reloadBtn.style.marginTop = '15px';
  elements.loadingState.appendChild(reloadBtn);
  
  reloadBtn.addEventListener('click', () => {
    window.location.reload();
  });
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);