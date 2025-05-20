/**
 * Gemini History Manager - Dashboard Chart Helpers
 * Functions for chart visualization in the Dashboard
 */
import { parseTimestamp, Logger } from "../../lib/utils.js";
import dayjs from "dayjs";

// Chart colors
export const CHART_COLORS = [
  "rgba(110, 65, 226, 0.8)", // Primary purple
  "rgba(71, 163, 255, 0.8)", // Blue
  "rgba(0, 199, 176, 0.8)", // Teal
  "rgba(255, 167, 38, 0.8)", // Orange
  "rgba(239, 83, 80, 0.8)", // Red
  "rgba(171, 71, 188, 0.8)", // Pink
];

/**
 * Get theme-specific options for Chart.js
 * @param {string} theme - Current theme ('light' or 'dark')
 * @returns {Object} Theme options for Chart.js
 */
export function getChartJsThemeOptions(theme) {
  Logger.debug("chartHelpers", `Generating chart theme options for theme: ${theme}`);

  const isDark = theme === "dark";
  const textColor = isDark ? "#e0e0e0" : "#333";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";

  Logger.debug("chartHelpers", `Chart theme settings: textColor=${textColor}, gridColor=${gridColor}`);
  return { textColor, gridColor };
}

/**
 * Generate configuration for model distribution chart
 * @param {Array} historyData - History data array
 * @param {string} theme - Current theme ('light' or 'dark')
 * @returns {Object} Chart.js configuration
 */
export function getModelDistributionChartConfig(historyData, theme) {
  Logger.log(
    "chartHelpers",
    `Generating model distribution chart with ${historyData.length} entries and theme: ${theme}`
  );

  const modelCounts = historyData.reduce((acc, entry) => {
    const model = entry.model || "Unknown";
    acc[model] = (acc[model] || 0) + 1;
    return acc;
  }, {});

  Logger.debug("chartHelpers", `Model distribution data: ${JSON.stringify(modelCounts)}`);

  // Sort by count in descending order
  const sortedEntries = Object.entries(modelCounts).sort((a, b) => b[1] - a[1]);
  const labels = sortedEntries.map((entry) => entry[0]);
  const data = sortedEntries.map((entry) => entry[1]);
  Logger.debug("chartHelpers", `Chart labels: ${labels.join(", ")}`);

  const { textColor, gridColor } = getChartJsThemeOptions(theme);

  return {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Conversations",
          data,
          backgroundColor: CHART_COLORS.slice(0, data.length),
          borderColor: CHART_COLORS.map((color) => color.replace("0.8", "1")),
          borderWidth: 1,
          maxBarThickness: 50,
        },
      ],
    },
    options: {
      indexAxis: "y", // This makes the bars horizontal
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          beginAtZero: true,
          grid: {
            color: gridColor,
          },
          ticks: {
            color: textColor,
            precision: 0,
          },
          title: {
            display: true,
            text: "Number of Conversations",
            color: textColor,
          },
        },
        y: {
          grid: {
            color: gridColor,
          },
          ticks: {
            color: textColor,
          },
        },
      },
      plugins: {
        legend: {
          display: false, // Hide legend as it's redundant for this chart
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.raw || 0;
              const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value * 100) / total);
              return `${value} conversations (${percentage}%)`;
            },
          },
        },
      },
    },
  };
}

/**
 * Generate configuration for activity over time chart
 * @param {Array} historyData - History data array
 * @param {Array} availableModels - List of unique models
 * @param {Object} chartOptions - Chart configuration options
 * @param {string} chartOptions.displayMode - Display mode ('combined' or 'separate')
 * @param {string} chartOptions.selectedModel - Selected model for filtering ('all' or specific model name)
 * @param {string} theme - Current theme ('light' or 'dark')
 * @returns {Object} Chart.js configuration
 */
