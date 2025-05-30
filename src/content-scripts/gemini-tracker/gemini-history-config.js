(function () {
  "use strict";

  const CONFIG = {
    STORAGE_KEY: "geminiChatHistory",
    BASE_URL: "https://gemini.google.com/app",
    GEM_BASE_URL: "https://gemini.google.com/gem",
  };

  // Known model names that might appear in the UI
  const MODEL_NAMES = {
    "2.0 Flash": "2.0 Flash",
    "2.5 Flash": "2.5 Flash",
    "2.5 Pro": "2.5 Pro",
    "Deep Research": "Deep Research",
    "Veo 2": "Veo 2",
    Personalization: "Personalization",
  };

  window.GeminiHistory_CONFIG = CONFIG;
  window.GeminiHistory_MODEL_NAMES = MODEL_NAMES;
})();
