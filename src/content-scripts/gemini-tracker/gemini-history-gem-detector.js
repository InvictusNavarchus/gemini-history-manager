(function () {
  "use strict";

  const Logger = window.GeminiHistoryLogger;
  const Utils = window.GeminiHistory_Utils;

  // Selector for the container holding the Gem's name.
  const GEM_NAME_SELECTOR = ".bot-info-card .bot-name-container";

  const GemDetector = {
    /**
     * Currently detected gem name, if any.
     */
    currentGemName: null,

    /**
     * MutationObserver instance for watching DOM changes
     */
    observer: null,

    /**
     * Extracts the Gem's name from the given DOM element.
     * It specifically looks for the first direct text node with content.
     *
     * @param {Element} element - The DOM element containing the Gem's name.
     * @returns {string|null} The trimmed Gem name, or null if not found.
     */
    getGemName: function (element) {
      if (!element) {
        return null;
      }

      for (const node of element.childNodes) {
        // Node.TEXT_NODE is type 3
        if (node.nodeType === Node.TEXT_NODE) {
          const trimmedText = node.textContent.trim();
          if (trimmedText) {
            return trimmedText;
          }
        }
      }
      return null; // No suitable text node found
    },

    /**
     * Checks for the Gem name element, extracts the name, and logs it.
     * If a Gem name is found, it updates the currentGemName and disconnects the observer.
     *
     * @returns {boolean} True if a Gem name was found, false otherwise.
     */
    checkForGem: function () {
      const gemNameElement = document.querySelector(GEM_NAME_SELECTOR);

      if (gemNameElement) {
        const detectedName = this.getGemName(gemNameElement);

        if (detectedName) {
          Logger.log("gemini-tracker", `Detected Gem name: "${detectedName}"`);
          this.currentGemName = detectedName;

          if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
            Logger.log("gemini-tracker", "Observer disconnected after detecting Gem name.");
          }
          return true; // Gem name found
        } else {
          Logger.warn(
            "gemini-tracker",
            "Gem name container found, but the name text could not be extracted as expected."
          );
        }
      }
      return false; // Gem name not found yet
    },

    /**
     * Initializes and starts the MutationObserver to watch for DOM changes.
     * If the Gem name is found on the initial check, the observer is not started.
     */
    startObserver: function () {
      // Perform an initial check.
      if (this.checkForGem()) {
        return; // Gem name already found and processed.
      }

      // If not found immediately, set up the MutationObserver.
      this.observer = new MutationObserver(() => {
        // On any DOM change, re-check for the Gem name.
        this.checkForGem();
      });

      // Determine a suitable root for observation.
      let observationRoot = document.querySelector("chat-window-content");
      if (!observationRoot) {
        observationRoot = document.querySelector("bots-chat-window");
      }
      if (!observationRoot) {
        observationRoot = document.body; // Fallback
        Logger.warn(
          "gemini-tracker",
          "Observing document.body for Gem detection. Could not find preferred roots. This might be less efficient."
        );
      } else {
        Logger.log("gemini-tracker", `Observing ${observationRoot.tagName.toLowerCase()} for Gem detection.`);
      }

      // Start observing the chosen root for child additions/removals and subtree modifications.
      this.observer.observe(observationRoot, { childList: true, subtree: true });
      Logger.log("gemini-tracker", "Gem detection MutationObserver started.");
    },

    /**
     * Resets the gem detector state and starts monitoring again if needed.
     * Should be called when navigating to a different page/state.
     */
    reset: function () {
      this.currentGemName = null;

      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
        Logger.log("gemini-tracker", "Gem detection observer reset.");
      }

      const url = window.location.href;
      if (Utils.isGemHomepageUrl(url) || Utils.isGemChatUrl(url)) {
        Logger.log("gemini-tracker", "On a Gem page. Starting Gem name detection.");
        this.startObserver();
      }
    },

    /**
     * Gets the current gem information.
     *
     * @returns {Object|null} Object with gemId and gemName if on a gem page, null otherwise
     */
    getCurrentGemInfo: function () {
      const url = window.location.href;
      const gemId = Utils.extractGemId(url);

      if (gemId) {
        return {
          gemId: gemId,
          gemName: this.currentGemName,
          gemUrl: `https://gemini.google.com/gem/${gemId}`,
        };
      }

      return null;
    },
  };

  window.GeminiHistory_GemDetector = GemDetector;
})();
