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
     * or https://gemini.google.com/gem/[gem_id]/[hexadecimal-id]
     * and may optionally include query parameters.
     *
     * @param {string} url - The URL to check
     * @returns {boolean} - True if the URL matches the expected pattern for a Gemini chat
     */
    isValidChatUrl: function (url) {
      const regularChatUrlPattern = /^https:\/\/gemini\.google\.com\/app\/[a-f0-9]+(\?.*)?$/;
      const gemChatUrlPattern = /^https:\/\/gemini\.google\.com\/gem\/[a-f0-9]+\/[a-f0-9]+(\?.*)?$/;
      return regularChatUrlPattern.test(url) || gemChatUrlPattern.test(url);
    },

    /**
     * Determines if a URL is a Gem chat URL.
     * Valid Gem chat URLs follow the pattern: https://gemini.google.com/gem/[gem_id]/[hexadecimal-id]
     *
     * @param {string} url - The URL to check
     * @returns {boolean} - True if the URL matches the expected pattern for a Gem chat
     */
    isGemChatUrl: function (url) {
      const gemChatUrlPattern = /^https:\/\/gemini\.google\.com\/gem\/[a-f0-9]+\/[a-f0-9]+(\?.*)?$/;
      return gemChatUrlPattern.test(url);
    },

    /**
     * Determines if a URL is a Gem homepage URL.
     * Valid Gem homepage URLs follow the pattern: https://gemini.google.com/gem/[gem_id]
     *
     * @param {string} url - The URL to check
     * @returns {boolean} - True if the URL matches the expected pattern for a Gem homepage
     */
    isGemHomepageUrl: function (url) {
      const gemHomepagePattern = /^https:\/\/gemini\.google\.com\/gem\/[a-f0-9]+(\?.*)?$/;
      return gemHomepagePattern.test(url);
    },

    /**
     * Extracts the Gem ID from a Gem URL.
     *
     * @param {string} url - The URL to extract from
     * @returns {string|null} - The Gem ID or null if not a Gem URL
     */
    extractGemId: function (url) {
      if (!url) return null;

      const gemUrlRegex = /^https:\/\/gemini\.google\.com\/gem\/([a-f0-9]+)/;
      const match = url.match(gemUrlRegex);

      if (match && match[1]) {
        return match[1];
      }

      return null;
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
