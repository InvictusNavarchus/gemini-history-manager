(function () {
  "use strict";

  const STATE = {
    isNewChatPending: false,
    pendingModelName: null,
    pendingPrompt: null,
    pendingOriginalPrompt: null,
    pendingAttachedFiles: [],
    pendingAccountName: null,
    pendingAccountEmail: null,
    pendingGeminiPlan: null,
    pendingGemId: null,
    pendingGemName: null,
    pendingGemUrl: null,
    sidebarObserver: null,
    titleObserver: null,
    secondaryTitleObserver: null,
    stopButtonObserver: null,
  };

  window.GeminiHistory_STATE = STATE;
})();
