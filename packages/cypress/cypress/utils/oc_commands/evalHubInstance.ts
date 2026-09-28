import { pollUntilSuccess } from './baseCommands';
import { assertNamespace, deleteMlflowExperimentViaAPI } from './mlflow';
import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

/** Placeholder DB secret in `resources/eval-hub/evalhub-instance.yaml` (multi-doc); torn down with suite-created EvalHub. */
export const EVALHUB_E2E_DB_SECRET_NAME = 'evalhub-e2e-database-credentials';

type EvalHubResource = {
  metadata?: {
    name?: string;
    namespace?: string;
  };
};

type EvalHubList = {
  items?: EvalHubResource[];
};

type EvalHubInstance = {
  namespace: string;
};

type MlflowExperimentLookupResponse = {
  experiment?: {
    experiment_id?: string;
    lifecycle_stage?: string;
  };
  error_code?: string;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

type EvalHubMlflowExperiment = {
  experimentId: string;
  lifecycleStage: string;
};

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

const findExistingEvalHub = (crName: string): Cypress.Chainable<EvalHubInstance | null> =>
  cy.exec('oc get evalhub -A -o json', { failOnNonZeroExit: false }).then((result) => {
    if (result.exitCode !== 0) {
      throw new Error(`Failed to list EvalHub instances: ${result.stderr || result.stdout}`);
    }

    let evalHubList: EvalHubList;
    try {
      evalHubList = JSON.parse(result.stdout) as EvalHubList;
    } catch {
      throw new Error('Unable to parse EvalHub instance list as JSON.');
    }

    const matchingInstances = (evalHubList.items ?? []).flatMap(({ metadata }) => {
      const { name, namespace } = metadata ?? {};
      return name === crName && namespace ? [{ namespace }] : [];
    });
    if (matchingInstances.length > 1) {
      const locations = matchingInstances
        .map(({ namespace }) => `${namespace}/${crName}`)
        .join(', ');
      throw new Error(
        `Found multiple EvalHub instances named '${crName}' (${locations}). ` +
          'The EvalHub E2E environment must have exactly one to avoid ambiguous tenant discovery.',
      );
    }

    return cy.wrap(matchingInstances.length === 1 ? matchingInstances[0] : null);
  });

/**
 * Ensures exactly one EvalHub CR named `crName` is available and reaches phase Ready (BFF health).
 * Existing EvalHub instances are reused; clusters that need provisioning create it in
 * `APPLICATIONS_NAMESPACE` only when none exists.
 *
 * @returns `true` if this run applied the manifest; `false` if it reused an existing instance.
 */
export const ensureEvalHubCrReady = (
  crName: string,
  fixturePathRelativeToFixtures: string,
): Cypress.Chainable<boolean> => {
  return findExistingEvalHub(crName).then((existingInstance) => {
    if (existingInstance) {
      cy.log(
        `EvalHub CR ${crName} already exists in ${existingInstance.namespace}; waiting for Ready`,
      );
      return waitEvalHubReady(existingInstance.namespace, crName).then(() => cy.wrap(false));
    }

    const ns = getApplicationsNamespace();
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

const getEvalHubMlflowExperiment = (
  workspace: string,
  experimentName: string,
): Cypress.Chainable<EvalHubMlflowExperiment> => {
  const applicationsNamespace = assertNamespace(getApplicationsNamespace());
  const safeWorkspace = assertNamespace(workspace);
  const encodedExperimentName = encodeURIComponent(experimentName);

  return cy
    .exec(
      `oc get pods -n ${applicationsNamespace} -l app=mlflow ` +
        '-o jsonpath="{.items[0].metadata.name}" --field-selector=status.phase=Running',
      { failOnNonZeroExit: false },
    )
    .then((result) => {
      const podName = result.stdout.replace(/"/g, '').trim();
      if (result.exitCode !== 0 || !podName) {
        throw new Error(
          `Unable to find the running MLflow pod in ${applicationsNamespace}: ${
            result.stderr || result.stdout
          }`,
        );
      }

      const cmd = [
        `oc exec -n ${applicationsNamespace} -i ${podName} -c mlflow --`,
        `curl -sk 'https://localhost:8443/mlflow/api/2.0/mlflow/experiments/get-by-name?experiment_name=${encodedExperimentName}'`,
        '-H "Authorization: Bearer $(oc whoami -t)"',
        `-H 'X-MLFLOW-WORKSPACE: ${safeWorkspace}'`,
      ].join(' ');

      return cy.exec(cmd, { timeout: 30000, log: false }).then((lookupResult) => {
        let response: MlflowExperimentLookupResponse;
        try {
          response = JSON.parse(lookupResult.stdout) as MlflowExperimentLookupResponse;
        } catch {
          throw new Error(
            `MLflow returned an invalid experiment lookup response for ${experimentName}`,
          );
        }

        const errorCode = response.error_code ?? response.error?.code;
        if (errorCode === 'RESOURCE_DOES_NOT_EXIST') {
          return { experimentId: '', lifecycleStage: 'missing' };
        }
        if (errorCode) {
          throw new Error(
            `MLflow experiment lookup failed for ${experimentName}: ${
              response.message ?? response.error?.message ?? errorCode
            }`,
          );
        }

        const experimentId = response.experiment?.experiment_id;
        const lifecycleStage = response.experiment?.lifecycle_stage;
        if (!experimentId || !lifecycleStage) {
          throw new Error(
            `MLflow lookup did not return complete experiment details for ${experimentName}`,
          );
        }
        return { experimentId, lifecycleStage };
      });
    });
};

const assertMlflowDeleteSucceeded = (experimentName: string, responseText: string): void => {
  if (!responseText.trim()) {
    return;
  }

  let response: MlflowExperimentLookupResponse;
  try {
    response = JSON.parse(responseText) as MlflowExperimentLookupResponse;
  } catch {
    throw new Error(`MLflow returned an invalid delete response for ${experimentName}`);
  }

  const errorCode = response.error_code ?? response.error?.code;
  if (errorCode) {
    throw new Error(
      `MLflow experiment deletion failed for ${experimentName}: ${
        response.message ?? response.error?.message ?? errorCode
      }`,
    );
  }
};

/** Soft-deletes an EvalHub test experiment from its MLflow workspace when it exists. */
export const cleanupEvalHubMlflowExperiment = (
  workspace: string,
  experimentName: string,
): Cypress.Chainable<boolean> =>
  getEvalHubMlflowExperiment(workspace, experimentName).then(({ experimentId, lifecycleStage }) => {
    if (!experimentId) {
      cy.log(`MLflow experiment ${experimentName} not found in workspace ${workspace}`);
      return cy.wrap(false);
    }
    if (lifecycleStage === 'deleted') {
      cy.log(`MLflow experiment ${experimentName} is already deleted in workspace ${workspace}`);
      return cy.wrap(false);
    }

    cy.log(`Deleting MLflow experiment ${experimentName} from workspace ${workspace}`);
    return deleteMlflowExperimentViaAPI(workspace, experimentId).then((response) => {
      assertMlflowDeleteSucceeded(experimentName, response);
      return getEvalHubMlflowExperiment(workspace, experimentName).then((deletedExperiment) => {
        if (deletedExperiment.experimentId && deletedExperiment.lifecycleStage !== 'deleted') {
          throw new Error(
            `MLflow experiment ${experimentName} is still ${deletedExperiment.lifecycleStage} ` +
              `after deletion (ID ${deletedExperiment.experimentId})`,
          );
        }
        return true;
      });
    });
  });

const waitForEvaluationJobsCreated = (
  namespace: string,
  timeoutMs: number,
): Cypress.Chainable<Cypress.Exec> => {
  const pollIntervalMs = 10000;
  const maxAttempts = Math.ceil(timeoutMs / pollIntervalMs);

  return pollUntilSuccess(
    `oc get jobs -n ${namespace} -o json | jq -e '(.items | length) > 0'`,
    `Evaluation jobs created in ${namespace}`,
    { maxAttempts, pollIntervalMs },
  );
};

/**
 * Polls until all evaluation Jobs in the namespace have reached a terminal state.
 *
 * The first poll requires a Job to exist so an empty namespace cannot be treated as
 * a completed evaluation. Once a Job has been observed, an empty list is accepted
 * because the Kubernetes TTL controller may delete completed Jobs before the next poll.
 * Works for both single-benchmark runs (1 Job) and benchmark suite runs (N Jobs).
 */
export const waitForEvaluationJobComplete = (
  namespace: string,
  timeoutMs = 900000,
): Cypress.Chainable<Cypress.Exec> => {
  const pollIntervalMs = 10000;
  const startTime = Date.now();
  const creationTimeoutMs = Math.min(timeoutMs, 120000);

  return waitForEvaluationJobsCreated(namespace, creationTimeoutMs).then(() => {
    const remainingTimeoutMs = Math.max(timeoutMs - (Date.now() - startTime), pollIntervalMs);
    const maxAttempts = Math.ceil(remainingTimeoutMs / pollIntervalMs);

    return pollUntilSuccess(
      `oc get jobs -n ${namespace} -o json | jq -e '(.items | length) == 0 or ([.items[] | any(.status.conditions[]?; (.status == "True" and (.type == "Complete" or .type == "Failed")))] | all)'`,
      `All evaluation jobs complete in ${namespace}`,
      { maxAttempts, pollIntervalMs },
    );
  });
};
