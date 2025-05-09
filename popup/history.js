// history_revamped.js
/**
 * Gemini History Manager - Full History View (Revamped)
 * Handles data visualization, filtering, and conversation management
 */

// DOM Elements
const elements = {
  // Stats elements
  totalConversations: document.getElementById('totalConversations'),
  mostUsedModel: document.getElementById('mostUsedModel'),
  mostUsedModelCount: document.getElementById('mostUsedModelCount'),
  avgTitleLength: document.getElementById('avgTitleLength'),
  firstConversationTime: document.getElementById('firstConversationTime'),
  lastConversationTime: document.getElementById('lastConversationTime'),
  totalFilesUploaded: document.getElementById('totalFilesUploaded'),
  
  // Filter elements
  modelFilter: document.getElementById('modelFilter'),
  dateFilter: document.getElementById('dateFilter'),
  customDateRange: document.getElementById('customDateRange'),
  startDate: document.getElementById('startDate'),
  endDate: document.getElementById('endDate'),
  searchFilter: document.getElementById('searchFilter'),
  
  // Visualization elements
  vizTabs: document.querySelectorAll('.viz-tab'),
  vizChart: document.getElementById('vizChart'), // Canvas element
  
  // Conversation list elements
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
  
  // Button elements
  exportHistoryBtn: document.getElementById('exportHistory'),
  importHistoryBtn: document.getElementById('importHistory'),
  clearHistoryBtn: document.getElementById('clearHistory'),
  importFileInput: document.getElementById('importFileInput'),
  startChatBtn: document.getElementById('startChatBtn') // Added for clarity
};

// Constants
const STORAGE_KEY = 'geminiChatHistory';
const CHART_COLORS = [ // Use CSS variables for consistency if possible, or define here
  getComputedStyle(document.documentElement).getPropertyValue('--chart-color-1').trim() || 'rgba(124, 58, 237, 0.8)',
  getComputedStyle(document.documentElement).getPropertyValue('--chart-color-2').trim() || 'rgba(79, 70, 229, 0.8)',
  getComputedStyle(document.documentElement).getPropertyValue('--chart-color-3').trim() || 'rgba(14, 165, 233, 0.8)',
  getComputedStyle(document.documentElement).getPropertyValue('--chart-color-4').trim() || 'rgba(245, 158, 11, 0.8)',
  getComputedStyle(document.documentElement).getPropertyValue('--chart-color-5').trim() || 'rgba(236, 72, 153, 0.8)',
  getComputedStyle(document.documentElement).getPropertyValue('--chart-color-6').trim() || 'rgba(16, 185, 129, 0.8)'
];

// State management
let allHistory = []; // All history items
let filteredHistory = []; // Filtered history items
let currentVisualization = 'modelDistribution';
let chart = null; // Chart.js instance
let confirmationCallback = null; // For handling confirmation modal actions

/**
 * Initialize the application
 */
async function init() {
  try {
    elements.loadingState.style.display = 'flex'; // Show loading state
    elements.emptyState.style.display = 'none';
    elements.conversationList.innerHTML = '';


    allHistory = await loadHistoryData();
    updateFilteredHistory(); // Initial filter (all data)
    
    populateModelFilter();
    setupDateFilters();
    
    updateStats(allHistory);
    createVisualization(currentVisualization);
    updateConversationList();
    
    elements.loadingState.style.display = 'none';
    if (allHistory.length === 0 && elements.emptyState) { // Check if emptyState exists
        elements.emptyState.style.display = 'flex';
    }
    
    setupEventListeners();
    
  } catch (error) {
    console.error('Error initializing application:', error);
    showError('Failed to load history data. Please try reloading.');
  }
}

/**
 * Load history data from storage
 */
async function loadHistoryData() {
  try {
    // Simulate a small delay for loading perception if needed
    // await new Promise(resolve => setTimeout(resolve, 500)); 
    const data = await browser.storage.local.get(STORAGE_KEY);
    const history = data[STORAGE_KEY] || [];
    
    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort by newest first initially
  } catch (error) {
    console.error('Error loading history data:', error);
    throw error; // Rethrow to be caught by init
  }
}

