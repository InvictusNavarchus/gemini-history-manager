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
        <h3>Most Used Plan</h3>
        <div class="stat-value">{{ stats.mostUsedPlan }}</div>
        <div class="stat-subtext">{{ stats.mostUsedPlanCount }}</div>
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
import { defineProps } from "vue";

defineProps({
  stats: {
    type: Object,
    default: () => ({
      totalConversations: 0,
      mostUsedModel: "-",
      mostUsedModelCount: "",
      mostUsedPlan: "-",
      mostUsedPlanCount: "",
      firstConversationTime: "-",
      lastConversationTime: "-",
      avgTitleLength: "-",
      totalFilesUploaded: 0,
    }),
  },
});
</script>

<style scoped>
/* Styles for the stats section, now scoped to StatsOverview.vue */
.stats-section {
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: var(--shadow);
  padding: 15px;
  /* Removed margin-bottom as component placement will determine spacing */
}

.stats-section h2 {
  font-size: 16px;
  margin-bottom: 15px;
  color: var(--text-color);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); /* More responsive */
  gap: 12px;
}

.stat-card {
  padding: 10px;
  background-color: var(--bg-color); /* This uses --bg-color, not --card-bg */
  border-radius: 6px;
  text-align: center;
}

.stat-card h3 {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-light);
  margin-bottom: 5px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--primary-color);
}

.stat-subtext {
  font-size: 11px;
  color: var(--text-lighter);
  margin-top: 2px;
}

/* Responsive adjustments */
@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); /* Adjust for smaller screens */
  }
}

@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  }
}
</style>
