(function () {
  "use strict";

  const STATE = {
    isNewChatPending: false,
    pendingModelName: null,
    pendingPrompt: null,
    pendingAttachedFiles: [],
    pendingAccountName: null,
    pendingAccountEmail: null,
    sidebarObserver: null,
    titleObserver: null,
    isExtensionReady: false, // Tracks whether the extension is fully initialized and sidebar is found
  };

  window.GeminiHistory_STATE = STATE;
})();
