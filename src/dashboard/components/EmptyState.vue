<template>
  <div class="empty-state">
    <div class="empty-icon">{{ icon }}</div>
    <h3>{{ title }}</h3>
    <p>{{ message }}</p>
    <slot></slot>
  </div>
</template>

<script setup>
import { defineProps } from "vue";

defineProps({
  icon: {
    type: String,
    default: "📋",
  },
  title: {
    type: String,
    default: "No Data Found",
  },
  message: {
    type: String,
    default: "There is no data available to display.",
  },
});
</script>

<style scoped>
/* Common base styles, originally from .empty-state, .loading-state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--text-light); /* This applies for both light and dark via CSS vars */
  height: 100%;
  flex-grow: 1;
}

/* EmptyState.vue specific */
.empty-icon {
  font-size: 40px;
  margin-bottom: 20px;
}

/* Targets h3 within the component's .empty-state root */
h3 {
  font-size: 18px;
  margin-bottom: 10px;
  color: var(--text-color);
}

/* Targets p within the component's .empty-state root */
p {
  margin-bottom: 20px;
  max-width: 300px;
}
</style>
