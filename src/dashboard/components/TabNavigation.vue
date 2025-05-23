<template>
  <div class="page-tabs-container">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="page-tab"
      :class="{ active: activeTab === tab.id }"
      @click="setActiveTab(tab.id)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, onMounted, watch } from "vue";
import { Logger } from "../../lib/utils.js";

// Define props
const props = defineProps({
  tabs: {
    type: Array,
    default: () => [],
  },
  activeTab: {
    type: String,
    default: "",
  },
});

// Define emits
const emit = defineEmits(["update:activeTab"]);

// Component lifecycle
onMounted(() => {
  Logger.debug("TabNavigation", "Component mounted", {
    availableTabs: props.tabs.map((tab) => tab.id),
    initialActiveTab: props.activeTab,
  });
});

// Watch for tab changes
watch(
  () => props.activeTab,
  (newTab, oldTab) => {
    Logger.debug("TabNavigation", "Active tab changed externally", {
      from: oldTab,
      to: newTab,
    });
  }
);

// Methods
function setActiveTab(tabId) {
  Logger.log("TabNavigation", "Tab selected by user", {
    previousTab: props.activeTab,
    newTab: tabId,
  });
  emit("update:activeTab", tabId);
}
</script>

<style scoped>
.page-tabs-container {
  display: flex;
  gap: 10px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px; /* Spacing for the underline */
}

.page-tab {
  padding: 10px 20px;
  font-size: 16px;
  font-weight: 500;
  background: none;
  border: none;
  color: var(--text-light);
  cursor: pointer;
  position: relative;
  transition: color 0.2s ease;
}

.page-tab:hover {
  color: var(--primary-color);
}

.page-tab.active {
  color: var(--primary-color);
}

.page-tab.active::after {
  content: "";
  position: absolute;
  bottom: -11px; /* Align with border-bottom of container */
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--primary-color);
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .page-tabs-container {
    padding-bottom: 5px; /* Adjust for smaller screens */
  }
  .page-tab {
    padding: 8px 12px; /* Smaller tabs */
    font-size: 14px;
  }
  .page-tab.active::after {
    bottom: -6px; /* Adjust underline position */
  }
}
</style>