export function getActivityOverTimeChartConfig(historyData, availableModels, chartOptions, theme) {
  Logger.log("chartHelpers", `Generating activity over time chart with ${historyData.length} entries`);
  Logger.debug(
    "chartHelpers",
    `Chart options: ${JSON.stringify({
      displayMode: chartOptions.displayMode,
      selectedModel: chartOptions.selectedModel,
      availableModels: availableModels.join(", "),
      theme,
    })}`
  );

  const { textColor, gridColor } = getChartJsThemeOptions(theme);
  const displayMode = chartOptions.displayMode;
  const selectedModelForChart = chartOptions.selectedModel;

  // Calculate date ranges
  const dateGroups = {};
  const modelDateGroups = {};
  availableModels.forEach((model) => (modelDateGroups[model] = {}));

  historyData.forEach((entry) => {
    const timestamp = parseTimestamp(entry.timestamp);
    if (!timestamp.isValid()) return;

    const dateKey = timestamp.format("YYYY-MM-DD");
    const model = entry.model || "Unknown";

    // For combined chart
    dateGroups[dateKey] = (dateGroups[dateKey] || 0) + 1;

    // For separate by model chart
    if (!modelDateGroups[model]) modelDateGroups[model] = {};
    modelDateGroups[model][dateKey] = (modelDateGroups[model][dateKey] || 0) + 1;
  });

  // Sort dates and fill in missing dates
  const sortedDates = Object.keys(dateGroups).sort((a, b) => dayjs(a).valueOf() - dayjs(b).valueOf());
  Logger.debug(
    "chartHelpers",
    `Raw date range: ${
      sortedDates.length > 0
        ? `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`
        : "No dates found"
    }`
  );

  const filledDateGroups = {};

  if (sortedDates.length > 0) {
    // Fill in any missing dates in the range
    const startDate = dayjs(sortedDates[0]);
    const endDate = dayjs(sortedDates[sortedDates.length - 1]);
    Logger.debug(
      "chartHelpers",
      `Filling date range from ${startDate.format("YYYY-MM-DD")} to ${endDate.format("YYYY-MM-DD")}`
    );

    let currentDate = startDate;
    while (currentDate.isSameOrBefore(endDate)) {
      const dateKey = currentDate.format("YYYY-MM-DD");

      // For combined chart
      filledDateGroups[dateKey] = dateGroups[dateKey] || 0;

      // For separate by model chart
      availableModels.forEach((model) => {
        if (!modelDateGroups[model]) modelDateGroups[model] = {};
        modelDateGroups[model][dateKey] = modelDateGroups[model][dateKey] || 0;
      });

      currentDate = currentDate.add(1, "day");
    }

    Logger.debug(
      "chartHelpers",
      `Successfully filled date range with ${Object.keys(filledDateGroups).length} days`
    );
  } else {
    Logger.warn("chartHelpers", "No dates found in history data for chart");
  }

  const finalSortedDates = Object.keys(filledDateGroups).sort(
    (a, b) => dayjs(a).valueOf() - dayjs(b).valueOf()
  );
  const displayDates = finalSortedDates.map((date) => dayjs(date).format("MMM D, YY"));
  Logger.debug("chartHelpers", `Final date range has ${finalSortedDates.length} days`);

  let datasets = [];
  Logger.debug(
    "chartHelpers",
    `Creating datasets with display mode: ${displayMode}, selected model: ${selectedModelForChart}`
  );

  if (displayMode === "combined" || !finalSortedDates.length) {
    // Combined mode shows all models together
    Logger.log("chartHelpers", "Creating combined dataset for all models");
    const combinedData = finalSortedDates.map((date) => filledDateGroups[date]);

    datasets = [
      {
        label: "All Conversations",
        data: combinedData,
        borderColor: CHART_COLORS[0],
        backgroundColor: CHART_COLORS[0].replace("0.8", "0.2"),
        fill: true,
        tension: 0.2,
        pointRadius: 3,
      },
    ];

    const totalConversations = combinedData.reduce((sum, count) => sum + count, 0);
    Logger.debug(
      "chartHelpers",
      `Combined dataset created with total of ${totalConversations} conversations`
    );
  } else {
    // 'separate'
    // Filter by selected model if needed
    if (selectedModelForChart === "all") {
      // Show all models separately
      Logger.log("chartHelpers", `Creating separate datasets for all ${availableModels.length} models`);

      datasets = availableModels.map((model, index) => {
        const modelData = finalSortedDates.map((date) => modelDateGroups[model][date] || 0);
        const totalForModel = modelData.reduce((sum, count) => sum + count, 0);
        Logger.debug("chartHelpers", `Dataset for model "${model}" has ${totalForModel} total conversations`);

        return {
          label: model,
          data: modelData,
          borderColor: CHART_COLORS[index % CHART_COLORS.length],
          backgroundColor: CHART_COLORS[index % CHART_COLORS.length].replace("0.8", "0.2"),
          fill: false, // multiple datasets look better without fill
          tension: 0.2,
          pointRadius: 3,
        };
      });

      Logger.log("chartHelpers", `Created ${datasets.length} separate model datasets`);
    } else {
      // Show only selected model
      Logger.log("chartHelpers", `Creating dataset for selected model: ${selectedModelForChart}`);
      const modelData = finalSortedDates.map(
        (date) =>
          (modelDateGroups[selectedModelForChart] && modelDateGroups[selectedModelForChart][date]) || 0
      );
      const totalForModel = modelData.reduce((sum, count) => sum + count, 0);

      datasets = [
        {
          label: selectedModelForChart,
          data: modelData,
          borderColor: CHART_COLORS[0],
          backgroundColor: CHART_COLORS[0].replace("0.8", "0.2"),
          fill: true,
          tension: 0.2,
          pointRadius: 3,
        },
      ];

      Logger.debug(
        "chartHelpers",
        `Dataset for "${selectedModelForChart}" has ${totalForModel} total conversations`
      );
    }
  }

  // Chart configuration
  Logger.log("chartHelpers", "Finalizing chart configuration");

  const chartConfig = {
    type: "line",
    data: {
      labels: displayDates,
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: gridColor,
          },
          ticks: {
            color: textColor,
            precision: 0,
          },
          title: {
            display: true,
            text: "Conversations",
            color: textColor,
          },
        },
        x: {
          grid: {
            color: gridColor,
          },
          ticks: {
            color: textColor,
          },
        },
      },
      plugins: {
        legend: {
          labels: {
            color: textColor,
          },
        },
        tooltip: {
          mode: "index",
          intersect: false,
        },
      },
    },
  };

  Logger.debug("chartHelpers", "Chart configuration created successfully");
  return chartConfig;
}
