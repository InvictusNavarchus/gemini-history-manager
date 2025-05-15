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
import { defineProps, defineEmits } from 'vue';

// Define props
defineProps({
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

// Methods
function setActiveTab(tabId) {
  emit('update:activeTab', tabId);
}
</script>

<style scoped>
.page-tabs-container {
  display: flex;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 1rem;
}

.page-tab {
  padding: 0.75rem 1.5rem;
  border: none;
  background: none;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-light);
  border-bottom: 3px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}

.page-tab:hover {
  color: var(--text-color);
}

.page-tab.active {
  color: var(--primary-color);
  border-bottom-color: var(--primary-color);
}
</style>
