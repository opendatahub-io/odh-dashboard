import { applyOpenShiftYaml, pollUntilSuccess } from './baseCommands';
import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

const MLFLOW_CR_NAME = 'mlflow';

const waitMlflowAvailable = (): Cypress.Chainable<Cypress.Exec> =>
  pollUntilSuccess(
    `oc get mlflow ${MLFLOW_CR_NAME} -o json | jq -e '.status.conditions[]? | select(.type=="Available") | .status == "True"'`,
    `MLflow ${MLFLOW_CR_NAME} Available`,
    { maxAttempts: 72, pollIntervalMs: 5000 },
  );

/**
 * Ensures a cluster-scoped `MLflow` CR named `mlflow` exists and is Available.
 * Uses `oc apply` without `-n` (not namespaced).
 *
 * @param fixturePathRelativeToFixtures Path under `cypress/fixtures/` (e.g. `resources/mlflow/...yaml`).
 * @returns `true` if this run applied the manifest (suite teardown may delete); `false` if it already existed.
 */
export const ensureMlflowCrReady = (
  fixturePathRelativeToFixtures: string,
): Cypress.Chainable<boolean> =>
  cy.fixture(fixturePathRelativeToFixtures, 'utf8').then((yamlContent: string) =>
    cy
      .exec(`oc get mlflow ${MLFLOW_CR_NAME} -o name --ignore-not-found`, {
        failOnNonZeroExit: false,
      })
      .then((result: CommandLineResult) => {
        const existed = result.stdout.trim().length > 0;

        if (existed) {
          cy.log(`MLflow CR ${MLFLOW_CR_NAME} already exists; waiting for Available`);
          return waitMlflowAvailable().then(() => cy.wrap(false));
        }

        cy.log(`Applying cluster-scoped MLflow CR from ${fixturePathRelativeToFixtures}`);
        return applyOpenShiftYaml(yamlContent).then((applyResult) => {
          if (applyResult.code !== 0) {
            const maskedStderr = maskSensitiveInfo(applyResult.stderr || '');
            throw new Error(`oc apply MLflow failed: ${maskedStderr}`);
          }
          return waitMlflowAvailable().then(() => cy.wrap(true));
        });
      }),
  );

/** Deletes the default `mlflow` MLflow CR (when the suite created it). */
export const deleteMlflowCr = (): Cypress.Chainable<CommandLineResult> => {
  cy.log(`Deleting MLflow CR ${MLFLOW_CR_NAME} if present`);
  return cy.exec(`oc delete mlflow ${MLFLOW_CR_NAME} --ignore-not-found`, {
    failOnNonZeroExit: false,
  });
};
