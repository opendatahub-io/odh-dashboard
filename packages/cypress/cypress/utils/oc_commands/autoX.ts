import { pollUntilSuccess } from './baseCommands';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

const DASHBOARD_CONFIG = 'odhdashboardconfig odh-dashboard-config';
const AUTOX_DSPA_NAME = 'dspa';
const AUTOX_DSPA_WAIT_TIMEOUT_MS = 600000;
const AUTOX_DSPA_WAIT_TIMEOUT_BUFFER_MS = 15000;
const AUTOX_DSPA_DIAGNOSTIC_TIMEOUT_MS = 30000;

const logAutoXDspaDiagnosticCommand = (
  projectName: string,
  label: string,
  command: string,
): void => {
  cy.exec(command, { failOnNonZeroExit: false, timeout: AUTOX_DSPA_DIAGNOSTIC_TIMEOUT_MS }).then(
    (result) => {
      const output = maskSensitiveInfo(`${result.stdout}\n${result.stderr}`.trim());
      cy.log(
        `[AutoX DSPA] ${label} for ${projectName} (exit ${result.exitCode}): ${
          output || 'No output.'
        }`,
      );
    },
  );
};

const logAutoXDspaDiagnostics = (projectName: string): void => {
  logAutoXDspaDiagnosticCommand(
    projectName,
    'Status conditions',
    `oc get dspa ${AUTOX_DSPA_NAME} -n ${projectName} ` +
      '-o jsonpath=\'{range .status.conditions[*]}{.type}={.status}: {.reason} {.message}{"\\n"}{end}\'',
  );
  logAutoXDspaDiagnosticCommand(
    projectName,
    'Pod status',
    `oc get pods -n ${projectName} ` +
      '-o custom-columns="NAME:.metadata.name,READY:.status.containerStatuses[*].ready,PHASE:.status.phase,REASON:.status.reason,NODE:.spec.nodeName" --no-headers',
  );
  logAutoXDspaDiagnosticCommand(
    projectName,
    'Warning events',
    `oc get events -n ${projectName} --field-selector type=Warning --sort-by=.lastTimestamp ` +
      '-o custom-columns="LAST-SEEN:.lastTimestamp,REASON:.reason,KIND:.involvedObject.kind,NAME:.involvedObject.name,MESSAGE:.message" --no-headers',
  );
};

/**
 * Wait for the AutoX DSPA and capture AutoX-specific diagnostics when it does not become ready.
 * The Cypress timeout includes a buffer so that `oc wait` can return its failure result first.
 */
export const waitForAutoXDspaReady = (
  projectName: string,
  timeout = AUTOX_DSPA_WAIT_TIMEOUT_MS,
): Cypress.Chainable<Cypress.Exec> => {
  const command = `oc wait --for=condition=Ready dspa/${AUTOX_DSPA_NAME} -n ${projectName} --timeout=${timeout}ms`;
  cy.log(`Waiting for AutoX DSPA to be ready: ${command}`);

  return cy
    .exec(command, {
      failOnNonZeroExit: false,
      timeout: timeout + AUTOX_DSPA_WAIT_TIMEOUT_BUFFER_MS,
    })
    .then((result) => {
      if (result.exitCode === 0) {
        cy.log('AutoX DSPA is ready');
        return;
      }

      const failureOutput =
        maskSensitiveInfo(result.stderr || result.stdout) || 'No command output.';
      cy.log(`AutoX DSPA wait failed (exit ${result.exitCode}): ${failureOutput}`);
      cy.step('Capture AutoX DSPA diagnostics');
      logAutoXDspaDiagnostics(projectName);
      cy.then(() => {
        throw new Error(
          `AutoX DSPA ${AUTOX_DSPA_NAME} in namespace ${projectName} did not become Ready within ${timeout}ms.`,
        );
      });
    });
};

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