/**
 * Update filtered history based on current filters
 */
function updateFilteredHistory() {
  const modelValue = elements.modelFilter.value;
  const dateFilterValue = elements.dateFilter.value;
  const searchValue = elements.searchFilter.value.toLowerCase().trim();
  const startDateValue = elements.startDate.value;
  const endDateValue = elements.endDate.value;
  
  filteredHistory = allHistory.filter(item => {
    if (modelValue && item.model !== modelValue) return false;
    
    if (dateFilterValue !== 'all') {
      const itemDate = new Date(item.timestamp);
      const now = new Date();
      
      if (dateFilterValue === 'today') {
        if (!isSameDay(itemDate, now)) return false;
      } else if (dateFilterValue === 'week') {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Adjust for week start (Mon)
        weekStart.setHours(0, 0, 0, 0);
        if (itemDate < weekStart) return false;
      } else if (dateFilterValue === 'month') {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        if (itemDate < monthStart) return false;
      } else if (dateFilterValue === 'custom' && (startDateValue || endDateValue)) {
        if (startDateValue) {
          const startDate = new Date(startDateValue);
          startDate.setHours(0, 0, 0, 0);
          if (itemDate < startDate) return false;
        }
        if (endDateValue) {
          const endDateObj = new Date(endDateValue);
          endDateObj.setHours(23, 59, 59, 999);
          if (itemDate > endDateObj) return false;
        }
      }
    }
    
    if (searchValue) {
      const title = (item.title || '').toLowerCase();
      const prompt = (item.prompt || '').toLowerCase();
      // Optionally search other fields like model or account
      // const model = (item.model || '').toLowerCase(); 
      if (!title.includes(searchValue) && !prompt.includes(searchValue)) {
        return false;
      }
    }
    return true;
  });
  
  sortFilteredHistory(); // Apply current sort order
}

/**
 * Sort filtered history based on current sort option
 */
function sortFilteredHistory() {
  const sortOption = elements.sortBy.value;
  
  switch (sortOption) {
    case 'date-desc':
      filteredHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      break;
    case 'date-asc':
      filteredHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      break;
    case 'title':
      filteredHistory.sort((a, b) => (a.title || 'Untitled').localeCompare(b.title || 'Untitled'));
      break;
    case 'model':
      filteredHistory.sort((a, b) => (a.model || 'Unknown').localeCompare(b.model || 'Unknown'));
      break;
  }
}

/**
 * Update conversation list display
 */
function updateConversationList() {
  elements.conversationCount.textContent = `(${filteredHistory.length})`;
  elements.conversationList.innerHTML = ''; // Clear current list
  
  if (elements.emptyState) elements.emptyState.style.display = 'none'; // Hide general empty state first

  if (filteredHistory.length === 0) {
    // If allHistory is also empty, the main emptyState (handled in init) will show.
    // This is for when filters result in no items, but history exists.
    if (allHistory.length > 0) {
        const emptyFilterElement = document.createElement('div');
        emptyFilterElement.className = 'empty-state'; // Use existing class for styling
        emptyFilterElement.innerHTML = `
            <div class="empty-icon">🧐</div>
            <h3>No Conversations Match Filters</h3>
            <p>Try adjusting your search terms or filter criteria.</p>
            <button id="clearFiltersBtn" class="button button-secondary">Clear Filters</button>
        `;
        elements.conversationList.appendChild(emptyFilterElement);
        
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) { // Ensure button exists before adding listener
            clearFiltersBtn.addEventListener('click', resetFilters);
        }
    } else if (elements.emptyState) { // If no history at all
        elements.emptyState.style.display = 'flex';
    }
    return;
  }
  
  const fragment = document.createDocumentFragment();
  filteredHistory.forEach(entry => {
    const conversationItem = createConversationItem(entry);
    fragment.appendChild(conversationItem);
  });
  elements.conversationList.appendChild(fragment);
}

/**
 * Create a single conversation item element
 */
