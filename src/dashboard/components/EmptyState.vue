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
