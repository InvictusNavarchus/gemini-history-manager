<template>
  <div class="empty-state">
    <div class="empty-icon">{{ icon }}</div>
    <h3>{{ title }}</h3>
    <p>{{ message }}</p>
    <slot></slot>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';

defineProps({
  icon: {
    type: String,
    default: '📋'
  },
  title: {
    type: String,
    default: 'No Data Found'
  },
  message: {
    type: String,
    default: 'There is no data available to display.'
  }
});
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
  color: var(--text-light);
  height: 100%;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0;
  margin-bottom: 0.5rem;
  color: var(--text-color);
}

.empty-state p {
  margin: 0;
  margin-bottom: 1.5rem;
  max-width: 300px;
}
</style>
