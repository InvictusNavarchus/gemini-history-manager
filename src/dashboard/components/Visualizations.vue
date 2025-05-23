<template>
  <div class="visualization-section">
    <h2>Visualizations</h2>
    <div class="viz-tabs">
      <button
        class="viz-tab"
        :class="{ active: activeVizTab === 'modelDistribution' }"
        @click="setActiveVizTab('modelDistribution')"
      >
        Model Distribution
      </button>
      <button
        class="viz-tab"
        :class="{ active: activeVizTab === 'planDistribution' }"
        @click="setActiveVizTab('planDistribution')"
      >
        Plan Distribution
      </button>
      <button
        class="viz-tab"
        :class="{ active: activeVizTab === 'gemDistribution' }"
        @click="setActiveVizTab('gemDistribution')"
      >
        Gem Distribution
      </button>
      <button
        class="viz-tab"
        :class="{ active: activeVizTab === 'activityOverTime' }"
        @click="setActiveVizTab('activityOverTime')"
      >
        Activity Over Time
      </button>
    </div>
    <div class="viz-container">
      <canvas ref="vizChartCanvas"></canvas>
    </div>
    <div
      id="vizOptions"
      v-show="activeVizTab === 'activityOverTime'"
      style="margin-top: 15px; min-height: 84px"
    >
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
              />
              Combined
            </label>
            <label class="viz-radio-label">
              <input
                type="radio"
                name="activityDisplayMode"
                value="separate"
                :checked="activityChartOptions.displayMode === 'separate'"
                @change="updateDisplayMode('separate')"
              />
              By Model
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
import { ref, defineProps, defineEmits, onMounted, watch, nextTick } from "vue";
import Chart from "chart.js/auto";
import { Logger } from "../../lib/utils.js";

// Define props
const props = defineProps({
  activeVizTab: {
    type: String,
    default: "modelDistribution",
  },
  activityChartOptions: {
    type: Object,
    default: () => ({
      displayMode: "combined",
      selectedModel: "all",
    }),
  },
  availableModels: {
    type: Array,
    default: () => [],
  },
  currentTheme: {
    type: String,
    default: "light",
  },
});

// Define emits
const emit = defineEmits(["update:activeVizTab", "update:activityChartOptions", "render-chart"]);

// References
const vizChartCanvas = ref(null);

// Lifecycle hooks
onMounted(() => {
  Logger.log("Visualizations", "Visualizations component mounted");

  // Check if canvas is available
  if (vizChartCanvas.value) {
    Logger.debug("Visualizations", "Canvas reference obtained successfully");
    Logger.debug(
      "Visualizations",
      `Canvas dimensions: ${vizChartCanvas.value.width}x${vizChartCanvas.value.height}`
    );

    // Signal to parent that the visualization component is ready to render
    nextTick(() => {
      Logger.log("Visualizations", "Canvas ready in DOM, requesting initial chart render");
      emit("render-chart");
    });
  } else {
    Logger.warn("Visualizations", "Canvas reference not available on mount - charts may not render properly");
  }

  Logger.debug("Visualizations", "Visualization component mount complete");
});

// Event handlers
function setActiveVizTab(tabName) {
  Logger.log("Visualizations", `Visualization tab changed to: ${tabName}`);
  Logger.debug("Visualizations", `Previous tab: ${props.activeVizTab}, new tab: ${tabName}`);

  emit("update:activeVizTab", tabName);

  Logger.debug("Visualizations", `Requesting chart render for new tab: ${tabName}`);
  emit("render-chart");
}

function updateDisplayMode(mode) {
  Logger.log("Visualizations", `Chart display mode changed to: ${mode}`);
  Logger.debug(
    "Visualizations",
    `Previous mode: ${props.activityChartOptions.displayMode}, new mode: ${mode}`
  );

  const newOptions = {
    ...props.activityChartOptions,
    displayMode: mode,
  };

  emit("update:activityChartOptions", newOptions);

  Logger.debug("Visualizations", `Requesting chart render with new display mode: ${mode}`);
  emit("render-chart");
}

