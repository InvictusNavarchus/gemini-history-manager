(function () {
  "use strict";

  const Logger = window.GeminiHistoryLogger;
  const Utils = window.GeminiHistory_Utils;

  // Selectors for the container holding the Gem's name.
  // Using multiple selectors to adapt to different DOM structures
  const GEM_NAME_SELECTORS = [
    ".bot-info-card .bot-name-container",
    ".bot-info-container .bot-name-container",
    ".bot-name-and-description .bot-name-container",
  ];

  const GemDetector = {
    /**
     * MutationObserver instance for watching DOM changes
     */
    observer: null,

    /**
     * Extracts the Gem's name from the given DOM element.
     * It tries multiple approaches to extract the name because the DOM structure might vary.
     *
     * @param {Element} element - The DOM element containing the Gem's name.
     * @returns {string|null} The trimmed Gem name, or null if not found.
     */
    getGemName: function (element) {
      if (!element) {
        return null;
      }

      // First try: Get the entire text content of the element
      const fullText = element.textContent.trim();
      if (fullText) {
        Logger.log("gemini-tracker", `Extracted gem name from full text content: "${fullText}"`);
        return fullText;
      }

      // Second try: Look for direct text nodes
      for (const node of element.childNodes) {
        // Node.TEXT_NODE is type 3
        if (node.nodeType === Node.TEXT_NODE) {
          const trimmedText = node.textContent.trim();
          if (trimmedText) {
            Logger.log("gemini-tracker", `Extracted gem name from direct text node: "${trimmedText}"`);
            return trimmedText;
          }
        }
      }

      // Third try: Look for any first-level elements with text content
      for (const child of element.children) {
        const childText = child.textContent.trim();
        if (childText) {
          Logger.log("gemini-tracker", `Extracted gem name from child element: "${childText}"`);
          return childText;
        }
      }

      return null; // No suitable text found
    },

    /**
     * Extracts the Gem name directly from the DOM at the moment of calling.
     * Tries multiple selectors to adapt to different DOM structures.
     *
     * @returns {string|null} The detected gem name or null if not found
     */
    extractCurrentGemName: function () {
      let gemNameElement = null;

      // Try each selector until we find a matching element
      for (const selector of GEM_NAME_SELECTORS) {
        gemNameElement = document.querySelector(selector);
        if (gemNameElement) {
          Logger.log("gemini-tracker", `Found gem name element using selector: ${selector}`);
          break;
        }
      }

      if (gemNameElement) {
        const detectedName = this.getGemName(gemNameElement);

        if (detectedName) {
          Logger.log("gemini-tracker", `Extracted Gem name: "${detectedName}"`);
          return detectedName;
        } else {
          Logger.warn(
            "gemini-tracker",
            "Gem name container found, but the name text could not be extracted as expected."
          );

          // Log the HTML content to help with debugging
          Logger.debug("gemini-tracker", `Gem container HTML: ${gemNameElement.innerHTML}`);
        }
      }
      return null; // Gem name not found
    },

    /**
     * Note: We no longer need to observe for gem name changes since we'll extract the name when needed.
     * This method is kept for compatibility but doesn't start any observer.
     */
    startObserver: function () {
      Logger.log("gemini-tracker", "Gem detection observer not needed with on-demand extraction approach.");
      // No longer using an observer - we'll extract the gem name when needed
    },

    /**
     * Resets the gem detector state.
     * Should be called when navigating to a different page/state.
     */
    reset: function () {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
        Logger.log("gemini-tracker", "Gem detection observer reset.");
      }
    },

    /**
     * Gets the current gem information by extracting it at the moment this function is called.
     * This ensures we always have the most up-to-date gem information.
     *
     * @returns {Object|null} Object with gemId and gemName if on a gem page, null otherwise
     */
    getCurrentGemInfo: function () {
      const url = window.location.href;
      const gemId = Utils.extractGemId(url);

      if (gemId) {
        // Extract the gem name at the moment it's needed, not relying on stored state
        const gemName = this.extractCurrentGemName();

        const gemInfo = {
          gemId: gemId,
          gemName: gemName,
          gemUrl: `https://gemini.google.com/gem/${gemId}`,
        };

        // If name couldn't be extracted, try the debug scan
        if (!gemName) {
          Logger.log("gemini-tracker", "Gem name could not be extracted, performing debug scan");
          this.debugGemDetection();
        }

        return gemInfo;
      }

      return null;
    },

    /**
     * Debug function to help diagnose gem detection issues.
     * Logs detailed information about potential gem name elements.
     */
    debugGemDetection: function () {
      Logger.log("gemini-tracker", "Running gem detection debug scan...");

      // Try all selectors and log what we find
      for (const selector of GEM_NAME_SELECTORS) {
        const element = document.querySelector(selector);
        if (element) {
          Logger.log("gemini-tracker", `Found element matching selector: ${selector}`);
          Logger.log("gemini-tracker", `Element textContent: "${element.textContent.trim()}"`);
          Logger.log("gemini-tracker", `Element innerHTML: ${element.innerHTML}`);

          // Manually check for the name using various methods
          for (const node of element.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
              const text = node.textContent.trim();
              if (text) {
                Logger.log("gemini-tracker", `Direct text node found: "${text}"`);
              }
            }
          }

          // Try to extract using our method
          const extractedName = this.getGemName(element);
          Logger.log("gemini-tracker", `Extraction result: ${extractedName || "No name extracted"}`);
        } else {
          Logger.log("gemini-tracker", `No element found for selector: ${selector}`);
        }
      }

      // Look for potential bot name containers with different selectors
      const potentialContainers = document.querySelectorAll("[class*='bot-name'], [class*='name-container']");
      Logger.log(
        "gemini-tracker",
        `Found ${potentialContainers.length} potential name containers with alternative selectors`
      );

      for (let i = 0; i < Math.min(potentialContainers.length, 5); i++) {
        const container = potentialContainers[i];
        Logger.log("gemini-tracker", `Alternative container ${i + 1} class: ${container.className}`);
        Logger.log(
          "gemini-tracker",
          `Alternative container ${i + 1} text: "${container.textContent.trim()}"`
        );
      }
    },
  };

  window.GeminiHistory_GemDetector = GemDetector;
})();
