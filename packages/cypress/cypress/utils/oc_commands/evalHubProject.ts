import { assertNamespace } from './mlflow';

const EVALHUB_TENANT_PROJECT_DELETE_REQUEST_TIMEOUT_SECONDS = 15;
const EVALHUB_TENANT_PROJECT_DELETE_WAIT_TIMEOUT_SECONDS = 180;
// Covers the request and wait budgets, plus 15 seconds for process startup and exit.
const EVALHUB_TENANT_PROJECT_DELETE_CYPRESS_TIMEOUT_MS = 210000;

/** Deletes an EvalHub test namespace while reporting command failures to its cleanup runner. */
export const deleteEvalHubTenantProject = (
  projectName: string,
  reportFailure: (message: string) => void,
): Cypress.Chainable<Cypress.Exec> => {
  const namespace = assertNamespace(projectName);
  const command =
    `oc --request-timeout=${EVALHUB_TENANT_PROJECT_DELETE_REQUEST_TIMEOUT_SECONDS}s ` +
    `delete project ${namespace} --wait=true --ignore-not-found ` +
    `--timeout=${EVALHUB_TENANT_PROJECT_DELETE_WAIT_TIMEOUT_SECONDS}s`;

  return cy
    .exec(command, {
      failOnNonZeroExit: false,
      timeout: EVALHUB_TENANT_PROJECT_DELETE_CYPRESS_TIMEOUT_MS,
      log: false,
    })
    .then((result) => {
      if (result.exitCode !== 0) {
        reportFailure(
          `Failed to delete EvalHub tenant project ${namespace}: ${result.stderr || result.stdout}`,
        );
      }
      return cy.wrap(result, { log: false });
    });
};
