import { modelMetricsGlobal } from '#~/__tests__/cypress/cypress/pages/modelMetrics';

const verifyDefaultTimeRange = (expectedDefault: string): void => {
  modelMetricsGlobal.findMetricsToolbarTimeRangeSelect().click();
  cy.get(`[data-testid="${expectedDefault}"]`).within(() => {
    cy.get('button').should('have.attr', 'aria-selected', 'true');
  });
};

const verifyDefaultRefreshInterval = (expectedDefault: string): void => {
  modelMetricsGlobal.findMetricsToolbarRefreshIntervalSelect().click();
  cy.get(`[data-testid="${expectedDefault}"]`).within(() => {
    cy.get('button').should('have.attr', 'aria-selected', 'true');
  });
};

const verifyAllChartsAvailable = (): void => {
  cy.log('Verifying all expected charts are available on metrics page');

  // Use the page object method to get all metrics charts
  modelMetricsGlobal
    .getAllMetricsCharts()
    .should('have.length.greaterThan', 0)
    .should('be.visible');

  cy.log('✅ All metrics charts are available and visible');
};

export { verifyDefaultTimeRange, verifyDefaultRefreshInterval, verifyAllChartsAvailable };
