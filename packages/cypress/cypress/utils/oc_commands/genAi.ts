import { waitForNamespace } from './baseCommands';
import { waitForLlamaStackOperatorReady } from './llamaStackDistribution';
import type { CommandLineResult } from '../../types';

/**
 * Enable Gen AI features by patching the DataScienceCluster and ODHDashboardConfig resources.
 * Sets LlamaStack operator to Managed, waits for the operator to be ready,
 * waits for the namespace, and enables Gen AI Studio.
 *
 * @returns A Cypress chainable that resolves when all setup is complete.
 */
export const enableGenAiFeatures = (): Cypress.Chainable<CommandLineResult> => {
  const namespace = Cypress.env('APPLICATIONS_NAMESPACE');
  if (!namespace) {
    throw new Error(
      'APPLICATIONS_NAMESPACE is not configured. Set CY_TEST_CONFIG to point to your test-variables.yml file.',
    );
  }

  cy.step('Set LlamaStack to Managed');
  return cy
    .exec(
      `oc patch datasciencecluster default-dsc --type=merge -p '{"spec":{"components": {"llamastackoperator":{"managementState":"Managed"}}}}'`,
    )
    .then(() => {
      cy.step('Wait for LlamaStack operator to be ready');
      return waitForLlamaStackOperatorReady();
    })
    .then(() => {
      cy.step(`Wait for namespace ${namespace} to be created`);
      return waitForNamespace(namespace);
    })
    .then(() => {
      cy.step('Enable Gen AI Studio');
      return cy.exec(
        `oc patch odhdashboardconfig odh-dashboard-config -n ${namespace} --type merge -p '{"spec":{"dashboardConfig":{"genAiStudio":true}}}'`,
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
  const namespace = Cypress.env('APPLICATIONS_NAMESPACE');
  if (!namespace) {
    throw new Error(
      'APPLICATIONS_NAMESPACE is not configured. Set CY_TEST_CONFIG to point to your test-variables.yml file.',
    );
  }

  cy.step('Set LlamaStack to Removed');
  return cy
    .exec(
      `oc patch datasciencecluster default-dsc --type=merge -p '{"spec":{"components": {"llamastackoperator":{"managementState":"Removed"}}}}'`,
    )
    .then(() => {
      cy.step('Disable Gen AI Studio and Model as Service');
      return cy.exec(
        `oc patch odhdashboardconfig odh-dashboard-config -n ${namespace} --type merge -p '{"spec":{"dashboardConfig":{"genAiStudio":false}}}'`,
      );
    });
};
