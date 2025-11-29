(function () {
  "use strict";

  const CONFIG = {
    STORAGE_KEY: "geminiChatHistory",
    BASE_URL: "https://gemini.google.com/app",
    GEM_BASE_URL: "https://gemini.google.com/gem",
  };

  // Known model names that might appear in the UI
  // As of Nov 2025, Gemini simplified model names to "Fast" and "Thinking"
  const MODEL_NAMES = {
    // New simplified model names (Nov 2025+)
    Fast: "Fast",
    Thinking: "Thinking",
    // Legacy model names (kept for backwards compatibility)
    "2.0 Flash": "2.0 Flash",
    "2.5 Flash": "2.5 Flash",
    "2.5 Pro": "2.5 Pro",
    // Special tools
    "Deep Research": "Deep Research",
    "Veo 2": "Veo 2",
    "Veo 3": "Veo 3",
    Personalization: "Personalization",
  };

  window.GeminiHistory_CONFIG = CONFIG;
  window.GeminiHistory_MODEL_NAMES = MODEL_NAMES;
})();