function createConversationItem(entry) {
  const item = document.createElement('div');
  item.className = 'conversation-item';
  item.dataset.id = entry.url; // Use URL as unique identifier
  
  // Title
  const titleDiv = document.createElement('div');
  titleDiv.className = 'conversation-title';
  titleDiv.textContent = entry.title || 'Untitled Conversation';
  
  // Meta container
  const metaDiv = document.createElement('div');
  metaDiv.className = 'conversation-meta';
  
  // Meta Left (Date, Model)
  const metaLeft = document.createElement('div');
  metaLeft.className = 'meta-left';
  
  const dateSpan = document.createElement('span');
  dateSpan.className = 'conversation-date';
  // dateSpan.innerHTML = `<i class="icon-calendar"></i> ${formatDate(new Date(entry.timestamp))}`; // Example icon
  dateSpan.textContent = formatDate(new Date(entry.timestamp));


  const modelSpan = document.createElement('span');
  modelSpan.className = 'conversation-model';
  // modelSpan.innerHTML = `<i class="icon-model"></i> ${entry.model || 'Unknown'}`; // Example icon
  modelSpan.textContent = entry.model || 'Unknown';
  
  metaLeft.appendChild(dateSpan);
  metaLeft.appendChild(modelSpan);
  
  // Meta Right (Account, Files)
  const metaRight = document.createElement('div');
  metaRight.className = 'meta-right';
  
  if (entry.accountName && entry.accountName !== 'Unknown') {
    const accountSpan = document.createElement('span');
    accountSpan.className = 'conversation-account';
    // accountSpan.innerHTML = `<i class="icon-account"></i> ${entry.accountEmail || entry.accountName}`; // Example icon
    accountSpan.textContent = entry.accountEmail || entry.accountName;
    metaRight.appendChild(accountSpan);
  }
  
  if (entry.attachedFiles && entry.attachedFiles.length > 0) {
    const fileCountSpan = document.createElement('span');
    fileCountSpan.className = 'conversation-files';
    // fileCountSpan.innerHTML = `<i class="icon-files"></i> ${entry.attachedFiles.length} file${entry.attachedFiles.length !== 1 ? 's' : ''}`; // Example icon
    fileCountSpan.textContent = `${entry.attachedFiles.length} file${entry.attachedFiles.length !== 1 ? 's' : ''}`;
    metaRight.appendChild(fileCountSpan);
  }
  
  metaDiv.appendChild(metaLeft);
  if (metaRight.hasChildNodes()) {
      metaDiv.appendChild(metaRight);
  }

  item.appendChild(titleDiv);
  item.appendChild(metaDiv);
  
  // Prompt Preview
  if (entry.prompt) {
    const promptDiv = document.createElement('div');
    promptDiv.className = 'conversation-prompt';
    promptDiv.textContent = entry.prompt;
    item.appendChild(promptDiv);
  }
  
  item.addEventListener('click', () => showConversationDetails(entry));
  return item;
}

/**
 * Show conversation details in modal
 */
