/**
 * Gemini History Manager - Utilities Library
 * Shared functions used across extension components
 */

const Utils = {
  /**
   * Constants used across extension
   */
  CONSTANTS: {
    STORAGE_KEY: 'geminiChatHistory',
    BASE_URL: 'https://gemini.google.com/app'
  },
  
  /**
   * Formats a date for display with various options
   * 
   * @param {Date} date - The date to format
   * @param {boolean} includeYear - Whether to include the year for non-current year dates
   * @param {boolean} includeTime - Whether to include the time
   * @returns {string} - Formatted date string
   */
  formatDate: function(date, includeYear = false, includeTime = false) {
    const today = new Date();
    
    // For today, show time only or "Today" with time
    if (this.isSameDay(date, today)) {
      if (includeTime) {
        return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // For yesterday
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (this.isSameDay(date, yesterday)) {
      if (includeTime) {
        return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      return 'Yesterday';
    }
    
    // For this year, show month and day
    if (date.getFullYear() === today.getFullYear() && !includeYear) {
      const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      if (includeTime) {
        return `${dateStr}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
      return dateStr;
    }
    
    // For other years, include year
    const dateStr = date.toLocaleDateString([], { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    if (includeTime) {
      return `${dateStr}, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return dateStr;
  },
  
  /**
   * Format a time difference as a human-readable string (e.g. "5 minutes ago")
   * 
   * @param {Date} date - The date to format as a time ago string
   * @returns {string} - Human readable time difference
   */
  formatTimeAgo: function(date) {
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
    if (diffMonths < 12) {
      return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
    }
    
    const diffYears = Math.floor(diffDays / 365);
    return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
  },
  
  /**
   * Format a date for input fields (YYYY-MM-DD)
   * 
   * @param {Date} date - The date to format
   * @returns {string} - Date formatted as YYYY-MM-DD
   */
  formatDateForInput: function(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  
  /**
   * Format a date for filenames (YYYY-MM-DD)
   * 
   * @param {Date} date - The date to format
   * @returns {string} - Date formatted as YYYY-MM-DD
   */
  formatDateForFilename: function(date) {
    return this.formatDateForInput(date);
  },
  
  /**
   * Check if two dates are the same day
   * 
   * @param {Date} date1 - First date
   * @param {Date} date2 - Second date
   * @returns {boolean} - True if dates are the same day
   */
  isSameDay: function(date1, date2) {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  },
  
  /**
   * Truncates text to a specified length and adds ellipsis
   * 
   * @param {string} text - The text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} - Truncated text with ellipsis if needed
   */
  truncateText: function(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  },
  
  /**
   * Loads history data from browser storage
   * 
   * @returns {Promise<Array>} - Promise resolving to the history array
   */
  loadHistoryData: async function() {
    try {
      const data = await browser.storage.local.get(this.CONSTANTS.STORAGE_KEY);
      return data[this.CONSTANTS.STORAGE_KEY] || [];
    } catch (error) {
      console.error('Error loading history data:', error);
      throw error;
    }
  },
  
  /**
   * Saves history data to browser storage
   * 
   * @param {Array} history - The history data to save
   * @returns {Promise} - Promise resolving when save is complete
   */
  saveHistoryData: async function(history) {
    if (!Array.isArray(history)) {
      throw new Error('Cannot save non-array data');
    }
    
    try {
      await browser.storage.local.set({ [this.CONSTANTS.STORAGE_KEY]: history });
      
      // Update badge
      browser.runtime.sendMessage({
        action: 'updateHistoryCount',
        count: history.length
      }).catch(err => console.error('Error sending message to background:', err));
      
      return true;
    } catch (error) {
      console.error('Error saving history data:', error);
      throw error;
    }
  },
  
  /**
   * Checks if a URL is a valid Gemini chat URL
   * 
   * @param {string} url - The URL to check
   * @returns {boolean} - True if the URL is a valid Gemini chat URL
   */
  isValidChatUrl: function(url) {
    const chatUrlPattern = /^https:\/\/gemini\.google\.com\/app\/[a-f0-9]+$/;
    return chatUrlPattern.test(url);
  },
  
  /**
   * Checks if a URL is the Gemini base URL
   * 
   * @param {string} url - The URL to check
   * @returns {boolean} - True if the URL is the Gemini base URL
   */
  isBaseAppUrl: function(url) {
    return url === this.CONSTANTS.BASE_URL || url.startsWith(this.CONSTANTS.BASE_URL + '?');
  }
};