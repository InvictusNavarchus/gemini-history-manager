<template>
  <div class="page-tabs-container">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="page-tab"
      :class="{ active: activeTab === tab.id }"
      @click="setActiveTab(tab.id)"
    >{{ tab.label }}</button>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, onMounted, watch } from 'vue';
import { Logger } from '../../lib/utils.js';

// Define props
const props = defineProps({
  tabs: {
    type: Array,
    default: () => []
  },
  activeTab: {
    type: String,
    default: ''
  }
});

// Define emits
const emit = defineEmits(['update:activeTab']);

// Component lifecycle
onMounted(() => {
  Logger.debug("TabNavigation", "Component mounted", { 
    availableTabs: props.tabs.map(tab => tab.id),
    initialActiveTab: props.activeTab
  });
});

// Watch for tab changes
watch(() => props.activeTab, (newTab, oldTab) => {
  Logger.debug("TabNavigation", "Active tab changed externally", { 
    from: oldTab,
    to: newTab
  });
});

// Methods
function setActiveTab(tabId) {
  Logger.log("TabNavigation", "Tab selected by user", { 
    previousTab: props.activeTab, 
    newTab: tabId 
  });
  emit('update:activeTab', tabId);
}
</script>


