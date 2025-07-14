import {
  globalDistributedWorkloads,
  projectMetricsTab,
} from '#~/__tests__/cypress/cypress/pages/distributedWorkloads';

/**
 * Retrieves the list of available refresh interval options.
 * Clicks on the refresh interval dropdown and extracts the available options.
 *
 * @returns {Cypress.Chainable<string[]>} A Cypress chainable resolving to an array of refresh interval options.
 */
export const findRefreshIntervalList = (): Cypress.Chainable<string[]> => {
  globalDistributedWorkloads.findRefreshIntervalSelectToggle().click();

  return cy.get('button[role="option"]').then(($options) => {
    if ($options.length === 0) {
      cy.log('No refresh interval options found');
      return [];
    }

    return Cypress.$.makeArray($options).map((el) => Cypress.$(el).text().trim());
  });
};

/**
 * Verifies that the requested resources displayed in the UI match the expected values.
 * This function checks both CPU and Memory chart legends for correctness.
 *
 * @param {string} projectName - Name of the project being verified.
 * @param {number} cpuSharedQuota - Total CPU shared quota.
 * @param {number} memorySharedQuota - Total memory shared quota.
 * @param {number} cpuRequested - CPU requested by the project.
 * @param {number} memoryRequested - Memory requested by the project.
 */
export const verifyRequestedResources = (
  projectName: string,
  cpuSharedQuota: number,
  memorySharedQuota: number,
  cpuRequested: number,
  memoryRequested: number,
): void => {
  const memoryRequestedRound = Math.round(memoryRequested * 10) / 10;

  const chartLegendSelectors = {
    cpu: [
      `#requested-resources-chart-CPU-ChartLegend-ChartLabel-0`,
      `#requested-resources-chart-CPU-ChartLegend-ChartLabel-1`,
      `#requested-resources-chart-CPU-ChartLegend-ChartLabel-2`,
    ],
    memory: [
      `#requested-resources-chart-Memory-ChartLegend-ChartLabel-0`,
      `#requested-resources-chart-Memory-ChartLegend-ChartLabel-1`,
      `#requested-resources-chart-Memory-ChartLegend-ChartLabel-2`,
    ],
  };

  const expectedValues = {
    cpu: [
      `Requested by ${projectName}: ${cpuRequested}`,
      `Requested by all projects: ${cpuRequested}`,
      `Total shared quota: ${cpuSharedQuota}`,
    ],
    memory: [
      `Requested by ${projectName}: ${memoryRequestedRound}`,
      `Requested by all projects: ${memoryRequestedRound}`,
      `Total shared quota: ${memorySharedQuota}`,
    ],
  };

  // Verify CPU Chart Legends
  chartLegendSelectors.cpu.forEach((selector, index) => {
    projectMetricsTab.verifyChartLegend(selector, expectedValues.cpu[index]);
  });

  // Verify Memory Chart Legends
  chartLegendSelectors.memory.forEach((selector, index) => {
    projectMetricsTab.verifyChartLegend(selector, expectedValues.memory[index]);
  });
};
