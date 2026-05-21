import type { MlflowExperimentRunData } from '../../types';

const K8S_NAMESPACE_RE = /^[a-z0-9](?:[-a-z0-9]{0,61}[a-z0-9])?$/;

const assertNamespace = (namespace: string): string => {
  if (!K8S_NAMESPACE_RE.test(namespace)) {
    throw new Error(`Invalid namespace: ${namespace}`);
  }
  return namespace;
};

const getApplicationsNamespace = (): string => {
  const namespace = Cypress.env('APPLICATIONS_NAMESPACE');
  if (!namespace) {
    throw new Error('APPLICATIONS_NAMESPACE is not configured.');
  }
  return assertNamespace(namespace);
};

/**
 * Get the MLflow tracking server URL from the MLflow CR status.
 */
export const getMlflowTrackingUrl = (): Cypress.Chainable<string> => {
  const namespace = getApplicationsNamespace();
  return cy
    .exec(
      `oc get mlflows.mlflow.opendatahub.io -n ${namespace} -o jsonpath="{.items[0].status.address.url}"`,
    )
    .then((result) => {
      const url = result.stdout.trim().replace(/"/g, '');
      if (!url) {
        throw new Error('MLflow tracking URL not found in CR status');
      }
      return url;
    });
};

/**
 * Get the name of a running MLflow tracking-server pod in the applications namespace.
 * Uses the tracking-server label to avoid matching operator, database, or minio pods.
 */
const getMlflowPodName = (): Cypress.Chainable<string> => {
  const namespace = getApplicationsNamespace();
  return cy
    .exec(
      `oc get pods -n ${namespace} -l app=mlflow -o jsonpath="{.items[0].metadata.name}" --field-selector=status.phase=Running`,
      { failOnNonZeroExit: false },
    )
    .then((result) => {
      const podName = result.stdout.replace(/"/g, '').trim();
      if (!podName) {
        throw new Error(
          `No running MLflow tracking pod found (label app=mlflow) in namespace ${namespace}`,
        );
      }
      return podName;
    });
};

/**
 * Execute a curl command inside the MLflow pod against the tracking server.
 */
const execCurlInMlflowPod = (
  endpoint: string,
  body: object,
  workspace: string,
): Cypress.Chainable<string> => {
  const namespace = getApplicationsNamespace();
  const bodyJson = JSON.stringify(body);
  const escapedBody = bodyJson.replace(/'/g, "'\\''");
  return getMlflowPodName().then((podName) => {
    const ns = assertNamespace(workspace);
    const cmd = [
      `printf '%s' '${escapedBody}'`,
      '|',
      `oc exec -n ${namespace} -i ${podName} -c mlflow --`,
      `curl -sk -X POST 'https://localhost:8443/mlflow${endpoint}'`,
      `-H 'Content-Type: application/json'`,
      `-H "Authorization: Bearer $(oc whoami -t)"`,
      `-H 'X-MLFLOW-WORKSPACE: ${ns}'`,
      `--data-binary @-`,
    ].join(' ');
    return cy.exec(cmd, { timeout: 30000, log: false }).then((result) => result.stdout.trim());
  });
};

/**
 * Create an MLflow experiment via the tracking server REST API.
 *
 * @param workspace - Namespace to scope the experiment to.
 * @param experimentName - Display name for the experiment.
 * @returns The experiment_id of the created experiment.
 */
export const createMlflowExperimentViaAPI = (
  workspace: string,
  experimentName: string,
): Cypress.Chainable<string> =>
  execCurlInMlflowPod(
    '/api/2.0/mlflow/experiments/create',
    { name: experimentName },
    workspace,
  ).then((response) => JSON.parse(response).experiment_id);

/**
 * Log a run with parameters and metrics via the MLflow tracking server REST API.
 *
 * @param workspace - Namespace to scope the run to.
 * @param experimentId - The experiment_id to create the run under.
 * @param run - Run data (name, parameters, metrics).
 * @returns The run_id of the created run.
 */
export const logMlflowRunViaAPI = (
  workspace: string,
  experimentId: string,
  run: MlflowExperimentRunData,
): Cypress.Chainable<string> =>
  execCurlInMlflowPod(
    '/api/2.0/mlflow/runs/create',
    /* eslint-disable camelcase */
    { experiment_id: experimentId, run_name: run.name },
    workspace,
  ).then((response) => {
    const runId = JSON.parse(response).run.info.run_id;
    const params = Object.entries(run.parameters).map(([key, value]) => ({ key, value }));
    const metricTimestamp = Date.now();
    const metrics = Object.entries(run.metrics).map(([key, value]) => ({
      key,
      value: parseFloat(value),
      timestamp: metricTimestamp,
      step: 0,
    }));
    return execCurlInMlflowPod(
      '/api/2.0/mlflow/runs/log-batch',
      { run_id: runId, params, metrics },
      workspace,
    ).then(() =>
      execCurlInMlflowPod(
        '/api/2.0/mlflow/runs/update',
        { run_id: runId, status: 'FINISHED', end_time: Date.now() },
        workspace,
      ).then(() => runId),
    );
    /* eslint-enable camelcase */
  });

/**
 * Delete an MLflow experiment via the tracking server REST API.
 *
 * @param workspace - Namespace the experiment is scoped to.
 * @param experimentId - The experiment_id to delete.
 */
export const deleteMlflowExperimentViaAPI = (
  workspace: string,
  experimentId: string,
): Cypress.Chainable<string> =>
  execCurlInMlflowPod(
    '/api/2.0/mlflow/experiments/delete',
    { experiment_id: experimentId }, // eslint-disable-line camelcase
    workspace,
  );

/**
 * Look up an MLflow experiment by name and return its ID, or undefined if not found.
 */
export const getMlflowExperimentIdByName = (
  workspace: string,
  experimentName: string,
): Cypress.Chainable<string | undefined> =>
  execCurlInMlflowPod(
    '/api/2.0/mlflow/experiments/get-by-name',
    { experiment_name: experimentName }, // eslint-disable-line camelcase
    workspace,
  ).then((response) => {
    try {
      return JSON.parse(response)?.experiment?.experiment_id;
    } catch {
      return undefined;
    }
  });

/**
 * Log multiple runs sequentially under a single experiment.
 *
 * @param workspace - Namespace to scope the runs to.
 * @param experimentId - The experiment_id to create the runs under.
 * @param runs - Array of run data objects (name, parameters, metrics).
 * @returns Array of run_ids for all created runs.
 */
export const logMlflowRunsViaAPI = (
  workspace: string,
  experimentId: string,
  runs: MlflowExperimentRunData[],
): Cypress.Chainable<string[]> => {
  const logNext = (
    remaining: MlflowExperimentRunData[],
    collected: string[],
  ): Cypress.Chainable<string[]> => {
    if (remaining.length === 0) {
      return cy.wrap(collected);
    }
    const [run, ...rest] = remaining;
    return logMlflowRunViaAPI(workspace, experimentId, run).then((runId) =>
      logNext(rest, [...collected, runId]),
    );
  };
  return logNext(runs, []);
};
