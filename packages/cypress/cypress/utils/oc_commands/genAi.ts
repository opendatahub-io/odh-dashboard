import { waitForNamespace } from './baseCommands';
import { waitForLlamaStackOperatorReady } from './llamaStackDistribution';
import type { CommandLineResult } from '../../types';

// Resource identifiers
const DSC_RESOURCE = 'datasciencecluster default-dsc';
const DASHBOARD_CONFIG = 'odhdashboardconfig odh-dashboard-config';

/**
 * Get the applications namespace from Cypress environment.
 * @throws Error if APPLICATIONS_NAMESPACE is not configured.
 */
const getApplicationsNamespace = (): string => {
  const namespace = Cypress.env('APPLICATIONS_NAMESPACE');
  if (!namespace) {
    throw new Error(
      'APPLICATIONS_NAMESPACE is not configured. Set CY_TEST_CONFIG to point to your test-variables.yml file.',
    );
  }
  return namespace;
};

/**
 * Build an oc patch command with JSON merge strategy.
 */
const buildPatchCommand = (resource: string, patchJson: object, namespace?: string): string => {
  const namespaceFlag = namespace ? ` -n ${namespace}` : '';
  return `oc patch ${resource}${namespaceFlag} --type=merge -p '${JSON.stringify(patchJson)}'`;
};

/**
 * Set the LlamaStack operator management state.
 */
const setLlamaStackState = (state: 'Managed' | 'Removed'): Cypress.Chainable<CommandLineResult> => {
  const patchSpec = { spec: { components: { llamastackoperator: { managementState: state } } } };
  return cy.exec(buildPatchCommand(DSC_RESOURCE, patchSpec));
};

/**
 * Set the Gen AI Studio enabled/disabled state in the dashboard config.
 */
const setGenAiStudioEnabled = (
  enabled: boolean,
  namespace: string,
): Cypress.Chainable<CommandLineResult> => {
  const patchSpec = { spec: { dashboardConfig: { genAiStudio: enabled } } };
  return cy.exec(buildPatchCommand(DASHBOARD_CONFIG, patchSpec, namespace));
};

/**
 * Enable Gen AI features by patching the DataScienceCluster and ODHDashboardConfig resources.
 * Sets LlamaStack operator to Managed, waits for the operator to be ready,
 * waits for the namespace, and enables Gen AI Studio.
 *
 * @returns A Cypress chainable that resolves when all setup is complete.
 */
export const enableGenAiFeatures = (): Cypress.Chainable<CommandLineResult> => {
  const namespace = getApplicationsNamespace();

  cy.step('Set LlamaStack to Managed');
  return setLlamaStackState('Managed')
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
      return setGenAiStudioEnabled(true, namespace);
    });
};

/**
 * Disable Gen AI features by patching the DataScienceCluster and ODHDashboardConfig resources.
 * Sets LlamaStack operator to Removed and disables Gen AI Studio and Model as Service.
 *
 * @returns A Cypress chainable that resolves when both patches are applied successfully.
 */
export const disableGenAiFeatures = (): Cypress.Chainable<CommandLineResult> => {
  const namespace = getApplicationsNamespace();

  cy.step('Set LlamaStack to Removed');
  return setLlamaStackState('Removed').then(() => {
    cy.step('Disable Gen AI Studio');
    return setGenAiStudioEnabled(false, namespace);
  });
};

/**
 * Cleanup serving runtime template by ServingRuntime name.
 * Searches for templates containing a ServingRuntime with the given name.
 *
 * @param servingRuntimeName - The ServingRuntime metadata.name to search for inside templates.
 * @returns A Cypress chainable that resolves when cleanup is complete.
 */
export const cleanupServingRuntimeTemplate = (
  servingRuntimeName: string,
): Cypress.Chainable<CommandLineResult> => {
  const namespace = getApplicationsNamespace();

  const jqFilter = `.items[] | select(.objects[]? | select(.kind == "ServingRuntime" and .metadata.name == "${servingRuntimeName}")) | .metadata.name`;
  const findCommand = `oc get templates -ojson -n ${namespace} | jq -r '${jqFilter}'`;

  cy.log(`Searching for template with ServingRuntime: ${servingRuntimeName}`);

  return cy.exec(findCommand, { failOnNonZeroExit: false }).then((result) => {
    const templateName = result.stdout.trim();

    if (templateName) {
      cy.log(`Template found: ${templateName}. Proceeding to delete.`);
      return cy.exec(`oc delete template ${templateName} -n ${namespace}`, {
        failOnNonZeroExit: false,
      });
    }

    cy.log('No matching serving runtime template found.');
    return cy.wrap(result);
  });
};