function updateSelectedModel(model) {
  Logger.log("Visualizations", `Selected model for chart changed to: ${model}`);
  Logger.debug(
    "Visualizations",
    `Previous model: ${props.activityChartOptions.selectedModel}, new model: ${model}`
  );

  const newOptions = {
    ...props.activityChartOptions,
    selectedModel: model,
  };

  emit("update:activityChartOptions", newOptions);

  Logger.debug("Visualizations", `Requesting chart render with new selected model: ${model}`);
  emit("render-chart");
}

// Expose canvas ref to parent component
defineExpose({ vizChartCanvas });
</script>

<style scoped>
/* Styles for the visualization section, now scoped to Visualizations.vue */
.visualization-section {
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: var(--shadow);
  padding: 15px;
  flex-grow: 1; /* Allow it to take available space */
  display: flex;
  flex-direction: column;
}

.visualization-section h2 {
  font-size: 16px;
  margin-bottom: 15px;
  color: var(--text-color);
}

.viz-tabs {
  display: flex;
  margin-bottom: 0; /* Remove the margin to eliminate the gap */
  border-bottom: 1px solid var(--border-color);
}

.viz-tab {
  padding: 8px 12px;
  font-size: 13px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-light);
  position: relative;
}

.viz-tab.active {
  color: var(--primary-color);
  font-weight: 500;
}

.viz-tab.active:after {
  content: "";
  position: absolute;
  bottom: -1px; /* Should align with the border-bottom of .viz-tabs */
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--primary-color);
}

/* Styles for #vizOptions container and its panel */
#vizOptions {
  min-height: 84px;
  transition:
    opacity 0.2s ease-in-out,
    visibility 0.2s ease-in-out;
}

.viz-options-panel {
  padding: 10px 15px;
  background-color: var(--bg-color);
  border-radius: 6px;
  border: 1px solid var(--border-color);
  /* Fixed height to accommodate both the display mode row and model selector row */
  height: 84px;
}

.viz-option-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
  transition:
    visibility 0.2s,
    opacity 0.2s ease-in-out;
}

.viz-option-group:last-child {
  margin-bottom: 0;
}

.viz-option-group label {
  /* General label styling within an option group */
  font-size: 13px;
  color: var(--text-color);
  font-weight: 500;
  flex-shrink: 0;
}

.viz-radio-buttons {
  display: flex;
  align-items: center;
  gap: 15px;
}

.viz-radio-label {
  /* Specific styling for labels of radio buttons */
  display: flex;
  align-items: center;
  font-size: 13px;
  color: var(--text-color); /* Ensure this is var(--text-color) not text-light */
  gap: 5px;
  cursor: pointer;
  font-weight: normal; /* Radio labels are typically normal weight */
}

.viz-radio-label input {
  /* Styling for the radio input itself */
  cursor: pointer;
}

/* Styles for #activityModelFilter, now #modelForChart */
#modelForChart {
  padding: 5px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  color: var(--text-color);
  font-size: 13px;
}

.viz-container {
  height: 300px; /* Base height for chart when options are shown */
  min-height: 300px; /* Ensure consistent min-height */
  flex-grow: 1; /* Allow canvas container to grow */
  transition: height 0.3s ease-in-out; /* Smooth transition if height changes */
  margin-top: 15px; /* Add space between tabs and chart */
}

/* Targeting the canvas element via its ref or a class would be more robust */
/* For now, assuming canvas might get an ID or class that #vizChart was targeting */
.viz-container > canvas {
  /* More direct targeting of the canvas if #vizChart is problematic */
  max-height: 100%;
}

/* Responsive adjustments */
@media (max-width: 900px) {
  .viz-container {
    height: 250px; /* Adjust chart height */
  }
}
</style>
