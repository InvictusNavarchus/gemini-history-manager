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
