/**
 * Gemini History Manager - Dashboard UI Helpers
 * Helper functions for UI interactions in the Dashboard
 */
import dayjs from 'dayjs';
import { reactive } from 'vue';
import { Logger } from '../../lib/utils.js';

/**
 * Create and manage toast notifications
 * @returns {Object} Toast notification functions
 */
export function createToastManager() {
  Logger.log('🔧 Toast Manager: Initializing toast manager');
  // Use Vue's reactive system for the toasts array
  
  const state = reactive({
    activeToasts: [],
    toastIdCounter: 0
  });
  
  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {string} type - Toast type (success, error, warning, info)
   * @param {number} duration - Duration in milliseconds
   * @returns {number} The ID of the created toast
   */
  function showToast(message, type = 'info', duration = 5000) {
    Logger.log(`🍞 Toast #${state.toastIdCounter}: Creating new toast with message: "${message}", type: ${type}, duration: ${duration}ms`);
    
    const id = state.toastIdCounter++;
    const newToast = {
      id,
      message,
      type,
      duration
    };
    
    Logger.log(`🍞 Toast #${id}: Toast object created`);
    Logger.log(`🍞 Toast #${id}: Current active toasts count before adding: ${state.activeToasts.length}`);
    
    state.activeToasts.push(newToast);
    
    Logger.log(`🍞 Toast #${id}: Toast added to activeToasts array. New length: ${state.activeToasts.length}`);
    Logger.log(`🍞 Toast #${id}: Active toasts IDs: ${state.activeToasts.map(t => t.id).join(', ')}`);

    if (duration > 0) {
      Logger.log(`🍞 Toast #${id}: Setting auto-removal timeout for ${duration + 300}ms`);
      setTimeout(() => {
        Logger.log(`🍞 Toast #${id}: Auto-removal timeout triggered after ${duration + 300}ms`);
        removeToast(id);
      }, duration + 300); // Add extra time for animation
    }
    
    return id;
  }
  
  /**
   * Remove a toast notification by ID
   * @param {number} id - Toast ID to remove
   */
  function removeToast(id) {
    Logger.log(`🍞 Toast #${id}: Attempting to remove toast`);
    Logger.log(`🍞 Toast #${id}: Current active toasts before removal: ${state.activeToasts.length}`);
    
    const index = state.activeToasts.findIndex(toast => toast.id === id);
    Logger.log(`🍞 Toast #${id}: Found at index: ${index}`);
    
    if (index !== -1) {
      state.activeToasts.splice(index, 1);
      Logger.log(`🍞 Toast #${id}: Toast removed successfully. New active toasts count: ${state.activeToasts.length}`);
    } else {
      Logger.warn(`🍞 Toast #${id}: Could not find toast to remove`);
    }
  }
  
  /**
   * Get all active toast notifications
   * @returns {Array} Array of active toast objects
   */
  function getActiveToasts() {
    Logger.log(`🍞 Toast Manager: Getting active toasts. Count: ${state.activeToasts.length}`);
    if (state.activeToasts.length > 0) {
      Logger.log(`🍞 Toast Manager: Active toast IDs: ${state.activeToasts.map(t => t.id).join(', ')}`);
    }
    return state.activeToasts; // Return the reactive array directly
  }
  
  return {
    showToast,
    removeToast,
    getActiveToasts
  };
}

/**
 * Create a file download with the provided data
 * @param {Object|Array} data - Data to download
 * @param {string} filename - File name
 * @param {string} type - MIME type (default: 'application/json')
 */
export function downloadFile(data, filename, type = 'application/json') {
  Logger.log(`Creating download for file: ${filename}, type: ${type}`);
  
  try {
    let stringifiedData;
    try {
      stringifiedData = JSON.stringify(data, null, 2);
      Logger.debug(`Successfully stringified ${Array.isArray(data) ? data.length + ' items' : 'object'} for download`);
    } catch (jsonError) {
      Logger.error(`JSON stringification error: ${jsonError.message}`, jsonError);
      throw new Error(`Failed to stringify data: ${jsonError.message}`);
    }
    
    const blob = new Blob([stringifiedData], { type });
    Logger.debug(`Created Blob of size: ${blob.size} bytes`);
    
    const objectURL = URL.createObjectURL(blob);
    Logger.debug(`Created object URL: ${objectURL}`);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = objectURL;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    Logger.debug('Download link created and appended to document');
    
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(objectURL);
    
    Logger.log(`File download initiated: ${filename} (${blob.size} bytes)`);
  } catch (error) {
    Logger.error(`Error creating file download for ${filename}: ${error.message}`, error);
    throw error;
  }
}

/**
 * Export history data to a JSON file
 * @param {Array} dataToExport - History data to export
 * @param {boolean} isFiltered - Whether the export is filtered data
 * @returns {Object} Result of the export operation
 */
export function exportHistoryData(dataToExport, isFiltered = false) {
  Logger.log(`Exporting ${isFiltered ? 'filtered' : 'all'} conversation history data`);
  Logger.debug(`Export data contains ${dataToExport ? dataToExport.length : 0} conversations`);
  
  try {
    if (!dataToExport || dataToExport.length === 0) {
      Logger.warn('Attempted to export empty dataset');
      return { success: false, message: 'No conversations to export.' };
    }
    
    const exportTypeMessage = isFiltered ? 'filtered conversations' : 'all conversations';
    const filename = `gemini-history-export-${dayjs().format('YYYY-MM-DD')}.json`;
    Logger.log(`Creating export file: ${filename}`);
    
    // Sample the first item to verify structure
    if (dataToExport.length > 0) {
      const firstItem = dataToExport[0];
      Logger.debug(`Export sample item - ID: ${firstItem.id}, Title: ${firstItem.title}, Date: ${firstItem.timestamp}`);
    }
    
    downloadFile(dataToExport, filename);
    Logger.log(`Successfully initiated export of ${dataToExport.length} conversations`);
    
    return { 
      success: true, 
      message: `Successfully exported ${exportTypeMessage} (${dataToExport.length} items).`
    };
  } catch (error) {
    Logger.error(`Export operation failed: ${error.message}`, error);
    return { success: false, message: `Export error: ${error.message}` };
  }
}

/**
 * Process guided import experience from URL parameters
 * @returns {boolean} True if guided import was initiated
 */
export function processGuidedImportFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('action') && urlParams.get('action') === 'import') {
    // Clear URL parameters
    window.history.replaceState({}, document.title, window.location.pathname);
    return true;
  }
  return false;
}

/**
 * Create visual guidance for import
 * @param {string} importButtonId - ID of the import button element
 */
export function createImportGuidedExperience(importButtonId = 'importHistory') {
  // Give time for the UI to render, then guide the user to import
  setTimeout(() => {
    const importBtn = document.getElementById(importButtonId);
    if (!importBtn) return;
    
    importBtn.classList.add('highlight-pulse');
    importBtn.focus();
  }, 500);
}
