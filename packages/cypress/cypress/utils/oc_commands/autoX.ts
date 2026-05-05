import { pollUntilSuccess } from './baseCommands';
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
 * Check whether the AutoML feature flag is currently enabled.
 */
export const isAutomlEnabled = (): Cypress.Chainable<boolean> =>
  cy
    .exec(
      `oc get OdhDashboardConfig -A -o json | jq -e '.items[].spec.dashboardConfig.automl == true'`,
      { failOnNonZeroExit: false },
    )
    .then((result) => result.code === 0);

/**
 * Set the AutoML feature flag in OdhDashboardConfig.
 * When enabling, polls until the flag is confirmed true.
 */
export const setAutomlEnabled = (enabled: boolean): Cypress.Chainable<Cypress.Exec> => {
  const namespace = getApplicationsNamespace();
  const patchSpec = { spec: { dashboardConfig: { automl: enabled } } };

  cy.step(`${enabled ? 'Enable' : 'Disable'} AutoML feature flag`);
  return cy
    .exec(buildPatchCommand(DASHBOARD_CONFIG, patchSpec, namespace))
    .then((result) => {
      if (result.code !== 0) {
        const maskedStderr = maskSensitiveInfo(result.stderr);
        throw new Error(`Failed to set AutoML feature flag to ${enabled}: ${maskedStderr}`);
      }
    })
    .then(() => {
      if (enabled) {
        cy.step('Wait for automl feature flag to be set');
        return pollUntilSuccess(
          `oc get OdhDashboardConfig -A -o json | jq -e '.items[].spec.dashboardConfig.automl == true'`,
          'automl feature flag to be true',
          { maxAttempts: 30, pollIntervalMs: 2000 },
        );
      }
      return cy.exec('echo "AutoML feature flag disabled"');
    });
};
