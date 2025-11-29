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
    Personalization: "Personalization",
  };

  // Known tools that can be activated in the toolbox
  // These are features that run on top of a model
  const TOOL_NAMES = {
    "Deep Research": "Deep Research",
    "Create videos": "Create videos",
    "Create images": "Create images",
    Canvas: "Canvas",
    "Guided Learning": "Guided Learning",
    "Dynamic view": "Dynamic view",
  };

  window.GeminiHistory_CONFIG = CONFIG;
  window.GeminiHistory_MODEL_NAMES = MODEL_NAMES;
  window.GeminiHistory_TOOL_NAMES = TOOL_NAMES;
})();
