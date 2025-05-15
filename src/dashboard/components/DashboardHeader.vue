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
            @input="$emit('update:searchQuery', $event.target.value)">
        </div>
      </div>
      <div class="controls">
        <button id="themeToggle" class="theme-toggle" aria-label="Toggle dark mode" @click="handleThemeToggle">
          <svg ref="themeIconSvg" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>
        <button id="exportHistory" class="button" @click="$emit('export')">Export History</button>
        <button id="importHistory" class="button" @click="$emit('import')">Import History</button>
        <button id="clearHistory" class="button danger-button" @click="$emit('clear-history')">Clear All History</button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue';
import { Logger } from '../../lib/utils.js';

// Define props
defineProps({
  searchQuery: {
    type: String,
    default: ''
  }
});

// Define emits
defineEmits(['update:searchQuery', 'theme-toggle', 'export', 'import', 'clear-history']);

// References
const themeIconSvg = ref(null);

// Event handlers
function handleThemeToggle() {
  Logger.log("Theme toggle button clicked");
  emit('theme-toggle', themeIconSvg.value);
}

// Expose themeIconSvg for parent component access
defineExpose({ themeIconSvg });
</script>

<style scoped>
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.header-left h1 {
  font-size: 1.5rem;
  margin: 0;
  white-space: nowrap;
}

.controls {
  display: flex;
  gap: 8px;
}

.search-container {
  position: relative;
  width: 300px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-light);
  pointer-events: none;
}

.search-container input {
  width: 100%;
  padding: 8px 10px 8px 32px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  color: var(--text-color);
  font-size: 0.9rem;
}

.search-container input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(110, 65, 226, 0.2);
}

.theme-toggle {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.theme-toggle:hover {
  background-color: var(--hover-bg);
}
</style>