function showConversationDetails(conversation) {
  elements.detailTitle.textContent = conversation.title || 'Untitled Conversation';
  elements.detailDate.textContent = new Date(conversation.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  elements.detailModel.textContent = conversation.model || 'Unknown';
  
  if (conversation.accountName && conversation.accountEmail) {
    elements.detailAccount.textContent = `${conversation.accountName} (${conversation.accountEmail})`;
  } else {
    elements.detailAccount.textContent = conversation.accountName || conversation.accountEmail || 'N/A';
  }
  
  elements.detailPrompt.textContent = conversation.prompt || 'No prompt data available.';
  
  if (conversation.attachedFiles && conversation.attachedFiles.length > 0) {
    elements.detailFilesGroup.style.display = 'block';
    elements.detailFiles.innerHTML = '';
    conversation.attachedFiles.forEach(file => {
      const li = document.createElement('li');
      li.textContent = file; // Potentially add file icons or links if applicable
      elements.detailFiles.appendChild(li);
    });
  } else {
    elements.detailFilesGroup.style.display = 'none';
  }
  
  elements.openConversation.onclick = () => {
    browser.tabs.create({ url: conversation.url });
    closeModals();
  };
  
  elements.deleteConversation.onclick = () => {
    // No need to close conversationModal here, showConfirmation will overlay
    showConfirmation(
      'Delete Conversation', 
      `Are you sure you want to delete "${conversation.title || 'Untitled Conversation'}"? This action cannot be undone.`,
      async () => {
        await deleteConversation(conversation.url);
        // Deletion handles closing modals and UI updates
      }
    );
  };
  
  elements.conversationModal.classList.add('active');
  elements.conversationModal.querySelector('.modal-body').scrollTop = 0; // Scroll to top
}

/**
 * Show confirmation modal
 */
function showConfirmation(title, message, callback) {
  elements.confirmationTitle.textContent = title;
  elements.confirmationMessage.textContent = message;
  confirmationCallback = callback; // Store the callback
  elements.confirmationModal.classList.add('active');
}

/**
 * Delete a conversation from history
 */
async function deleteConversation(url) {
  try {
    allHistory = allHistory.filter(item => item.url !== url);
    await browser.storage.local.set({ [STORAGE_KEY]: allHistory });
    
    if (browser.runtime && browser.runtime.sendMessage) {
        browser.runtime.sendMessage({ action: 'updateHistoryCount', count: allHistory.length });
    }
    
    closeModals(); // Close all modals first
    
    updateFilteredHistory(); // This will also sort
    updateStats(allHistory);
    updateConversationList(); // This will handle empty states
    createVisualization(currentVisualization); // Redraw chart with updated data
    
    // If allHistory becomes empty, the main emptyState should show
    if (allHistory.length === 0 && elements.emptyState) {
        elements.emptyState.style.display = 'flex';
        elements.conversationList.innerHTML = ''; // Ensure list is cleared
    }

  } catch (error) {
    console.error('Error deleting conversation:', error);
    // Consider showing a user-friendly notification here
    alert('Failed to delete conversation. Please try again.');
  }
}

/**
 * Close all modals
 */
function closeModals() {
  if (elements.conversationModal) elements.conversationModal.classList.remove('active');
  if (elements.confirmationModal) elements.confirmationModal.classList.remove('active');
  confirmationCallback = null; // Clear callback when modals are closed
}

/**
 * Update statistics display
 */
function updateStats(history) {
  elements.totalConversations.textContent = history.length;
  
  if (history.length === 0) {
    elements.mostUsedModel.textContent = '-';
    elements.mostUsedModelCount.textContent = '';
    elements.avgTitleLength.textContent = '-';
    elements.firstConversationTime.textContent = '-';
    elements.lastConversationTime.textContent = '-';
    elements.totalFilesUploaded.textContent = '0';
    return;
  }
  
  const modelCounts = history.reduce((acc, entry) => {
    const model = entry.model || 'Unknown';
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});
  
  const mostUsed = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0];
  elements.mostUsedModel.textContent = mostUsed ? mostUsed[0] : 'N/A';
  elements.mostUsedModelCount.textContent = mostUsed ? `(${mostUsed[1]} chats)` : '';
  
  const totalTitleLength = history.reduce((acc, entry) => acc + (entry.title ? entry.title.length : 0), 0);
  elements.avgTitleLength.textContent = history.length > 0 ? Math.round(totalTitleLength / history.length) : '-';
  
  const sortedByDate = [...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  elements.firstConversationTime.textContent = formatDate(new Date(sortedByDate[0].timestamp), true);
  elements.lastConversationTime.textContent = formatTimeAgo(new Date(sortedByDate[sortedByDate.length - 1].timestamp));
  
  const totalFiles = history.reduce((acc, entry) => acc + (entry.attachedFiles ? entry.attachedFiles.length : 0), 0);
  elements.totalFilesUploaded.textContent = totalFiles;
}

/**
 * Populate model filter dropdown
 */
function populateModelFilter() {
  const models = [...new Set(allHistory.map(item => item.model || 'Unknown'))].sort();
  
  // Keep the "All Models" option
  elements.modelFilter.innerHTML = '<option value="">All Models</option>'; 
  
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    elements.modelFilter.appendChild(option);
  });
}

/**
 * Set up date filter events and initialize date inputs
 */
