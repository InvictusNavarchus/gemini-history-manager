(function () {
  "use strict";

  const Logger = window.GeminiHistoryLogger;
  const STATE = window.GeminiHistory_STATE;
  const Utils = window.GeminiHistory_Utils;
  const ModelDetector = window.GeminiHistory_ModelDetector;
  const InputExtractor = window.GeminiHistory_InputExtractor;
  const DomObserver = window.GeminiHistory_DomObserver;
  const StatusIndicator = window.GeminiHistory_StatusIndicator;

  const EventHandlers = {
    /**
     * Checks if the target is a valid send button.
     *
     * @param {Element} target - The DOM element that was clicked
     * @returns {Element|false} - The send button element if found and valid, false otherwise
     */
    isSendButton: function (target) {
      const sendButton = target.closest(
        'button:has(mat-icon[data-mat-icon-name="send"]), button.send-button, button[aria-label*="Send"], button[data-test-id="send-button"]'
      );

      if (!sendButton) {
        return false;
      }

      if (sendButton.getAttribute("aria-disabled") === "true") {
        Logger.log("Send button is disabled. Ignoring click.");
        return false;
      }

      return sendButton;
    },

    /**
     * Prepares for tracking a new chat.
     * Captures necessary information before the chat is created.
     */
    prepareNewChatTracking: function () {
      Logger.log("gemini-tracker", "URL matches GEMINI_APP_URL. This is potentially a new chat.");
      STATE.isNewChatPending = true;
      Logger.log("Set isNewChatPending = true");

      StatusIndicator.show("Preparing to track new chat...", "loading", 0);

      // Capture model, prompt, and files BEFORE navigating or starting observation
      STATE.pendingModelName = ModelDetector.getCurrentModelName();
      STATE.pendingPrompt = InputExtractor.getPromptText();
      STATE.pendingAttachedFiles = InputExtractor.getAttachedFiles();

      // Capture account information
      const accountInfo = InputExtractor.getAccountInfo();
      STATE.pendingAccountName = accountInfo.name;
      STATE.pendingAccountEmail = accountInfo.email;

      Logger.log("gemini-tracker", `Captured pending model name: "${STATE.pendingModelName}"`);
      Logger.log("gemini-tracker", `Captured pending prompt: "${STATE.pendingPrompt}"`);
      Logger.log("gemini-tracker", `Captured pending files:`, STATE.pendingAttachedFiles);
      Logger.log("gemini-tracker", `Captured account name: "${STATE.pendingAccountName}"`);
      Logger.log("gemini-tracker", `Captured account email: "${STATE.pendingAccountEmail}"`);

      StatusIndicator.update(`Capturing chat with ${STATE.pendingModelName}...`, "info");

      // Use setTimeout to ensure observation starts after the click event potentially triggers initial DOM changes
      setTimeout(() => {
        Logger.log("Initiating sidebar observation via setTimeout.");
        DomObserver.observeSidebarForNewChat();
      }, 50); // Small delay
    },

    /**
     * Handles clicks on the send button to detect new chats.
     * Uses capture phase to intercept clicks before they're processed.
     *
     * @param {Event} event - The click event
     */
    handleSendClick: function (event) {
      Logger.log("gemini-tracker", "Click detected on body (capture phase). Target:", event.target);
      const sendButton = this.isSendButton(event.target);

      if (sendButton) {
        Logger.log("gemini-tracker", "Click target is (or is inside) a potential send button.");
        const currentUrl = window.location.href;
        Logger.log("gemini-tracker", `Current URL at time of click: ${currentUrl}`);

        // Check if we are on the main app page (starting a NEW chat)
        if (Utils.isBaseAppUrl(currentUrl)) {
          this.prepareNewChatTracking();
        } else {
          Logger.log(
            "gemini-tracker",
            "URL does not match GEMINI_APP_URL. Ignoring click for history tracking."
          );
        }
      }
    },
  };

  window.GeminiHistory_EventHandlers = EventHandlers;
})();
