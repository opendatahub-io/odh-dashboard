import { pollUntilSuccess } from './baseCommands';
import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

/** Placeholder DB secret in `resources/eval-hub/evalhub-instance.yaml` (multi-doc); torn down with suite-created EvalHub. */
export const EVALHUB_E2E_DB_SECRET_NAME = 'evalhub-e2e-database-credentials';

const getApplicationsNamespace = (): string => {
  const namespace = Cypress.env('APPLICATIONS_NAMESPACE');
  if (!namespace) {
    throw new Error(
      'APPLICATIONS_NAMESPACE is not configured. Set CY_TEST_CONFIG to point to your test-variables.yml file.',
    );
  }
  return namespace;
};

const waitEvalHubReady = (namespace: string, crName: string): Cypress.Chainable<Cypress.Exec> =>
  pollUntilSuccess(
    `oc get evalhub ${crName} -n ${namespace} -o json | jq -e '.status.phase == "Ready"'`,
    `EvalHub ${crName} Ready in ${namespace}`,
    { maxAttempts: 72, pollIntervalMs: 5000 },
  );

/**
 * Ensures an EvalHub CR exists in `APPLICATIONS_NAMESPACE` and reaches phase Ready (BFF health).
 * If the CR is already present, only waits for Ready.
 *
 * @returns `true` if this run applied the manifest (teardown may delete); `false` if it already existed.
 */
export const ensureEvalHubCrReady = (
  crName: string,
  fixturePathRelativeToFixtures: string,
): Cypress.Chainable<boolean> => {
  const ns = getApplicationsNamespace();
  const existsCmd = `oc get evalhub ${crName} -n ${ns} -o name --ignore-not-found`;

  return cy.exec(existsCmd, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to check EvalHub CR existence in ${ns}: ${result.stderr || result.stdout}`,
      );
    }
    const existed = result.stdout.trim().length > 0;

    if (existed) {
      cy.log(`EvalHub CR ${crName} already exists in ${ns}; waiting for Ready`);
      return waitEvalHubReady(ns, crName).then(() => cy.wrap(false));
    }

    cy.log(`Applying EvalHub CR ${crName} in ${ns} (operator will create service)`);
    return cy.fixture(fixturePathRelativeToFixtures, 'utf8').then((yamlContent: string) => {
      const patchedYaml = yamlContent.replace(
        /mlflow\.redhat-ods-applications\.svc/g,
        `mlflow.${ns}.svc`,
      );
      const tmpFile = `/tmp/evalhub-cr-${Date.now()}.yaml`;
      cy.writeFile(tmpFile, patchedYaml);
      return cy
        .exec(`oc apply -f "${tmpFile}" -n ${ns}`, { failOnNonZeroExit: false })
        .then((applyResult) => {
          if (applyResult.exitCode !== 0) {
            const maskedStderr = maskSensitiveInfo(applyResult.stderr || '');
            throw new Error(`oc apply EvalHub failed: ${maskedStderr}`);
          }
          return waitEvalHubReady(ns, crName).then(() => cy.wrap(true));
        });
    });
  });
};

/** Deletes EvalHub CR by name in APPLICATIONS_NAMESPACE (used when this suite applied it). */
export const deleteEvalHubCr = (crName: string): Cypress.Chainable<CommandLineResult> => {
  const ns = getApplicationsNamespace();
  const cmd = `oc delete evalhub ${crName} -n ${ns} --ignore-not-found`;
  cy.log(`Deleting EvalHub CR: ${cmd}`);
  return cy.exec(cmd, { failOnNonZeroExit: false });
};

/** Removes the E2E placeholder DB Secret applied with `evalhub-instance.yaml` (after EvalHub CR is deleted). */
export const deleteEvalHubE2eDatabaseSecret = (): Cypress.Chainable<CommandLineResult> => {
  const ns = getApplicationsNamespace();
  const cmd = `oc delete secret ${EVALHUB_E2E_DB_SECRET_NAME} -n ${ns} --ignore-not-found`;
  cy.log(`Deleting Eval Hub E2E database placeholder secret: ${cmd}`);
  return cy.exec(cmd, { failOnNonZeroExit: false });
};

/**
 * Polls until at least one Job in the namespace has a `Complete` condition.
 * The namespace is ephemeral (created fresh each test run), so only one job exists.
 */
export const waitForEvaluationJobComplete = (
  namespace: string,
  timeoutMs = 900000,
): Cypress.Chainable<Cypress.Exec> => {
  const pollIntervalMs = 10000;
  const maxAttempts = Math.ceil(timeoutMs / pollIntervalMs);

  return pollUntilSuccess(
    `oc get jobs -n ${namespace} -o json | jq -e '.items[] | select(.status.conditions[]? | select(.type == "Complete" and .status == "True"))'`,
    `Evaluation job Complete in ${namespace}`,
    { maxAttempts, pollIntervalMs },
  );
};
