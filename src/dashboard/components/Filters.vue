<template>
  <div class="filters-section">
    <h2>Filters</h2>
    <div class="filter-group">
      <label for="modelFilter">Model</label>
      <select 
        id="modelFilter" 
        :value="selectedModelFilter" 
        @change="$emit('update:selectedModelFilter', $event.target.value)"
      >
        <option value="">All Models</option>
        <option v-for="model in availableModels" :key="model" :value="model">{{ model }}</option>
      </select>
    </div>
    <div class="filter-group">
      <label for="dateFilter">Date Range</label>
      <select 
        id="dateFilter" 
        :value="selectedDateFilter" 
        @change="handleDateFilterChange($event.target.value)"
      >
        <option value="all">All Time</option>
        <option value="today">Today</option>
        <option value="yesterday">Yesterday</option>
        <option value="thisWeek">This Week</option>
        <option value="thisMonth">This Month</option>
        <option value="custom">Custom Range</option>
      </select>
    </div>
    <div v-if="selectedDateFilter === 'custom'" class="filter-group date-range">
      <div class="date-input">
        <label for="startDate">Start Date</label>
        <input 
          type="date" 
          id="startDate" 
          :value="customStartDate" 
          @change="$emit('update:customStartDate', $event.target.value)"
        >
      </div>
      <div class="date-input">
        <label for="endDate">End Date</label>
        <input 
          type="date" 
          id="endDate" 
          :value="customEndDate" 
          @change="$emit('update:customEndDate', $event.target.value)"
        >
      </div>
    </div>
    <div class="filter-group">
      <label for="sortBy">Sort By</label>
      <select 
        id="sortBy" 
        :value="currentSortBy" 
        @change="$emit('update:currentSortBy', $event.target.value)"
      >
        <option value="date-desc">Date (Newest First)</option>
        <option value="date-asc">Date (Oldest First)</option>
        <option value="title-asc">Title (A-Z)</option>
        <option value="title-desc">Title (Z-A)</option>
      </select>
    </div>
    <button class="button reset-button" @click="$emit('reset-filters')">Reset All Filters</button>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

// Define props
defineProps({
  selectedModelFilter: {
    type: String,
    default: ''
  },
  selectedDateFilter: {
    type: String,
    default: 'all'
  },
  customStartDate: {
    type: String,
    default: ''
  },
  customEndDate: {
    type: String,
    default: ''
  },
  currentSortBy: {
    type: String,
    default: 'date-desc'
  },
  availableModels: {
    type: Array,
    default: () => []
  }
});

// Define emits
const emit = defineEmits([
  'update:selectedModelFilter',
  'update:selectedDateFilter',
  'update:customStartDate',
  'update:customEndDate',
  'update:currentSortBy',
  'filter-change',
  'reset-filters'
]);

// Event handlers
function handleDateFilterChange(value) {
  emit('update:selectedDateFilter', value);
  emit('filter-change');
}
</script>

<style scoped>
.filters-section {
  background-color: var(--card-bg);
  border-radius: 6px;
  padding: 1rem;
  box-shadow: var(--card-shadow);
}

.filters-section h2 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.2rem;
  color: var(--text-color);
}

.filter-group {
  margin-bottom: 1rem;
}

.filter-group label {
  display: block;
  margin-bottom: 0.35rem;
  color: var(--text-light);
  font-size: 0.85rem;
}

.filter-group select,
.filter-group input {
  width: 100%;
  padding: 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--input-bg);
  color: var(--text-color);
}

.filter-group select:focus,
.filter-group input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.date-range {
  display: flex;
  gap: 0.5rem;
}

.date-input {
  flex: 1;
}

.reset-button {
  width: 100%;
  margin-top: 0.5rem;
  background-color: var(--card-bg);
  color: var(--text-color);
  border: 1px solid var(--border-color);
}

.reset-button:hover {
  background-color: var(--hover-bg);
}
</style>
