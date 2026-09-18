import { maskSensitiveInfo } from '../maskSensitiveInfo';

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
