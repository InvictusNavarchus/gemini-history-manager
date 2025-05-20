<template>
  <header>
    <div class="header-content">
      <div class="header-left">
        <h1>Gemini History Manager</h1>
        <div class="search-container">
          <div class="search-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="10" cy="10" r="7"></circle>
              <line x1="21" y1="21" x2="15" y2="15"></line>
            </svg>
          </div>
          <input type="text" id="searchFilter" placeholder="Search titles and prompts..." 
            :value="searchQuery" 
            @input="handleSearchInput($event)">
        </div>
      </div>
      <div class="controls">
        <button id="themeToggle" class="theme-toggle" aria-label="Toggle dark mode" @click="handleThemeToggle">
          <svg ref="themeIconSvg" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>
        <button id="exportHistory" class="button" @click="handleExport">Export History</button>
        <button id="importHistory" class="button" @click="handleImport">Import History</button>
        <button id="clearHistory" class="button danger-button" @click="handleClearHistory">Clear All History</button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted, watch } from 'vue';
import { Logger } from '../../lib/utils.js';

// Define props
const props = defineProps({
  searchQuery: {
    type: String,
    default: ''
  }
});

// Define emits
const emit = defineEmits(['update:searchQuery', 'theme-toggle', 'export', 'import', 'clear-history']);

// References
const themeIconSvg = ref(null);

// Component lifecycle hooks
onMounted(() => {
  Logger.debug("DashboardHeader", "Component mounted", {
    initialSearchQuery: props.searchQuery || 'empty'
  });
});

// Watch for search query changes
watch(() => props.searchQuery, (newQuery, oldQuery) => {
  if (newQuery !== oldQuery) {
    Logger.debug("DashboardHeader", "Search query changed", {
      from: oldQuery || 'empty',
      to: newQuery || 'empty'
    });
  }
});

// Event handlers
function handleThemeToggle() {
  Logger.log("DashboardHeader", "Theme toggle button clicked");
  emit('theme-toggle', themeIconSvg.value);
}

// Add handlers for other events
function handleExport() {
  Logger.log("DashboardHeader", "Export button clicked");
  emit('export');
}

function handleImport() {
  Logger.log("DashboardHeader", "Import button clicked");
  emit('import');
}

function handleClearHistory() {
  Logger.log("DashboardHeader", "Clear history button clicked");
  emit('clear-history');
}

function handleSearchInput(event) {
  const query = event.target.value;
  Logger.debug("DashboardHeader", "Search input updated", { query });
  emit('update:searchQuery', query);
}

// Expose themeIconSvg for parent component access
defineExpose({ themeIconSvg });
</script>


