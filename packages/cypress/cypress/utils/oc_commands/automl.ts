import { pollUntilSuccess } from './baseCommands';
import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

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
const buildPatchCommand = (resource: string, patchJson: object, namespace: string): string => {
  return `oc patch ${resource} -n ${namespace} --type=merge -p '${JSON.stringify(patchJson)}'`;
};

/**
 * Enable the AutoML feature flag in OdhDashboardConfig.
 * Patches the dashboard config and polls until the flag is confirmed true.
 */
export const enableAutomlFeature = (): Cypress.Chainable<Cypress.Exec> => {
  const namespace = getApplicationsNamespace();
  const patchSpec = { spec: { dashboardConfig: { automl: true } } };

  cy.step('Enable AutoML feature flag');
  return cy.exec(buildPatchCommand(DASHBOARD_CONFIG, patchSpec, namespace)).then((result) => {
    if (result.code !== 0) {
      const maskedStderr = maskSensitiveInfo(result.stderr);
      throw new Error(`Failed to enable AutoML feature flag: ${maskedStderr}`);
    }

    cy.step('Wait for automl feature flag to be set');
    return pollUntilSuccess(
      `oc get OdhDashboardConfig -A -o json | jq -e '.items[].spec.dashboardConfig.automl == true'`,
      'automl feature flag to be true',
      { maxAttempts: 30, pollIntervalMs: 2000 },
    );
  });
};

/**
 * Disable the AutoML feature flag in OdhDashboardConfig.
 */
export const disableAutomlFeature = (): Cypress.Chainable<CommandLineResult> => {
  const namespace = getApplicationsNamespace();
  const patchSpec = { spec: { dashboardConfig: { automl: false } } };

  cy.step('Disable AutoML feature flag');
  return cy.exec(buildPatchCommand(DASHBOARD_CONFIG, patchSpec, namespace)).then((result) => {
    if (result.code !== 0) {
      const maskedStderr = maskSensitiveInfo(result.stderr);
      throw new Error(`Failed to disable AutoML feature flag: ${maskedStderr}`);
    }
    return result;
  });
};
