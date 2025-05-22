/**
 * Gemini History Manager - Plan Distribution Chart
 * Function for plan distribution visualization in the Dashboard
 */
import { Logger } from "../../lib/utils.js";
import { getChartJsThemeOptions, getPlanColor } from "./chartHelpers.js";

/**
 * Generate configuration for plan distribution chart
 * @param {Array} historyData - History data array
 * @param {string} theme - Current theme ('light' or 'dark')
 * @returns {Object} Chart.js configuration
 */
export function getPlanDistributionChartConfig(historyData, theme) {
  Logger.log(
    "chartHelpers",
    `Generating plan distribution chart with ${historyData.length} entries and theme: ${theme}`
  );

  const planCounts = historyData.reduce((acc, entry) => {
    const plan = entry.geminiPlan || "Unknown";
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {});

  Logger.debug("chartHelpers", `Plan distribution data: ${JSON.stringify(planCounts)}`);

  // Sort by count in descending order
  const sortedEntries = Object.entries(planCounts).sort((a, b) => b[1] - a[1]);
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
          backgroundColor: labels.map((plan, index) => getPlanColor(plan, index)),
          borderColor: labels.map((plan, index) => getPlanColor(plan, index).replace("0.8", "1")),
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
