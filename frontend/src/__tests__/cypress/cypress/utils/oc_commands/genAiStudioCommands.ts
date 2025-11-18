import type { CommandLineResult } from '#~/__tests__/cypress/cypress/types';

/**
 * Enables GenAI Studio by patching the OdhDashboardConfig.
 * This function patches the odh-dashboard-config in the applications namespace
 * to enable the genAiStudio feature flag.
 *
 * @param namespace The namespace where the dashboard config is located (defaults to APPLICATIONS_NAMESPACE from test variables)
 * @returns A Cypress chainable that resolves to the command result
 */
export const enableGenAiStudio = (
  namespace?: string,
): Cypress.Chainable<CommandLineResult> => {
  const applicationsNamespace = namespace || Cypress.env('APPLICATIONS_NAMESPACE');
  const patchCommand = `oc patch odhdashboardconfig odh-dashboard-config -n ${applicationsNamespace} --type merge -p '{"spec":{"dashboardConfig":{"genAiStudio":true}}}'`;

  return cy.exec(patchCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      throw new Error(`Failed to enable GenAI Studio: ${result.stderr}`);
    }
    return result;
  });
};

/**
 * Disables GenAI Studio by patching the OdhDashboardConfig.
 * This function patches the odh-dashboard-config in the applications namespace
 * to disable the genAiStudio feature flag.
 *
 * @param namespace The namespace where the dashboard config is located (defaults to APPLICATIONS_NAMESPACE from test variables)
 * @returns A Cypress chainable that resolves to the command result
 */
export const disableGenAiStudio = (
  namespace?: string,
): Cypress.Chainable<CommandLineResult> => {
  const applicationsNamespace = namespace || Cypress.env('APPLICATIONS_NAMESPACE');
  const patchCommand = `oc patch odhdashboardconfig odh-dashboard-config -n ${applicationsNamespace} --type merge -p '{"spec":{"dashboardConfig":{"genAiStudio":false}}}'`;

  return cy.exec(patchCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      throw new Error(`Failed to disable GenAI Studio: ${result.stderr}`);
    }
    return result;
  });
};

/**
 * Checks if GenAI Studio is enabled by querying the OdhDashboardConfig.
 *
 * @param namespace The namespace where the dashboard config is located (defaults to APPLICATIONS_NAMESPACE from test variables)
 * @returns A Cypress chainable that resolves to true if GenAI Studio is enabled, false otherwise
 */
export const isGenAiStudioEnabled = (
  namespace?: string,
): Cypress.Chainable<boolean> => {
  const applicationsNamespace = namespace || Cypress.env('APPLICATIONS_NAMESPACE');
  const checkCommand = `oc get odhdashboardconfig odh-dashboard-config -n ${applicationsNamespace} -o jsonpath='{.spec.dashboardConfig.genAiStudio}'`;

  return cy.exec(checkCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      return false;
    }
    const isEnabled = result.stdout.trim() === 'true';
    return isEnabled;
  });
};

