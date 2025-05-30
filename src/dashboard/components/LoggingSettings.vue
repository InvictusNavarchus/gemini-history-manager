<template>
  <div class="logging-settings">
    <h2>Logging Configuration</h2>
    <p class="settings-description">
      Configure how the extension logs information for debugging and troubleshooting
    </p>

    <div class="settings-section">
      <h3>Global Settings</h3>

      <div class="setting-item">
        <div class="setting-label">
          <label for="globalLogging">Enable All Logging</label>
          <p class="setting-description">Turn all logging on or off across the extension</p>
        </div>
        <div class="setting-control">
          <label class="toggle">
            <input type="checkbox" id="globalLogging" v-model="config.enabled" @change="saveConfig" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h3>Log Levels</h3>

      <div class="setting-item" v-for="(enabled, level) in config.levels" :key="level">
        <div class="setting-label">
          <label :for="`level-${level}`">{{ capitalizeFirst(level) }}</label>
          <p class="setting-description">Enable {{ level }} level logs</p>
        </div>
        <div class="setting-control">
          <label class="toggle">
            <input
              type="checkbox"
              :id="`level-${level}`"
              v-model="config.levels[level]"
              @change="saveConfig"
              :disabled="!config.enabled"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h3>Components</h3>
      <p class="settings-description">Enable or disable logging for specific components</p>

      <div class="component-filters">
        <button @click="enableAllComponents" class="button">Enable All</button>
        <button @click="disableAllComponents" class="button">Disable All</button>
      </div>

      <div class="components-grid">
        <div class="setting-item" v-for="(enabled, component) in config.components" :key="component">
          <div class="setting-label">
            <label :for="`component-${component}`">{{ component }}</label>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input
                type="checkbox"
                :id="`component-${component}`"
                v-model="config.components[component]"
                @change="saveConfig"
                :disabled="!config.enabled"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-actions">
      <button class="button" @click="resetConfig">Reset to Defaults</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import {
  loadLogConfig,
  saveLogConfig,
  resetLogConfig,
  setComponentLogging,
  setGlobalLogging,
  setLogLevel,
} from "../../lib/logConfig.js";
import { Logger } from "../../lib/utils.js";

const config = ref({
  enabled: true,
  levels: {
    debug: true,
    log: true,
    warn: true,
    error: true,
  },
  components: {},
});

onMounted(() => {
  Logger.debug("LoggingSettings", "Component mounted");
  loadConfig();
});

function loadConfig() {
  const loadedConfig = loadLogConfig();
  Logger.debug("LoggingSettings", "Loaded logging configuration", loadedConfig);
  config.value = loadedConfig;
}

async function saveConfig() {
  Logger.debug("LoggingSettings", "Saving logging configuration", config.value);
  saveLogConfig(config.value);
}

async function resetConfig() {
  Logger.log("LoggingSettings", "Resetting logging configuration to defaults");
  config.value = resetLogConfig();
}

function enableAllComponents() {
  Logger.log("LoggingSettings", "Enabling all component logging");
  Object.keys(config.value.components).forEach((component) => {
    config.value.components[component] = true;
  });
  saveConfig();
}

function disableAllComponents() {
  Logger.log("LoggingSettings", "Disabling all component logging");
  Object.keys(config.value.components).forEach((component) => {
    config.value.components[component] = false;
  });
  saveConfig();
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
</script>

<style scoped>
.logging-settings {
  padding: 1rem;
  max-width: 800px;
  margin: 0 auto;
}

.settings-description {
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.settings-section {
  margin-bottom: 2rem;
  padding: 1rem;
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--border-color);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label {
  flex: 1;
}

.setting-label label {
  font-weight: 500;
  margin-bottom: 0.25rem;
  display: block;
}

.setting-description {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
}

.setting-control {
  margin-left: 1rem;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--toggle-bg);
  transition: 0.4s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--primary-color);
}

input:disabled + .toggle-slider {
  opacity: 0.5;
  cursor: not-allowed;
}

input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

.components-grid {
  margin-top: 1rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.component-filters {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.settings-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}

.button {
  padding: 0.5rem 0.75rem;
  border-radius: 4px;
  background-color: var(--button-bg);
  border: 1px solid var(--button-border);
  color: var(--button-text);
  cursor: pointer;
  font-size: 0.85rem;
  transition: background-color 0.2s;
}

.button:hover {
  background-color: var(--button-hover-bg);
}
</style>
