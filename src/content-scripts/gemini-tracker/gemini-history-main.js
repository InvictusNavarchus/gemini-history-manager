/**
 * Entry point for Gemini history content script.
 * Initializes observers, event listeners, and extension messaging.
 * @returns {void}
 */
(function () {
  "use strict";

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
   */ function reinitializeObservers() {
    console.log(`${Utils.getPrefix()} Re-initializing observers after page became visible...`);

    // Re-initialize GemDetector for current URL
    const GemDetector = window.GeminiHistory_GemDetector;
    if (GemDetector) {
      const url = window.location.href;
      if (Utils.isGemHomepageUrl(url) || Utils.isGemChatUrl(url)) {
        console.log(`${Utils.getPrefix()} Re-detecting Gem information for current URL...`);
        GemDetector.reset();
      }
    }

    // Check if we're currently tracking a chat
    const STATE = window.GeminiHistory_STATE;
    const isTrackingChat = STATE && STATE.isNewChatPending;

    // Handle status indicator based on tracking state
    if (isTrackingChat) {
      console.log(`${Utils.getPrefix()} Returning during active chat tracking, restoring status indicator`);
      StatusIndicator.show("Tracking new chat...", "info");
    } else {
      // Re-establish sidebar watcher with loading status
      StatusIndicator.show("Reconnecting to Gemini sidebar...", "loading", 0);
    }

    DomObserver.watchForSidebar((sidebar) => {
      console.log(
        `${Utils.getPrefix()} Sidebar re-detected after page visibility change. Manager fully active.`
      );

      // Only show "active" status if we're not tracking a chat
      if (!isTrackingChat) {
        StatusIndicator.show("Gemini History Manager active", "success");
      }
    });
  }

  /**
   * Initializes the Gemini history manager.
   * Sets up DOM observers, event listeners, and background communication.
   *
   * @returns {void}
   */
  function init() {
    console.log(`${Utils.getPrefix()} Initializing Gemini History Manager...`);

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
        // Log config change using standard prefix
        console.debug(
          `${Utils.getPrefix()} [ContentScript] Logging configuration changed in localStorage, invalidating cache`
        );
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
        console.log(`${Utils.getPrefix()} Detected Gem URL. Starting Gem detection...`);
        GemDetector.reset();
      }
    }

    // Monitor URL changes to detect navigation to/from Gem pages
    let lastUrl = window.location.href;
    /**
     * Observes URL changes to detect navigation to/from Gem pages.
     * Resets the Gem detector when navigating away from a Gem page.
     * Preserves observers during new chat creation workflows.
     * Shows error message if user navigates away during active chat tracking.
     *
     * @returns {void}
     */
    new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        console.log(`${Utils.getPrefix()} URL changed: ${lastUrl} -> ${currentUrl}`);

        // Check if a chat is currently being tracked
        const STATE = window.GeminiHistory_STATE;
        const isChatInProgress = STATE && STATE.isNewChatPending;

        // Check if this is a new chat creation transition that should preserve observers
        const isNewChatTransition = Utils.isNewChatTransition(lastUrl, currentUrl);

        // Special case: If we're transitioning within the same Gem context
        const isTransitionWithinGem =
          Utils.isGemHomepageUrl(lastUrl) &&
          Utils.isGemChatUrl(currentUrl) &&
          Utils.extractGemId(lastUrl) === Utils.extractGemId(currentUrl);

        if (isTransitionWithinGem) {
          // Log URL change using standard prefix
          console.log(
            `${Utils.getPrefix()} URL change is within the same Gem context, maintaining Gem detection`
          );
        } else if (isNewChatTransition) {
          // Log URL change using standard prefix
          console.log(
            `${Utils.getPrefix()} URL change indicates new chat creation, preserving observers for chat detection`
          );
          // Don't cleanup observers - they're needed to capture the new conversation
        } else {
          // Check if user is navigating away during active chat tracking
          if (isChatInProgress) {
            console.warn(
              `${Utils.getPrefix()} User navigated away from chat while tracking is in progress. Chat data may be lost.`
            );
            StatusIndicator.show(
              "You left the chat. Tracking cancelled.",
              "warning",
            );
          }

          // Clean up all observers and state when navigating to a different context
          // Log URL change using standard prefix
          console.log(
            `${Utils.getPrefix()} URL change indicates navigation away from chat context, performing complete cleanup`
          );
          DomObserver.completeCleanup();

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
      console.log(`${Utils.getPrefix()} Sidebar confirmed available. Manager fully active.`);
      StatusIndicator.show("Gemini History Manager active", "success");
    });

    // Warn user before leaving page if chat is in progress
    /**
     * Warns the user before leaving the page if a chat is currently being tracked.
     * Prevents accidental loss of chat data due to page refresh or navigation.
     *
     * @param {BeforeUnloadEvent} event - The beforeunload event object.
     * @returns {string|undefined} - Warning message if chat is in progress, undefined otherwise.
     */
    window.addEventListener("beforeunload", (event) => {
      const STATE = window.GeminiHistory_STATE;
      const isChatInProgress = STATE && STATE.isNewChatPending;

      if (isChatInProgress) {
        const warningMessage =
          "A chat is currently being tracked. Leaving this page may cause your conversation to not be saved properly.";
        console.warn(`${Utils.getPrefix()} ${warningMessage}`);

        // Standard way to show confirmation dialog
        event.preventDefault();
        event.returnValue = warningMessage;
        return warningMessage;
      }
    });

    // Attach main click listener
    console.log(`${Utils.getPrefix()} Attaching main click listener to document body...`);
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
        // Log cache invalidate using standard prefix
        console.debug(
          `${Utils.getPrefix()} [ContentScript] Received request to invalidate logging config cache`
        );
        LogConfig.invalidateConfigCache();
        return Promise.resolve({ success: true });
      }
    });

    // Log initialization using standard prefix
    console.log(`${Utils.getPrefix()} [Gemini History Manager initialization complete.`);

    // Add cleanup for page unload to prevent memory leaks
    /**
     * Cleans up all observers when the page is being unloaded.
     * Prevents memory leaks from dangling DOM observers.
     *
     * @returns {void}
     */
    window.addEventListener("beforeunload", () => {
      console.log(`${Utils.getPrefix()} Page unloading, cleaning up all observers`);
      DomObserver.cleanupAllObservers();
    });

    /**
     * Handles page visibility changes (e.g., tab switch).
     * Completely skips all observer cleanup and re-initialization when a chat is in progress.
     * Only processes visibility changes when no chat tracking is active.
     *
     * @returns {void}
     */
    document.addEventListener("visibilitychange", () => {
      // Check if Gemini is currently processing a new chat - if so, do NOTHING
      const STATE = window.GeminiHistory_STATE;
      if (STATE && STATE.isNewChatPending) {
        console.log(
          `${Utils.getPrefix()} Page visibility changed, but new chat is pending. Doing absolutely nothing to preserve chat tracking.`
        );
        return;
      }

      // Only handle visibility changes when no chat is in progress
      if (document.hidden) {
        console.log(`${Utils.getPrefix()} Page hidden, cleaning up all observers`);
        DomObserver.cleanupAllObservers();
      } else {
        console.log(`${Utils.getPrefix()} Page became visible, re-initializing observers`);
        reinitializeObservers();
      }
    });
  }

  // Start the script
  init();
})();
