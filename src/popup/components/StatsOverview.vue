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
import { defineProps } from 'vue';

defineProps({
  totalConversations: {
    type: Number,
    default: 0
  },
  mostUsedModelText: {
    type: String,
    default: '-'
  },
  lastConversationTimeText: {
    type: String,
    default: '-'
  }
});
</script>

<style scoped>
.stats-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 15px 0;
  padding: 0 10px;
}

.stat-card {
  background-color: var(--card-bg);
  border-radius: 6px;
  padding: 12px;
  text-align: center;
  box-shadow: var(--card-shadow);
}

.stat-card h3 {
  font-size: 12px;
  color: var(--text-light);
  margin: 0 0 6px 0;
  font-weight: normal;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
