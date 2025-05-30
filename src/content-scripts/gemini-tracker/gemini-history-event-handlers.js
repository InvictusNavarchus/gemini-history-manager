(function () {
  "use strict";

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
        console.log(`[${new Date().toTimeString().slice(0, 8)}] [GHM] [EventHandlers] Send button is disabled. Ignoring click.`);
        return false;
      }

      return sendButton;
    },

    /**
     * Prepares for tracking a new chat.
     * Captures necessary information before the chat is created.
     */
    prepareNewChatTracking: function () {
      const url = window.location.href;
      console.log(
        `[${new Date().toTimeString().slice(0, 8)}] [GHM] [gemini-tracker] URL ${url} matches valid Gemini pattern. This is potentially a new chat.`
      );
      STATE.isNewChatPending = true;
      console.log(`[${new Date().toTimeString().slice(0, 8)}] [GHM] [EventHandlers] Set isNewChatPending = true`);

      StatusIndicator.show("Preparing to track new chat...", "loading", 0);

      // Capture model, prompt, and files BEFORE navigating or starting observation
      STATE.pendingModelName = ModelDetector.getCurrentModelName();
      STATE.pendingPrompt = InputExtractor.getPromptText();
      STATE.pendingOriginalPrompt = InputExtractor.getOriginalPromptText(); // Capture original for better comparison
      STATE.pendingAttachedFiles = InputExtractor.getAttachedFiles();

      // Capture Gem information if applicable
      const GemDetector = window.GeminiHistory_GemDetector;
      if (GemDetector && (Utils.isGemHomepageUrl(url) || Utils.isGemChatUrl(url))) {
        const gemInfo = GemDetector.getCurrentGemInfo();
        if (gemInfo) {
          STATE.pendingGemId = gemInfo.gemId;
          STATE.pendingGemName = gemInfo.gemName;
          STATE.pendingGemUrl = gemInfo.gemUrl;
          console.log(
            `[${new Date().toTimeString().slice(0, 8)}] [GHM] [gemini-tracker] Captured Gem information: ID=${gemInfo.gemId}, Name=${gemInfo.gemName || "Not detected yet"}`
          );
        }
      }

      // Capture account information
      const accountInfo = InputExtractor.getAccountInfo();
      STATE.pendingAccountName = accountInfo.name;
      STATE.pendingAccountEmail = accountInfo.email;

      // Capture the Gemini plan (Pro, Free, etc.)
      STATE.pendingGeminiPlan = ModelDetector.detectGeminiPlan();

      console.log(`[${new Date().toTimeString().slice(0, 8)}] [GHM] [gemini-tracker] Captured pending model name: "${STATE.pendingModelName}"`);
      console.log(`[${new Date().toTimeString().slice(0, 8)}] [GHM] [gemini-tracker] Captured pending prompt: "${STATE.pendingPrompt}"`);
      console.log(`[${new Date().toTimeString().slice(0, 8)}] [GHM] [gemini-tracker] Captured pending original prompt: "${STATE.pendingOriginalPrompt}"`);
      console.log(`[${new Date().toTimeString().slice(0, 8)}] [GHM] [gemini-tracker] Captured pending files:`, STATE.pendingAttachedFiles);
      console.log(`[${new Date().toTimeString().slice(0, 8)}] [GHM] [gemini-tracker] Captured account name: "${STATE.pendingAccountName}"`);
      console.log(`[${new Date().toTimeString().slice(0, 8)}] [GHM] [gemini-tracker] Captured account email: "${STATE.pendingAccountEmail}"`);
      console.log(`[${new Date().toTimeString().slice(0, 8)}] [GHM] [gemini-tracker] Captured Gemini plan: "${STATE.pendingGeminiPlan}"`);

      StatusIndicator.update(`Capturing chat with ${STATE.pendingModelName}...`, "info");

      // Use setTimeout to ensure observation starts after the click event potentially triggers initial DOM changes
      setTimeout(() => {
        console.log(`[${new Date().toTimeString().slice(0, 8)}] [GHM] [EventHandlers] Initiating sidebar observation via setTimeout.`);
        DomObserver.observeSidebarForNewChat();
      }, 50); // Small delay
    },

    /**
     * Handles clicks on the send button to detect new chats.
     * Uses capture phase to intercept clicks before they're processed.
     * @param {Event} event - The click event.
     */
    handleSendClick: function (event) {
      console.log(`[${new Date().toTimeString().slice(0, 8)}] [GHM] [gemini-tracker] Click detected on body (capture phase). Target:`, event.target);
      const sendButton = this.isSendButton(event.target);

      if (sendButton) {
        console.log(`[${new Date().toTimeString().slice(0, 8)}] [GHM] [gemini-tracker] Click target is (or is inside) a potential send button.`);
        const currentUrl = window.location.href;
        console.log(`[${new Date().toTimeString().slice(0, 8)}] [GHM] [gemini-tracker] Current URL at time of click: ${currentUrl}`);

        // Check if we are on the main app page or a Gem homepage (starting a NEW chat)
        if (Utils.isBaseAppUrl(currentUrl) || Utils.isGemHomepageUrl(currentUrl)) {
          this.prepareNewChatTracking();
        } else {
          console.log(
            `[${new Date().toTimeString().slice(0, 8)}] [GHM] [gemini-tracker] URL is not a valid starting point for new chats. Ignoring click for history tracking.`
          );
        }
      }
    },
  };

  window.GeminiHistory_EventHandlers = EventHandlers;
})();
