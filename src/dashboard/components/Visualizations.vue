<template>
  <div class="visualization-section">
    <h2>Visualizations</h2>
    <div class="viz-tabs">
      <button
        class="viz-tab"
        :class="{ active: activeVizTab === 'modelDistribution' }"
        @click="setActiveVizTab('modelDistribution')"
      >Model Distribution</button>
      <button
        class="viz-tab"
        :class="{ active: activeVizTab === 'activityOverTime' }"
        @click="setActiveVizTab('activityOverTime')"
      >Activity Over Time</button>
    </div>
    <div class="viz-container">
      <canvas ref="vizChartCanvas"></canvas>
    </div>
    <div v-show="activeVizTab === 'activityOverTime'" style="margin-top: 15px; min-height: 84px;">
      <div class="viz-options-panel">
        <div class="viz-option-group">
          <label>Display Mode:</label>
          <div class="viz-radio-buttons">
            <label class="viz-radio-label">
              <input 
                type="radio" 
                name="activityDisplayMode" 
                value="combined" 
                :checked="activityChartOptions.displayMode === 'combined'" 
                @change="updateDisplayMode('combined')"
              > Combined
            </label>
            <label class="viz-radio-label">
              <input 
                type="radio" 
                name="activityDisplayMode" 
                value="separate" 
                :checked="activityChartOptions.displayMode === 'separate'" 
                @change="updateDisplayMode('separate')"
              > By Model
            </label>
          </div>
        </div>
        
        <div class="viz-option-group" v-if="activityChartOptions.displayMode === 'separate'">
          <label for="modelForChart">Select Model:</label>
          <select 
            id="modelForChart" 
            :value="activityChartOptions.selectedModel" 
            @change="updateSelectedModel($event.target.value)"
          >
            <option value="all">All Models</option>
            <option v-for="model in availableModels" :key="model" :value="model">{{ model }}</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted, watch, nextTick } from 'vue';
import Chart from 'chart.js/auto';
import { Logger } from '../../lib/utils.js';

// Define props
const props = defineProps({
  activeVizTab: {
    type: String,
    default: 'modelDistribution'
  },
  activityChartOptions: {
    type: Object,
    default: () => ({
      displayMode: 'combined',
      selectedModel: 'all'
    })
  },
  availableModels: {
    type: Array,
    default: () => []
  },
  currentTheme: {
    type: String,
    default: 'light'
  }
});

// Define emits
const emit = defineEmits(['update:activeVizTab', 'update:activityChartOptions', 'render-chart']);

// References
const vizChartCanvas = ref(null);

// Event handlers
function setActiveVizTab(tabName) {
  emit('update:activeVizTab', tabName);
  emit('render-chart');
}

function updateDisplayMode(mode) {
  emit('update:activityChartOptions', { 
    ...props.activityChartOptions, 
    displayMode: mode 
  });
  emit('render-chart');
}

function updateSelectedModel(model) {
  emit('update:activityChartOptions', { 
    ...props.activityChartOptions, 
    selectedModel: model 
  });
  emit('render-chart');
}

// Expose canvas ref to parent component
defineExpose({ vizChartCanvas });
</script>

<style scoped>
.visualization-section {
  margin-bottom: 2rem;
}

.visualization-section h2 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.viz-tabs {
  display: flex;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.viz-tab {
  padding: 0.5rem 1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-light);
}

.viz-tab.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}

.viz-container {
  position: relative;
  height: 300px;
  background-color: var(--card-bg);
  border-radius: 6px;
  box-shadow: var(--card-shadow);
  padding: 1rem;
}

.viz-options-panel {
  background-color: var(--card-bg);
  border-radius: 6px;
  box-shadow: var(--card-shadow);
  padding: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.viz-option-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.viz-option-group label {
  font-size: 0.85rem;
  color: var(--text-light);
}

.viz-radio-buttons {
  display: flex;
  gap: 1rem;
}

.viz-radio-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.viz-option-group select {
  padding: 0.4rem;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  color: var(--text-color);
  width: 100%;
  min-width: 150px;
}
</style>
