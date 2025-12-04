import type { CommandLineResult } from '#~/__tests__/cypress/cypress/types';

const namespace = Cypress.env('APPLICATIONS_NAMESPACE');

/**
 * Enable Gen AI features by patching the DataScienceCluster and ODHDashboardConfig resources.
 * Sets LlamaStack operator to Managed and enables Gen AI Studio and Model as Service.
 *
 * @param waitTimeMs Time to wait after patching DSC for reconciliation (default: 10000ms)
 * @returns A Cypress chainable that resolves when both patches are applied successfully.
 */
export const enableGenAiFeatures = (waitTimeMs = 1000): Cypress.Chainable<CommandLineResult> => {
  cy.step('Set LlamaStack to Managed');
  return cy
    .exec(
      `oc patch datasciencecluster default-dsc --type=merge -p '{"spec":{"components": {"llamastackoperator":{"managementState":"Managed"}}}}'`,
    )
    .then(() => {
      cy.step(`Wait ${waitTimeMs}ms for DSC to reconcile`);
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      return cy.wait(waitTimeMs);
    })
    .then(() => {
      cy.step('Enable Gen AI Studio and Model as Service');
      return cy.exec(
        `oc patch odhdashboardconfig odh-dashboard-config -n ${namespace} --type merge -p '{"spec":{"dashboardConfig":{"genAiStudio":true, "modelAsService":true}}}'`,
      );
    });
};

/**
 * Disable Gen AI features by patching the DataScienceCluster and ODHDashboardConfig resources.
 * Sets LlamaStack operator to Removed and disables Gen AI Studio and Model as Service.
 *
 * @returns A Cypress chainable that resolves when both patches are applied successfully.
 */
export const disableGenAiFeatures = (): Cypress.Chainable<CommandLineResult> => {
  cy.step('Set LlamaStack to Removed');
  return cy
    .exec(
      `oc patch datasciencecluster default-dsc --type=merge -p '{"spec":{"components": {"llamastackoperator":{"managementState":"Removed"}}}}'`,
    )
    .then(() => {
      cy.step('Disable Gen AI Studio and Model as Service');
      return cy.exec(
        `oc patch odhdashboardconfig odh-dashboard-config -n ${namespace} --type merge -p '{"spec":{"dashboardConfig":{"genAiStudio":false, "modelAsService":false}}}'`,
      );
    });
};