function setupDateFilters() {
  elements.dateFilter.addEventListener('change', () => {
    elements.customDateRange.style.display = elements.dateFilter.value === 'custom' ? 'grid' : 'none';
    // Trigger update when main date filter changes (not just custom inputs)
    updateFilteredHistory();
    updateConversationList();
  });
  
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  elements.startDate.value = formatDateForInput(thirtyDaysAgo);
  elements.endDate.value = formatDateForInput(today);
}

/**
 * Reset all filters to default values
 */
function resetFilters() {
  elements.modelFilter.value = '';
  elements.dateFilter.value = 'all';
  elements.searchFilter.value = '';
  elements.customDateRange.style.display = 'none';
  // Reset custom dates if you want, or leave them
  // const today = new Date();
  // const thirtyDaysAgo = new Date();
  // thirtyDaysAgo.setDate(today.getDate() - 30);
  // elements.startDate.value = formatDateForInput(thirtyDaysAgo);
  // elements.endDate.value = formatDateForInput(today);
  elements.sortBy.value = 'date-desc'; // Default sort
  
  updateFilteredHistory();
  updateConversationList();
}

/**
 * Create visualization based on the selected type
 */
function createVisualization(type) {
  if (chart) chart.destroy();
  
  if (allHistory.length === 0) {
    // Optionally display a message in the chart area
    const ctx = elements.vizChart.getContext('2d');
    ctx.clearRect(0, 0, elements.vizChart.width, elements.vizChart.height); // Clear previous chart
    ctx.font = "14px " + getComputedStyle(document.documentElement).getPropertyValue('--font-family-sans').trim();
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-lighter').trim();
    ctx.textAlign = "center";
    ctx.fillText("No data to visualize yet.", elements.vizChart.width / 2, elements.vizChart.height / 2);
    return;
  }
  
  currentVisualization = type; // Update current viz type
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
 * Create model distribution chart (doughnut)
 */
function createModelDistributionChart() {
  const modelCounts = allHistory.reduce((acc, entry) => {
    const model = entry.model || 'Unknown';
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});
  
  const labels = Object.keys(modelCounts);
  const data = Object.values(modelCounts);
  
  chart = new Chart(elements.vizChart.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: CHART_COLORS.slice(0, labels.length),
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim(),
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 800,
        easing: 'easeInOutQuart'
      },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            padding: 15,
            font: { size: 12, family: getComputedStyle(document.documentElement).getPropertyValue('--font-family-sans').trim() },
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-light').trim()
          }
        },
        tooltip: {
            callbacks: {
                label: function(context) {
                    let label = context.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed !== null) {
                        label += context.parsed + ' chat' + (context.parsed === 1 ? '' : 's');
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
 * Create activity over time chart (line)
 */
function createActivityOverTimeChart() {
  const dateGroups = {};
  allHistory.forEach(entry => {
    const dateStr = formatDateForGrouping(new Date(entry.timestamp));
    dateGroups[dateStr] = (dateGroups[dateStr] || 0) + 1;
  });

  // Ensure we have a sensible range even if data is sparse
  let sortedDates = Object.keys(dateGroups).sort();
  if (sortedDates.length > 0) {
    const allDatesInRange = [];
    let currentDate = new Date(sortedDates[0]);
    const endDate = new Date(sortedDates[sortedDates.length -1]);

    while(currentDate <= endDate) {
        allDatesInRange.push(formatDateForGrouping(new Date(currentDate)));
        currentDate.setDate(currentDate.getDate() + 1);
    }
    sortedDates = allDatesInRange; // Use the continuous range
  }


  const counts = sortedDates.map(date => dateGroups[date] || 0); // Ensure 0 for dates with no activity in range
  const displayDates = sortedDates.map(dateStr => {
      const [year, month, day] = dateStr.split('-');
      return `${month}/${day}`; // MM/DD format
  });
  
  chart = new Chart(elements.vizChart.getContext('2d'), {
    type: 'line',
    data: {
      labels: displayDates,
      datasets: [{
        label: 'Conversations',
        data: counts,
        backgroundColor: CHART_COLORS[0].replace('0.8', '0.2'), // Use primary chart color with less opacity
        borderColor: CHART_COLORS[0],
        borderWidth: 2.5,
        tension: 0.4, // Smoother curve
        fill: true,
        pointRadius: 4,
        pointBackgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--card-bg').trim(),
        pointBorderColor: CHART_COLORS[0],
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 800,
        easing: 'easeInOutQuart'
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() },
          ticks: { 
            precision: 0,
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-lighter').trim(),
            font: { family: getComputedStyle(document.documentElement).getPropertyValue('--font-family-sans').trim() }
          }
        },
        x: {
          grid: { display: false },
          ticks: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-lighter').trim(),
            font: { family: getComputedStyle(document.documentElement).getPropertyValue('--font-family-sans').trim() },
            maxRotation: 0, // Prevent label rotation if possible
            autoSkipPadding: 10 // Adjust for better label display
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
                title: function(context) {
                    // Use the full date from sortedDates for the tooltip title
                    const index = context[0].dataIndex;
                    return formatDate(new Date(sortedDates[index]), true); // Show full date in tooltip
                }
            }
        }
      }
    }
  });
}


/**
 * Handle import file
 */
async function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const text = await readFile(file);
    const importedData = JSON.parse(text);
    
    if (!Array.isArray(importedData)) throw new Error('Invalid data format: Expected an array.');
    // Basic validation for an item (can be more thorough)
    if (importedData.length > 0 && (!importedData[0].url || !importedData[0].timestamp)) {
        throw new Error('Invalid data format: Missing required fields (url, timestamp).');
    }

    const existingUrls = new Set(allHistory.map(item => item.url));
    const newItems = importedData.filter(item => item.url && !existingUrls.has(item.url)); // Ensure item.url exists
    
    if (newItems.length === 0) {
      alert('No new conversations found in the import file, or data was in an invalid format.');
      return;
    }
    
    allHistory = [...allHistory, ...newItems].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    await browser.storage.local.set({ [STORAGE_KEY]: allHistory });
    
    if (browser.runtime && browser.runtime.sendMessage) {
        browser.runtime.sendMessage({ action: 'updateHistoryCount', count: allHistory.length });
    }
    
    // Full UI refresh
    updateFilteredHistory();
    updateStats(allHistory);
    populateModelFilter();
    updateConversationList();
    createVisualization(currentVisualization);
    if (elements.emptyState) elements.emptyState.style.display = allHistory.length > 0 ? 'none' : 'flex';
    
    alert(`Import successful: ${newItems.length} new conversation(s) added.`);
  } catch (error) {
    console.error('Import error:', error);
    alert(`Import failed: ${error.message}`);
  } finally {
    event.target.value = ''; // Reset file input
  }
}

