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


