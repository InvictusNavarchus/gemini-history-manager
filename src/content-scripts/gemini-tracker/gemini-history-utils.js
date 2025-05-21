(function () {
  "use strict";

  const Logger = window.GeminiHistoryLogger;
  const CONFIG = window.GeminiHistory_CONFIG;

  const Utils = {
    /**
     * Gets the current timestamp in ISO 8601 UTC format.
     *
     * @returns {string} - Formatted timestamp string in ISO 8601 UTC format (YYYY-MM-DDTHH:MM:SSZ)
     */
    getCurrentTimestamp: function () {
      try {
        return new Date().toISOString(); // Returns ISO 8601 format with UTC timezone
      } catch (e) {
        Logger.error("gemini-tracker", "Error getting ISO UTC timestamp:", e);
        return new Date().toISOString(); // Same fallback since it's the primary method
      }
    },

    /**
     * Determines if a URL is a valid Gemini chat URL.
     * Valid URLs follow the pattern: https://gemini.google.com/app/[hexadecimal-id]
     * and may optionally include query parameters.
     *
     * @param {string} url - The URL to check
     * @returns {boolean} - True if the URL matches the expected pattern for a Gemini chat
     */
    isValidChatUrl: function (url) {
      const chatUrlPattern = /^https:\/\/gemini\.google\.com\/app\/[a-f0-9]+(\?.*)?$/;
      return chatUrlPattern.test(url);
    },

    /**
     * Determines if a URL is the base Gemini app URL (with potential parameters).
     * The base URL is used for starting new chats.
     *
     * @param {string} url - The URL to check
     * @returns {boolean} - True if the URL is the base app URL (with or without parameters)
     */
    isBaseAppUrl: function (url) {
      // Check if URL starts with base URL, followed by end of string or a question mark (for parameters)
      return url === CONFIG.BASE_URL || url.startsWith(CONFIG.BASE_URL + "?");
    },
  };

  window.GeminiHistory_Utils = Utils;
})();
