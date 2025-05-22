(function () {
  "use strict";

  const Logger = window.GeminiHistoryLogger;
  const CONFIG = window.GeminiHistory_CONFIG;
  const StatusIndicator = window.GeminiHistory_StatusIndicator;
  const Utils = window.GeminiHistory_Utils;

  const HistoryManager = {
    /**
     * Loads chat history from browser storage.
     *
     * @returns {Promise<Array>} - Promise resolving to array of history entries or empty array if none found or on error
     */
    loadHistory: function () {
      Logger.log("gemini-tracker", "Loading history from storage...");
      return new Promise((resolve) => {
        browser.storage.local
          .get(CONFIG.STORAGE_KEY)
          .then((data) => {
            const history = data[CONFIG.STORAGE_KEY] || [];
            if (Array.isArray(history)) {
              Logger.log("gemini-tracker", `History loaded successfully. Found ${history.length} entries.`);
              resolve(history);
            } else {
              Logger.warn("gemini-tracker", "Stored history data is not an array. Returning empty history.");
              resolve([]);
            }
          })
          .catch((error) => {
            Logger.error("gemini-tracker", "Error loading history:", error);
            StatusIndicator.show("Error loading chat history", "error");
            resolve([]);
          });
      });
    },

    /**
     * Saves chat history to browser storage.
     *
     * @param {Array} history - Array of history entries to save
     * @returns {Promise} - Promise resolving when save is complete
     */
    saveHistory: function (history) {
      Logger.log("gemini-tracker", `Attempting to save history with ${history.length} entries...`);
      if (!Array.isArray(history)) {
        Logger.error("gemini-tracker", "Attempted to save non-array data. Aborting save.");
        StatusIndicator.show("Error saving history data", "error");
        return Promise.reject(new Error("Cannot save non-array data"));
      }

      return browser.storage.local
        .set({ [CONFIG.STORAGE_KEY]: history })
        .then(() => {
          Logger.log("gemini-tracker", "History saved successfully.");
          // Send message to background script to update badge
          browser.runtime
            .sendMessage({
              action: "updateHistoryCount",
              count: history.length,
            })
            .catch((err) => Logger.error("gemini-tracker", "Error sending message to background:", err));
        })
        .catch((error) => {
          Logger.error("gemini-tracker", "Error saving history:", error);
          StatusIndicator.show("Error saving chat history", "error");
          throw error;
        });
    },

    /**
     * Adds a new entry to the chat history.
     * Validates input data and prevents duplicates based on URL.
     *
     * @param {string} timestamp - ISO-formatted timestamp for the chat
     * @param {string} url - URL of the chat
     * @param {string} title - Title of the chat
     * @param {string} model - Model name used for the chat
     * @param {string} prompt - User prompt text
     * @param {Array} attachedFiles - Array of attached filenames
     * @param {string} accountName - Name of the user account
     * @param {string} accountEmail - Email of the user account
     * @param {string|null} geminiPlan - The Gemini plan (Pro, Free, etc.) or null if unknown
     * @param {string|null} gemId - ID of the Gem being used (if any)
     * @param {string|null} gemName - Name of the Gem being used (if any)
     * @param {string|null} gemUrl - URL of the Gem (if any)
     * @returns {Promise<boolean>} - Promise resolving to true if entry was added, false if validation failed or duplicate detected
     */
    addHistoryEntry: async function (
      timestamp,
      url,
      title,
      model,
      prompt,
      attachedFiles,
      accountName,
      accountEmail,
      geminiPlan,
      gemId = null,
      gemName = null,
      gemUrl = null
    ) {
      const entryData = {
        timestamp,
        url,
        title,
        model,
        prompt,
        attachedFiles,
        accountName,
        accountEmail,
        geminiPlan,
        gemId,
        gemName,
        gemUrl,
      };
      Logger.log("gemini-tracker", "Attempting to add history entry:", entryData);

      // Basic validation (Title, URL, Timestamp, Model are still required)
      if (!timestamp || !url || !title || !model) {
        Logger.warn(
          "gemini-tracker",
          "Attempted to add entry with missing essential data. Skipping.",
          entryData
        );
        StatusIndicator.show("Chat history entry incomplete", "warning");
        return false; // Indicate failure
      }

      // Prevent adding entry if URL is invalid
      if (!Utils.isValidChatUrl(url)) {
        Logger.warn(
          "gemini-tracker",
          `Attempted to add entry with invalid chat URL pattern "${url}". Skipping.`
        );
        StatusIndicator.show("Invalid chat URL", "warning");
        return false; // Indicate failure
      }

      try {
        const history = await this.loadHistory();

        // Prevent duplicates based on URL
        if (history.some((entry) => entry.url === url)) {
          Logger.log("Duplicate URL detected, skipping entry:", url);
          StatusIndicator.show("Chat already in history", "info");
          return false; // Indicate failure (or already added)
        }

        history.unshift(entryData); // Add to beginning
        await this.saveHistory(history);
        Logger.log("gemini-tracker", "Successfully added history entry.");
        StatusIndicator.show(`Chat "${title}" saved to history`, "success");
        return true; // Indicate success
      } catch (error) {
        Logger.error("gemini-tracker", "Error adding history entry:", error);
        StatusIndicator.show("Failed to add chat to history", "error");
        return false;
      }
    },
  };

  window.GeminiHistory_HistoryManager = HistoryManager;
})();
