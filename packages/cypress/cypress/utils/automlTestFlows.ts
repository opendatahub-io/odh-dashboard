import { automlConfigurePage } from '../pages/automl';

/**
 * Verifies the default optimization metric, opens the metric modal,
 * selects a different metric, saves, and verifies the change.
 */
export function verifyAndChangeOptimizationMetric(
  defaultLabel: string,
  changedKey: string,
  changedLabel: string,
): void {
  cy.step('Verify optimization metric defaults correctly');
  automlConfigurePage.findOptimizationMetricValue().should('contain', defaultLabel);

  cy.step('Change optimization metric via modal');
  automlConfigurePage.findOptimizationMetricEditButton().click();
  automlConfigurePage.findOptimizationMetricModal().should('be.visible');
  automlConfigurePage.findEvalMetricRadio(changedKey).click();
  automlConfigurePage.findOptimizationMetricSaveButton().click();
  automlConfigurePage.findOptimizationMetricValue().should('contain', changedLabel);
}
