(function () {
  "use strict";

  const Logger = window.GeminiHistoryLogger;
  const StatusIndicator = window.GeminiHistory_StatusIndicator;
  const LogConfig = window.GeminiHistory_LogConfig;
  const DomObserver = window.GeminiHistory_DomObserver;
  const EventHandlers = window.GeminiHistory_EventHandlers;
  const Utils = window.GeminiHistory_Utils;

  /**
   * Initializes the script.
   * Sets up observers, event listeners, and menu commands.
   */
  function init() {
    Logger.log("gemini-tracker", "Initializing Gemini History Manager...");

    // Initialize status indicator
    StatusIndicator.init();

    // Add storage event listener to detect logging config changes from other contexts
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
    new MutationObserver(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        Logger.log("gemini-tracker", `URL changed: ${lastUrl} -> ${currentUrl}`);
        lastUrl = currentUrl;

        // Reset Gem detector when URL changes
        if (GemDetector) {
          GemDetector.reset();
        }
      }
    }).observe(document, { subtree: true, childList: true });

    // Watch for sidebar to appear before showing ready status
    DomObserver.watchForSidebar((sidebar) => {
      Logger.log("gemini-tracker", "Sidebar confirmed available. Manager fully active.");
      StatusIndicator.show("Gemini History Manager active", "success");
    });

    // Attach main click listener
    Logger.log("gemini-tracker", "Attaching main click listener to document body...");
    document.body.addEventListener("click", EventHandlers.handleSendClick.bind(EventHandlers), true); // Use capture phase

    // Listen for messages from the popup or background
    browser.runtime.onMessage.addListener((message) => {
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
  }

  // Start the script
  init();
})();
