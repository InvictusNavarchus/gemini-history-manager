/**
 * Entry point for Gemini history content script.
 * Initializes observers, event listeners, and extension messaging.
 * @returns {void}
 */
(function () {
  "use strict";

  const Logger = window.GeminiHistoryLogger;
  const StatusIndicator = window.GeminiHistory_StatusIndicator;
  const LogConfig = window.GeminiHistory_LogConfig;
  const DomObserver = window.GeminiHistory_DomObserver;
  const EventHandlers = window.GeminiHistory_EventHandlers;
  const Utils = window.GeminiHistory_Utils;

  /**
   * Re-initializes observers after they have been cleaned up.
   * Used when the page becomes visible again after being hidden.
   *
   * @returns {void}
   */
  function reinitializeObservers() {
    Logger.log("gemini-tracker", "Re-initializing observers after page became visible...");

    // Re-initialize GemDetector for current URL
    const GemDetector = window.GeminiHistory_GemDetector;
    if (GemDetector) {
      const url = window.location.href;
      if (Utils.isGemHomepageUrl(url) || Utils.isGemChatUrl(url)) {
        Logger.log("gemini-tracker", "Re-detecting Gem information for current URL...");
        GemDetector.reset();
      }
    }

    // Re-establish sidebar watcher
    StatusIndicator.show("Reconnecting to Gemini sidebar...", "loading", 0);
    DomObserver.watchForSidebar((sidebar) => {
      Logger.log("gemini-tracker", "Sidebar re-detected after page visibility change. Manager fully active.");
      StatusIndicator.show("Gemini History Manager active", "success");
    });
  }

  /**
   * Initializes the Gemini history manager.
   * Sets up DOM observers, event listeners, and background communication.
   *
   * @returns {void}
   */
  function init() {
    Logger.log("gemini-tracker", "Initializing Gemini History Manager...");

    // Initialize status indicator
    /**
     * Initializes the status indicator component.
     * Displays the initial status message.
     *
     * @returns {void}
     */
    StatusIndicator.init();

    // Add storage event listener to detect logging config changes from other contexts
    /**
     * Listens for storage events to detect logging configuration changes.
     * Invalidates the logging configuration cache when changes are detected.
     *
     * @param {StorageEvent} event - The storage event object.
     * @returns {void}
     */
    window.addEventListener("storage", (event) => {
      if (event.key === LogConfig.CONFIG_STORAGE_KEY) {
        Logger.debug("ContentScript", "Logging configuration changed in localStorage, invalidating cache");
        LogConfig.invalidateConfigCache();
      }
    });

    // Show immediate status message that persists until sidebar is found (or timeout)
    StatusIndicator.show("Waiting for Gemini sidebar to appear...", "loading", 0);

    // Initialize GemDetector and check for Gem information
    const GemDetector = window.GeminiHistory_GemDetector;
    if (GemDetector) {
      const url = window.location.href;
      if (Utils.isGemHomepageUrl(url) || Utils.isGemChatUrl(url)) {
        Logger.log("gemini-tracker", "Detected Gem URL. Starting Gem detection...");
        GemDetector.reset();
      }
    }

    // Monitor URL changes to detect navigation to/from Gem pages
    let lastUrl = window.location.href;
    /**
     * Observes URL changes to detect navigation to/from Gem pages.
     * Resets the Gem detector when navigating away from a Gem page.
     * Preserves observers during new chat creation workflows.
     *
     * @returns {void}
     */
    new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        Logger.log("gemini-tracker", `URL changed: ${lastUrl} -> ${currentUrl}`);

        // Check if this is a new chat creation transition that should preserve observers
        const isNewChatTransition = Utils.isNewChatTransition(lastUrl, currentUrl);

        // Special case: If we're transitioning within the same Gem context
        const isTransitionWithinGem =
          Utils.isGemHomepageUrl(lastUrl) &&
          Utils.isGemChatUrl(currentUrl) &&
          Utils.extractGemId(lastUrl) === Utils.extractGemId(currentUrl);

        if (isTransitionWithinGem) {
          Logger.log(
            "gemini-tracker",
            "URL change is within the same Gem context, maintaining Gem detection"
          );
        } else if (isNewChatTransition) {
          Logger.log(
            "gemini-tracker",
            "URL change indicates new chat creation, preserving observers for chat detection"
          );
          // Don't cleanup observers - they're needed to capture the new conversation
        } else {
          // Clean up all observers when navigating to a different context
          Logger.log(
            "gemini-tracker",
            "URL change indicates navigation away from chat context, cleaning up observers"
          );
          DomObserver.cleanupAllObservers();

          if (GemDetector) {
            GemDetector.reset();
          }
        }

        lastUrl = currentUrl;
      }
    }).observe(document, { subtree: true, childList: true });

    // Watch for sidebar to appear before showing ready status
    /**
     * Waits for the Gemini sidebar to appear before showing the ready status.
     * Displays a success message when the sidebar is detected.
     *
     * @param {HTMLElement} sidebar - The Gemini sidebar element.
     * @returns {void}
     */
    DomObserver.watchForSidebar((sidebar) => {
      Logger.log("gemini-tracker", "Sidebar confirmed available. Manager fully active.");
      StatusIndicator.show("Gemini History Manager active", "success");
    });

    // Attach main click listener
    Logger.log("gemini-tracker", "Attaching main click listener to document body...");
    /**
     * Handles click events on the document body.
     * Triggers the send click handler when a click event is detected.
     *
     * @param {MouseEvent} event - The click event object.
     * @returns {void}
     */
    document.body.addEventListener("click", EventHandlers.handleSendClick.bind(EventHandlers), true); // Use capture phase

    // Listen for messages from the popup or background
    /**
     * Handles messages received from the extension (background or popup).
     * Processes commands and triggers appropriate actions.
     *
     * @param {Object} message - The message object sent by the extension.
     * @param {Object} sender - The sender of the message.
     * @param {Function} sendResponse - Callback to send a response.
     * @returns {void|boolean} Return true to indicate async response.
     */
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "getPageInfo") {
        const url = window.location.href;
        const isGeminiChat = Utils.isValidChatUrl(url);
        const isGem = Utils.isGemHomepageUrl(url) || Utils.isGemChatUrl(url);

        const gemInfo =
          isGem && window.GeminiHistory_GemDetector
            ? window.GeminiHistory_GemDetector.getCurrentGemInfo()
            : null;

        return Promise.resolve({
          url: url,
          isGeminiChat: isGeminiChat,
          isGem: isGem,
          gemInfo: gemInfo,
        });
      }

      // Handle invalidate cache message from dashboard or popup
      if (message.action === "invalidateLogConfigCache") {
        Logger.debug("ContentScript", "Received request to invalidate logging config cache");
        LogConfig.invalidateConfigCache();
        return Promise.resolve({ success: true });
      }
    });

    Logger.log("Gemini History Manager initialization complete.");

    // Add cleanup for page unload to prevent memory leaks
    /**
     * Cleans up all observers when the page is being unloaded.
     * Prevents memory leaks from dangling DOM observers.
     *
     * @returns {void}
     */
    window.addEventListener("beforeunload", () => {
      Logger.log("gemini-tracker", "Page unloading, cleaning up all observers");
      DomObserver.cleanupAllObservers();
    });

    /**
     * Handles page visibility changes (e.g., tab switch).
     * Cleans up observers when hidden to prevent memory leaks,
     * and re-initializes them when visible again to restore functionality.
     * Does not cleanup if a title observer is active (Gemini is currently responding).
     *
     * @returns {void}
     */
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        // Check if a title observer is active (Gemini is currently responding to chat)
        const STATE = window.GeminiHistory_STATE;
        if (STATE && (STATE.titleObserver || STATE.secondaryTitleObserver)) {
          Logger.log(
            "gemini-tracker",
            "Page hidden, but title observer is active (Gemini responding). Skipping cleanup to preserve chat tracking."
          );
          return;
        }

        Logger.log("gemini-tracker", "Page hidden, cleaning up all observers");
        DomObserver.cleanupAllObservers();
      } else {
        Logger.log("gemini-tracker", "Page became visible, re-initializing observers");
        reinitializeObservers();
      }
    });
  }

  // Start the script
  init();
})();