/**
 * Export history data to a JSON file
 */
function exportHistoryData() {
  try {
    if (allHistory.length === 0) {
      alert('No history data to export.');
      return;
    }
    
    const dataToExport = (filteredHistory.length < allHistory.length && filteredHistory.length > 0 && elements.searchFilter.value) 
      ? filteredHistory // Export filtered if a search or specific filter is active and yields results
      : allHistory;     // Otherwise, export all

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `gemini-history-export-${formatDateForFilename(new Date())}.json`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Error exporting history:', error);
    alert('Failed to export history data. Please try again.');
  }
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
  const commonFilterUpdate = () => {
    updateFilteredHistory();
    updateConversationList();
  };

  elements.closeModal?.addEventListener('click', closeModals);
  elements.closeConfirmation?.addEventListener('click', closeModals);
  elements.cancelAction?.addEventListener('click', closeModals);
  
  elements.confirmAction?.addEventListener('click', () => {
    if (typeof confirmationCallback === 'function') {
      confirmationCallback(); // Execute the stored callback
    }
    // confirmationCallback = null; // Callback is cleared in closeModals or after execution if needed
  });
  
  elements.modelFilter?.addEventListener('change', commonFilterUpdate);
  // elements.dateFilter event listener is set in setupDateFilters to handle custom range display

  elements.startDate?.addEventListener('change', () => {
    if (elements.dateFilter.value === 'custom') commonFilterUpdate();
  });
  elements.endDate?.addEventListener('change', () => {
    if (elements.dateFilter.value === 'custom') commonFilterUpdate();
  });
  
  // Debounce search filter input for better performance
  let searchTimeout;
  elements.searchFilter?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        commonFilterUpdate();
    }, 300); // 300ms debounce
  });
  
  elements.sortBy?.addEventListener('change', () => {
    sortFilteredHistory(); // Sort first
    updateConversationList(); // Then update list display
  });
  
  elements.vizTabs?.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.vizTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      createVisualization(tab.dataset.viz);
    });
  });
  
  elements.exportHistoryBtn?.addEventListener('click', exportHistoryData);
  elements.importHistoryBtn?.addEventListener('click', () => elements.importFileInput.click());
  elements.importFileInput?.addEventListener('change', handleImportFile);
  
  elements.clearHistoryBtn?.addEventListener('click', () => {
    showConfirmation(
      'Clear All History',
      '⚠️ Are you sure you want to delete ALL conversation history? This action is irreversible and will remove all stored data.',
      clearAllHistory // Pass the function directly
    );
  });
  
  if (elements.startChatBtn) { // Check element exists
    elements.startChatBtn.addEventListener('click', () => {
      browser.tabs.create({ url: 'https://gemini.google.com/app' });
    });
  }

  // Close modal with Escape key
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (elements.confirmationModal.classList.contains('active')) {
            closeModals();
        } else if (elements.conversationModal.classList.contains('active')) {
            closeModals();
        }
    }
  });
}

