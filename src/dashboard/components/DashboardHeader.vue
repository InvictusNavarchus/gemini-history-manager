<template>
  <header>
    <div class="header-content">
      <div class="header-left">
        <h1>Gemini History Manager</h1>
        <div class="search-container">
          <div class="search-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="10" cy="10" r="7"></circle>
              <line x1="21" y1="21" x2="15" y2="15"></line>
            </svg>
          </div>
          <input
            type="text"
            id="searchFilter"
            placeholder="Search titles and prompts..."
            :value="searchQuery"
            @input="handleSearchInput($event)"
          />
        </div>
      </div>
      <div class="controls">
        <button
          id="themeToggle"
          class="theme-toggle"
          aria-label="Toggle dark mode"
          @click="handleThemeToggle"
        >
          <svg
            ref="themeIconSvg"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>
        <button id="exportHistory" class="button" @click="handleExport">Export History</button>
        <button id="importHistory" class="button" @click="handleImport">Import History</button>
        <button id="clearHistory" class="button danger-button" @click="handleClearHistory">
          Clear All History
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
/**
 * Import necessary dependencies from Vue.
 */
import { ref, defineProps, defineEmits, onMounted, watch, onUnmounted } from "vue";

/**
 * Import the Logger utility.
 */
import { Logger } from "../../lib/utils.js";

/**
 * Define the props accepted by the DashboardHeader component.
 * @typedef {Object} DashboardHeaderProps
 * @property {string} searchQuery - The current search query string.
 */
const props = defineProps({
  /**
   * The current search query string.
   * @type {string}
   */
  searchQuery: {
    type: String,
    default: "",
  },
});

/**
 * Define the emits available from the DashboardHeader component.
 * @typedef {Object} DashboardHeaderEmits
 * @property {function(string):void} update:searchQuery - Emitted when the search query changes.
 * @property {function():void} theme-toggle - Emitted when the theme toggle is triggered.
 * @property {function():void} export - Emitted when export is triggered.
 * @property {function():void} import - Emitted when import is triggered.
 * @property {function():void} clear-history - Emitted when clear history is triggered.
 */
const emit = defineEmits(["update:searchQuery", "theme-toggle", "export", "import", "clear-history"]);

/**
 * Reference to the theme icon SVG element in the header.
 * @type {import('vue').Ref<SVGElement|null>}
 */
const themeIconSvg = ref(null);

/**
 * Lifecycle hook: Runs when the component is mounted.
 * Logs initial search query state.
 */
onMounted(() => {
  Logger.debug("DashboardHeader", "Component mounted", {
    initialSearchQuery: props.searchQuery || "empty",
  });
});

/**
 * Watches for changes to the searchQuery prop and logs changes.
 */
watch(
  () => props.searchQuery,
  (newQuery, oldQuery) => {
    if (newQuery !== oldQuery) {
      Logger.debug("DashboardHeader", "Search query changed", {
        from: oldQuery || "empty",
        to: newQuery || "empty",
      });
    }
  }
);

/**
 * Handles the theme toggle button click event.
 * Emits the 'theme-toggle' event to parent, passing the themeIconSvg ref.
 * @returns {void}
 */
function handleThemeToggle() {
  Logger.log("DashboardHeader", "Theme toggle button clicked");
  emit("theme-toggle", themeIconSvg.value);
  return;
}

/**
 * Handles the export button click event.
 * Emits the 'export' event to parent.
 * @returns {void}
 */
function handleExport() {
  Logger.log("DashboardHeader", "Export button clicked");
  emit("export");
}

/**
 * Handles the import button click event.
 * Emits the 'import' event to parent.
 * @returns {void}
 */
function handleImport() {
  Logger.log("DashboardHeader", "Import button clicked");
  emit("import");
}

/**
 * Handles the clear history button click event.
 * Emits the 'clear-history' event to parent.
 * @returns {void}
 */
function handleClearHistory() {
  Logger.log("DashboardHeader", "Clear history button clicked");
  emit("clear-history");
}

/**
 * Handles user input in the search field with debounce logic.
 * Emits an update to the search query after a short delay (250ms).
 * Ignores queries shorter than 3 characters except for clearing the search.
 * @param {Event} event - The input event from the search field.
 * @returns {void}
 */
let searchDebounceTimer = null;
function handleSearchInput(event) {
  const query = event.target.value.trim();
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  if (query.length <= 3) {
    // Debounce 400ms for 3 chars and less
    searchDebounceTimer = setTimeout(() => {
      emit("update:searchQuery", query);
    }, 400);
  } else if (query.length >= 4) {
    // Debounce 150ms for 4+ chars
    searchDebounceTimer = setTimeout(() => {
      emit("update:searchQuery", query);
    }, 150);
  } else {
    // No debounce for clearing the search
    emit("update:searchQuery", query);
  }
}

// Cleanup debounce timer on unmount
/**
 * Lifecycle hook: Runs when the component is unmounted.
 * Cleans up any remaining debounce timer.
 */
onUnmounted(() => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
});

// Expose themeIconSvg for parent component access
defineExpose({ themeIconSvg });
</script>

<style scoped>
/* Header styling */
header {
  background-color: var(--card-bg);
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
  flex-grow: 1;
}

h1 {
  font-size: 18px;
  color: var(--primary-color);
  margin: 0;
  white-space: nowrap;
}

.search-container {
  flex-grow: 1;
  max-width: 400px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-lighter);
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-container input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 14px;
  color: var(--text-color);
  background-color: var(--bg-color);
  transition: all var(--animation-speed);
}

#searchFilter {
  /* This ID is within the component, so it's fine */
  background-color: var(--input-bg);
}

.search-container input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(110, 65, 226, 0.2);
}

.search-container input::placeholder {
  color: var(--text-lighter);
}

.controls {
  display: flex;
  gap: 10px;
}

/* Theme toggle button */
.theme-toggle {
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
  margin-right: 8px;
}

.theme-toggle:hover {
  background-color: var(--hover-bg);
}

.theme-toggle svg {
  width: 20px;
  height: 20px;
}

/* Dark theme specific adjustments for search input */
/* :deep() is used to target global html attribute from within scoped style */
:deep(html[data-theme="dark"]) .search-container input,
:deep(html[data-theme="dark"]) #searchFilter {
  /* Also target #searchFilter for dark mode */
  background-color: rgba(255, 255, 255, 0.05);
  /* color and border-color will be inherited from var(--text-color) and var(--border-color) 
     which are updated in the dark theme an already applied to .search-container input */
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .header-left {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .search-container {
    width: 100%;
    max-width: none;
  }

  .controls {
    width: 100%;
    justify-content: space-between;
    flex-wrap: wrap; /* Allow buttons to wrap if not enough space */
    gap: 8px;
  }
  /* Styling for .button within .controls under this media query */
  /* This assumes .button class is available globally or defined in this component if needed */
  /* If .button is globally styled, these specific overrides for padding/font-size will apply in this context */
  .controls .button {
    /* This will style .button elements that are children of .controls */
    padding: 6px 10px;
    font-size: 12px;
  }
}
</style>
