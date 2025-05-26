<template>
  <div class="filters-section">
    <h2>Filters</h2>
    <div class="filter-group">
      <label for="modelFilter">Model</label>
      <select id="modelFilter" :value="selectedModelFilter" @change="handleModelFilterChange($event)">
        <option value="">All Models</option>
        <option v-for="model in availableModels" :key="model" :value="model">{{ model }}</option>
      </select>
    </div>
    <div class="filter-group">
      <label for="planFilter">Gemini Plan</label>
      <select id="planFilter" :value="selectedPlanFilter" @change="handlePlanFilterChange($event)">
        <option value="">All Plans</option>
        <option v-for="plan in availablePlans" :key="plan" :value="plan">{{ plan }}</option>
      </select>
    </div>
    <div class="filter-group">
      <label for="gemFilter">Gem</label>
      <select id="gemFilter" :value="selectedGemFilter" @change="handleGemFilterChange($event)">
        <option value="">All Conversations</option>
        <option value="hasGem">Gem Conversations Only</option>
        <option v-for="gem in availableGems" :key="gem" :value="gem">{{ gem }}</option>
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
        />
      </div>
      <div class="date-input">
        <label for="endDate">End Date</label>
        <input
          type="date"
          id="endDate"
          :value="customEndDate"
          @change="handleCustomDateChange(false, $event)"
        />
      </div>
    </div>
    <div class="filter-group">
      <label for="sortBy">Sort By</label>
      <select id="sortBy" :value="currentSortBy" @change="handleSortChange($event)">
        <option value="relevance">Relevance</option>
        <option value="date-desc">Newest First</option>
        <option value="date-asc">Oldest First</option>
        <option value="title-asc">Title (A-Z)</option>
        <option value="title-desc">Title (Z-A)</option>
      </select>
    </div>
    <button class="button reset-button" @click="resetAllFilters">Reset All Filters</button>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, onMounted, watch, computed } from "vue";
import { Logger } from "../../lib/utils.js";

// Define props
const props = defineProps({
  selectedModelFilter: {
    type: String,
    default: "",
  },
  selectedPlanFilter: {
    type: String,
    default: "",
  },
  selectedGemFilter: {
    type: String,
    default: "",
  },
  selectedDateFilter: {
    type: String,
    default: "all",
  },
  customStartDate: {
    type: String,
    default: "",
  },
  customEndDate: {
    type: String,
    default: "",
  },
  currentSortBy: {
    type: String,
    default: "date-desc",
  },
  availableModels: {
    type: Array,
    default: () => [],
  },
  availablePlans: {
    type: Array,
    default: () => [],
  },
  availableGems: {
    type: Array,
    default: () => [],
  },
  hasSearchQuery: {
    type: Boolean,
    default: false,
  },
});

// Define emits
const emit = defineEmits([
  "update:selectedModelFilter",
  "update:selectedPlanFilter",
  "update:selectedGemFilter",
  "update:selectedDateFilter",
  "update:customStartDate",
  "update:customEndDate",
  "update:currentSortBy",
  "filter-change",
  "reset-filters",
]);

// Component lifecycle
onMounted(() => {
  Logger.debug("Filters", "Component mounted", {
    initialModelFilter: props.selectedModelFilter,
    initialDateFilter: props.selectedDateFilter,
    initialSortBy: props.currentSortBy,
    availableModels: props.availableModels.length,
  });
});

// Watch for changes to input props
watch(
  () => props.availableModels,
  (newModels) => {
    Logger.debug("Filters", "Available models updated", {
      count: newModels.length,
      models: newModels,
    });
  }
);

// Track active filtering state
const hasActiveFilters = computed(() => {
  return (
    props.selectedModelFilter !== "" ||
    props.selectedPlanFilter !== "" ||
    props.selectedGemFilter !== "" ||
    props.selectedDateFilter !== "all" ||
    props.currentSortBy !== "date-desc"
  );
});

// Event handlers
function handleDateFilterChange(value) {
  Logger.log("Filters", "Date filter changed by user", {
    from: props.selectedDateFilter,
    to: value,
    requiresCustomDates: value === "custom",
  });

  emit("update:selectedDateFilter", value);
  emit("filter-change");

  if (value === "custom") {
    Logger.debug("Filters", "Custom date range selected, using dates", {
      startDate: props.customStartDate || "not set",
      endDate: props.customEndDate || "not set",
    });
  }
}

