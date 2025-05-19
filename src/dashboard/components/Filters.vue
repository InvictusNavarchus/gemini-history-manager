<template>
  <div class="filters-section">
    <h2>Filters</h2>
    <div class="filter-group">
      <label for="modelFilter">Model</label>
      <select 
        id="modelFilter" 
        :value="selectedModelFilter" 
        @change="handleModelFilterChange($event)"
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
          @change="handleCustomDateChange(true, $event)"
        >
      </div>
      <div class="date-input">
        <label for="endDate">End Date</label>
        <input 
          type="date" 
          id="endDate" 
          :value="customEndDate" 
          @change="handleCustomDateChange(false, $event)"
        >
      </div>
    </div>
    <div class="filter-group">
      <label for="sortBy">Sort By</label>
      <select 
        id="sortBy" 
        :value="currentSortBy" 
        @change="handleSortChange($event)"
      >
        <option value="date-desc">Date (Newest First)</option>
        <option value="date-asc">Date (Oldest First)</option>
        <option value="title-asc">Title (A-Z)</option>
        <option value="title-desc">Title (Z-A)</option>
      </select>
    </div>
    <button class="button reset-button" @click="resetAllFilters">Reset All Filters</button>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, onMounted, watch, computed } from 'vue';
import { Logger } from '../../lib/utils.js';

// Define props
const props = defineProps({
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

// Component lifecycle
onMounted(() => {
  Logger.debug("Filters", "Component mounted", {
    initialModelFilter: props.selectedModelFilter,
    initialDateFilter: props.selectedDateFilter,
    initialSortBy: props.currentSortBy,
    availableModels: props.availableModels.length
  });
});

// Watch for changes to input props
watch(() => props.availableModels, (newModels) => {
  Logger.debug("Filters", "Available models updated", { 
    count: newModels.length,
    models: newModels
  });
});

// Track active filtering state
const hasActiveFilters = computed(() => {
  return props.selectedModelFilter !== '' || 
         props.selectedDateFilter !== 'all' || 
         props.currentSortBy !== 'date-desc';
});

// Event handlers
function handleDateFilterChange(value) {
  Logger.log("Filters", "Date filter changed by user", { 
    from: props.selectedDateFilter, 
    to: value,
    requiresCustomDates: value === 'custom'
  });
  
  emit('update:selectedDateFilter', value);
  emit('filter-change');
  
  if (value === 'custom') {
    Logger.debug("Filters", "Custom date range selected, using dates", {
      startDate: props.customStartDate || 'not set',
      endDate: props.customEndDate || 'not set'
    });
  }
}

// Handle model filter changes
function handleModelFilterChange(event) {
  const newValue = event.target.value;
  Logger.log("Filters", "Model filter changed by user", {
    from: props.selectedModelFilter,
    to: newValue
  });
  
  emit('update:selectedModelFilter', newValue);
  emit('filter-change');
}

// Handle sort order changes
function handleSortChange(event) {
  const newValue = event.target.value;
  Logger.log("Filters", "Sort order changed by user", {
    from: props.currentSortBy,
    to: newValue
  });
  
  emit('update:currentSortBy', newValue);
  emit('filter-change');
}

// Handle custom date range changes
function handleCustomDateChange(isStartDate, event) {
  const dateType = isStartDate ? 'start' : 'end';
  const newDate = event.target.value;
  
  Logger.log("Filters", `Custom ${dateType} date changed`, {
    newValue: newDate
  });
  
  if (isStartDate) {
    emit('update:customStartDate', newDate);
  } else {
    emit('update:customEndDate', newDate);
  }
  
  emit('filter-change');
}

// Handle filter reset
function resetAllFilters() {
  Logger.log("Filters", "User reset all filters", {
    previousModelFilter: props.selectedModelFilter,
    previousDateFilter: props.selectedDateFilter,
    previousSortOrder: props.currentSortBy
  });
  
  emit('reset-filters');
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
