import { pollUntilSuccess } from './baseCommands';
import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

/** Placeholder DB secret in `resources/eval-hub/evalhub-instance.yaml`; must match spec.database.secret. */
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
 * Creates an EvalHub CR (tenancy: single) in the given per-test namespace using the provided fixture.
 * The fixture is a multi-doc YAML that includes both the database Secret and the EvalHub CR.
 *
 * With tenancy: single, the EvalHub service, evaluation jobs, and vLLM model all share the same
 * namespace. Cleanup is handled by deleting the namespace after the test — no explicit CR deletion needed.
 *
 * The MLflow tracking URI is patched to point to the shared MLflow service in APPLICATIONS_NAMESPACE.
 */
export const createEvalHubCr = (
  namespace: string,
  fixturePathRelativeToFixtures: string,
): Cypress.Chainable<Cypress.Exec> => {
  const applicationsNs = getApplicationsNamespace();

  cy.log(`Creating EvalHub CR in ${namespace} (tenancy: single)`);
  return cy.fixture(fixturePathRelativeToFixtures, 'utf8').then((yamlContent: string) => {
    const patchedYaml = yamlContent.replace(
      /mlflow\.redhat-ods-applications\.svc/g,
      `mlflow.${applicationsNs}.svc`,
    );
    const tmpFile = `/tmp/evalhub-cr-${Date.now()}.yaml`;
    cy.writeFile(tmpFile, patchedYaml);
    return cy
      .exec(`oc apply -f "${tmpFile}" -n ${namespace}`, { failOnNonZeroExit: false })
      .then((applyResult: CommandLineResult) => {
        if (applyResult.exitCode !== 0) {
          const maskedStderr = maskSensitiveInfo(applyResult.stderr || '');
          throw new Error(`oc apply EvalHub failed: ${maskedStderr}`);
        }
        return waitEvalHubReady(namespace, 'evalhub');
      });
  });
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
