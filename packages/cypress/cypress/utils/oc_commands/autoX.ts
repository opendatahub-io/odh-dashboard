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
 * Check whether a dashboard feature flag is currently enabled.
 */
const isFeatureFlagEnabled = (flag: string): Cypress.Chainable<boolean> =>
  cy
    .exec(
      `oc get OdhDashboardConfig -A -o json | jq -e '.items[].spec.dashboardConfig.${flag} == true'`,
      { failOnNonZeroExit: false },
    )
    .then((result) => result.exitCode === 0);

/**
 * Set a dashboard feature flag and optionally poll until it is confirmed.
 */
const setFeatureFlag = (
  flag: string,
  enabled: boolean,
  label: string,
): Cypress.Chainable<Cypress.Exec> => {
  const namespace = getApplicationsNamespace();
  const patchSpec = { spec: { dashboardConfig: { [flag]: enabled } } };

  cy.step(`${enabled ? 'Enable' : 'Disable'} ${label} feature flag`);
  return cy
    .exec(buildPatchCommand(DASHBOARD_CONFIG, patchSpec, namespace))
    .then((result) => {
      if (result.exitCode !== 0) {
        const maskedStderr = maskSensitiveInfo(result.stderr);
        throw new Error(`Failed to set ${label} feature flag to ${enabled}: ${maskedStderr}`);
      }
    })
    .then(() => {
      if (enabled) {
        cy.step(`Wait for ${flag} feature flag to be set`);
        return pollUntilSuccess(
          `oc get OdhDashboardConfig -A -o json | jq -e '.items[].spec.dashboardConfig.${flag} == true'`,
          `${flag} feature flag to be true`,
          { maxAttempts: 30, pollIntervalMs: 2000 },
        );
      }
      return cy.exec(`echo "${label} feature flag disabled"`);
    });
};

// ── AutoML ───────────────────────────────────────────────────────────

export const isAutomlEnabled = (): Cypress.Chainable<boolean> => isFeatureFlagEnabled('automl');

export const setAutomlEnabled = (enabled: boolean): Cypress.Chainable<Cypress.Exec> =>
  setFeatureFlag('automl', enabled, 'AutoML');

// ── AutoRAG ──────────────────────────────────────────────────────────

export const isAutoragEnabled = (): Cypress.Chainable<boolean> => isFeatureFlagEnabled('autorag');

/**
 * Set the AutoRAG feature flag in OdhDashboardConfig.
 * AutoRAG requires genAiStudio — enables it only if not already set.
 * When disabling, only the autorag flag is removed (genAiStudio is left as-is).
 */
export const setAutoragEnabled = (enabled: boolean): Cypress.Chainable<Cypress.Exec> => {
  if (enabled) {
    return isFeatureFlagEnabled('genAiStudio').then((genAiAlreadyEnabled) => {
      if (genAiAlreadyEnabled) {
        cy.log('Gen AI Studio already enabled, skipping');
        return setFeatureFlag('autorag', true, 'AutoRAG');
      }
      return setFeatureFlag('genAiStudio', true, 'Gen AI Studio').then(() =>
        setFeatureFlag('autorag', true, 'AutoRAG'),
      );
    });
  }
  return setFeatureFlag('autorag', false, 'AutoRAG');
};
