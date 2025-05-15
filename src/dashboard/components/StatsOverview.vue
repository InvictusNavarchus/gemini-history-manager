<template>
  <div class="stats-section">
    <h2>Statistics</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total Conversations</h3>
        <div class="stat-value">{{ stats.totalConversations }}</div>
      </div>
      <div class="stat-card">
        <h3>Most Used Model</h3>
        <div class="stat-value">{{ stats.mostUsedModel }}</div>
        <div class="stat-subtext">{{ stats.mostUsedModelCount }}</div>
      </div>
      <div class="stat-card">
        <h3>First Conversation</h3>
        <div class="stat-value">{{ stats.firstConversationTime }}</div>
      </div>
      <div class="stat-card">
        <h3>Last Conversation</h3>
        <div class="stat-value">{{ stats.lastConversationTime }}</div>
      </div>
      <div class="stat-card">
        <h3>Average Title Length</h3>
        <div class="stat-value">{{ stats.avgTitleLength }} characters</div>
      </div>
      <div class="stat-card">
        <h3>Files Uploaded</h3>
        <div class="stat-value">{{ stats.totalFilesUploaded }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue';

defineProps({
  stats: {
    type: Object,
    default: () => ({
      totalConversations: 0,
      mostUsedModel: '-',
      mostUsedModelCount: '',
      firstConversationTime: '-',
      lastConversationTime: '-',
      avgTitleLength: '-',
      totalFilesUploaded: 0
    })
  }
});
</script>

<style scoped>
.stats-section {
  margin-bottom: 2rem;
}

.stats-section h2 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background-color: var(--card-bg);
  border-radius: 6px;
  padding: 1rem;
  box-shadow: var(--card-shadow);
}

.stat-card h3 {
  margin: 0;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-light);
  font-weight: normal;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color);
}

.stat-subtext {
  font-size: 0.8rem;
  color: var(--text-light);
  margin-top: 0.25rem;
}
</style>
