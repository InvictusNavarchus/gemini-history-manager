<template>
  <div class="loading-state">
    <div class="spinner"></div>
    <p>{{ message }}</p>
  </div>
</template>

<script setup>
import { defineProps } from "vue";

defineProps({
  message: {
    type: String,
    default: "Loading...",
  },
});
</script>

<style scoped>
/* Common base styles, originally from .empty-state, .loading-state */
.loading-state {
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

/* LoadingState.vue specific */
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(110, 65, 226, 0.2); /* Light theme spinner color */
  border-top-color: var(--primary-color); /* Light theme spinner top color */
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Dark theme specific adjustments for spinner */
:deep(html[data-theme="dark"]) .spinner {
  border-color: rgba(139, 104, 240, 0.2); /* Dark theme spinner color */
  border-top-color: var(--primary-light); /* Dark theme spinner top color */
}

/* The <p> message styling is inherited or default, no specific rule in dashboard.css */
</style>
