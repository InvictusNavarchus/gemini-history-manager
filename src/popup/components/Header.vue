<template>
  <header>
    <div class="header-content">
      <h1>Gemini History Manager</h1>
      <div class="controls">
        <button id="themeToggle" class="theme-toggle" aria-label="Toggle dark mode" @click="handleThemeToggle">
          <svg ref="themeIconSvg" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>
        <button id="openFullPage" class="button primary-button" @click="handleOpenFullPage">Open Full View</button>
        <button id="exportHistory" class="button" @click="handleExportHistory">Export History</button>
        <button id="importHistory" class="button" @click="handleImportHistory">Import History</button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue';
import { Logger } from '../../lib/utils.js';

// Define refs
const themeIconSvg = ref(null);

// Define emits
const emit = defineEmits(['themeToggle', 'openFullPage', 'exportHistory', 'importHistory']);

// Event handlers
function handleThemeToggle() {
  Logger.log("Theme toggle button clicked");
  emit('themeToggle', themeIconSvg.value); 
}

function handleOpenFullPage() {
  Logger.log("Open full page button clicked");
  emit('openFullPage');
}

function handleExportHistory() {
  Logger.log("Export history button clicked");
  emit('exportHistory');
}

function handleImportHistory() {
  Logger.log("Import history button clicked");
  emit('importHistory');
}

// Expose the ref to parent component
defineExpose({ themeIconSvg });
</script>

<style scoped>
/* Header specific styles - Moved from global CSS */
header {
  background-color: var(--card-bg);
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow);
  z-index: 10;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.header-content h1 {
  font-size: 16px;
  color: var(--primary-color);
  margin-bottom: 0;
  white-space: nowrap;
}

.controls {
  display: flex;
  gap: 8px;
}

.theme-toggle {
  background: none;
  border: none;
  color: var(--text-color);
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.theme-toggle:hover {
  background-color: var(--hover-bg);
}

.theme-toggle svg {
  width: 16px;
  height: 16px;
}
</style>