/**
 * Clear all history data
 */
async function clearAllHistory() {
  try {
    await browser.storage.local.set({ [STORAGE_KEY]: [] });
    allHistory = [];
    
    if (browser.runtime && browser.runtime.sendMessage) {
        browser.runtime.sendMessage({ action: 'updateHistoryCount', count: 0 });
    }
    
    closeModals(); // Close confirmation modal

    updateFilteredHistory(); // Will result in empty filteredHistory
    updateStats(allHistory);
    populateModelFilter(); // Will clear models
    updateConversationList(); // Will show empty state
    createVisualization(currentVisualization); // Will show no data message in chart
    
    if (elements.emptyState) elements.emptyState.style.display = 'flex'; // Ensure main empty state is visible

  } catch (error) {
    console.error('Error clearing history:', error);
    alert('Failed to clear history. Please try again.');
  }
}

/**
 * Show error message in the loading area
 */
function showError(message) {
  if (!elements.loadingState) return;
  elements.loadingState.innerHTML = `
    <div class="error-icon">⚠️</div>
    <p style="color: var(--danger-color); margin-bottom: 10px;">${message}</p>
    <button id="reloadPageBtn" class="button primary-button">Reload</button>
  `;
  elements.loadingState.style.display = 'flex'; // Ensure it's visible

  const reloadBtn = document.getElementById('reloadPageBtn');
  if (reloadBtn) {
    reloadBtn.addEventListener('click', () => window.location.reload());
  }
}

/**
 * ==========================================
 * UTILITY FUNCTIONS
 * (Assumed to be potentially in utils.js or defined here)
 * ==========================================
 */

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = error => reject(error);
    reader.readAsText(file);
  });
}

function formatDate(date, includeYear = false) {
  const today = new Date();
  if (isSameDay(date, today)) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const options = { month: 'short', day: 'numeric' };
  if (includeYear || date.getFullYear() !== today.getFullYear()) {
    options.year = 'numeric';
  }
  return date.toLocaleDateString([], options);
}

function formatDateForInput(date) { // YYYY-MM-DD
  return date.toISOString().split('T')[0];
}

function formatDateForGrouping(date) { // YYYY-MM-DD
  return date.toISOString().split('T')[0];
}

function formatDateForFilename(date) { // YYYYMMDD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function formatTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.round(diffMs / 1000);

  if (diffSecs < 5) return 'Just now';
  if (diffSecs < 60) return `${diffSecs} secs ago`;
  
  const diffMins = Math.round(diffSecs / 60);
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
  
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${Math.round(diffDays/7)} week${Math.round(diffDays/7) !== 1 ? 's' : ''} ago`;

  // For older dates, just show the formatted date
  return formatDate(date, true); 
}

function isSameDay(date1, date2) {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);