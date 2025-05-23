<template>
  <div class="stats-container">
    <div class="stat-card">
      <h3>Total Conversations</h3>
      <div class="stat-value">{{ totalConversations }}</div>
    </div>
    <div class="stat-card">
      <h3>Most Used Model</h3>
      <div class="stat-value">{{ mostUsedModelText }}</div>
    </div>
    <div class="stat-card">
      <h3>Last Conversation</h3>
      <div class="stat-value">{{ lastConversationTimeText }}</div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from "vue";

defineProps({
  totalConversations: {
    type: Number,
    default: 0,
  },
  mostUsedModelText: {
    type: String,
    default: "-",
  },
  lastConversationTimeText: {
    type: String,
    default: "-",
  },
});
</script>

<style scoped>
/* Stats cards */
.stats-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stat-card {
  background-color: var(--card-bg);
  border-radius: 6px;
  box-shadow: var(--shadow);
  padding: 12px;
  text-align: center;
}

.stat-card h3 {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-light);
  margin-bottom: 6px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--primary-color);
}
</style>