// Handle model filter changes
function handleModelFilterChange(event) {
  const newValue = event.target.value;
  Logger.log("Filters", "Model filter changed by user", {
    from: props.selectedModelFilter,
    to: newValue,
  });

  emit("update:selectedModelFilter", newValue);
  emit("filter-change");
}

// Handle plan filter changes
function handlePlanFilterChange(event) {
  const newValue = event.target.value;
  Logger.log("Filters", "Plan filter changed by user", {
    from: props.selectedPlanFilter,
    to: newValue,
  });

  emit("update:selectedPlanFilter", newValue);
  emit("filter-change");
}

// Handle gem filter changes
function handleGemFilterChange(event) {
  const newValue = event.target.value;
  Logger.log("Filters", "Gem filter changed by user", {
    from: props.selectedGemFilter,
    to: newValue,
  });

  emit("update:selectedGemFilter", newValue);
  emit("filter-change");
}

// --- Dynamic Sort State ---
// Track if user manually changed sort during search
let userSortDuringSearch = false;
let sortBeforeSearch = null;

// Watch for search state changes
watch(
  () => props.hasSearchQuery,
  (hasSearch, prevHasSearch) => {
    if (hasSearch && !prevHasSearch) {
      // Search started: Save previous sort and auto-switch to relevance if not already set
      sortBeforeSearch = props.currentSortBy;
      userSortDuringSearch = false;
      if (props.currentSortBy !== "relevance") {
        emit("update:currentSortBy", "relevance");
        emit("filter-change");
      }
    } else if (!hasSearch && prevHasSearch) {
      // Search cleared: revert to 'Newest' unless user changed sort during search
      if (!userSortDuringSearch) {
        emit("update:currentSortBy", "date-desc");
        emit("filter-change");
      }
      userSortDuringSearch = false;
      sortBeforeSearch = null;
    }
  }
);

// Handle sort order changes
function handleSortChange(event) {
  const newValue = event.target.value;
  Logger.log("Filters", "Sort order changed by user", {
    from: props.currentSortBy,
    to: newValue,
  });

  // If search is active and user changes sort, flag it
  if (props.hasSearchQuery && newValue !== "relevance") {
    userSortDuringSearch = true;
  }
  emit("update:currentSortBy", newValue);
  emit("filter-change");
}

// Handle custom date range changes
function handleCustomDateChange(isStartDate, event) {
  const dateType = isStartDate ? "start" : "end";
  const newDate = event.target.value;

  Logger.log("Filters", `Custom ${dateType} date changed`, {
    newValue: newDate,
  });

  if (isStartDate) {
    emit("update:customStartDate", newDate);
  } else {
    emit("update:customEndDate", newDate);
  }

  emit("filter-change");
}

// Handle filter reset
function resetAllFilters() {
  Logger.log("Filters", "User reset all filters", {
    previousModelFilter: props.selectedModelFilter,
    previousDateFilter: props.selectedDateFilter,
    previousSortOrder: props.currentSortBy,
  });

  emit("reset-filters");
}
</script>

<style scoped>
/* Filters section styling, assuming the root div of this component has class="filters-section" */
.filters-section {
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: var(--shadow);
  padding: 15px;
  /* Removed margin-bottom as sidebar handles spacing if this component is placed in a sidebar */
}

/* Styling for the h2 tag within this component */
h2 {
  font-size: 16px;
  margin-bottom: 15px;
  color: var(--text-color);
}

.filter-group {
  margin-bottom: 12px;
}

.filter-group label {
  display: block;
  font-size: 13px;
  margin-bottom: 5px;
  color: var(--text-light);
}

.filter-group select,
.filter-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 14px;
  background-color: var(--input-bg);
  color: var(--text-color);
}

.filter-group select:focus,
.filter-group input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.date-range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

/* Additional styling for the reset button if needed, assuming .button is global */
.reset-button {
  width: 100%;
  margin-top: 5px; /* Add some space above the reset button */
  background-color: var(--hover-bg); /* Slightly different background */
  border-color: var(--border-color);
  color: var(--text-light);
}

.reset-button:hover {
  background-color: var(--border-color);
  color: var(--text-color);
}
</style>
