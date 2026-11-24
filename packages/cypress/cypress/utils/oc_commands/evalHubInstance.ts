import { pollUntilSuccess } from './baseCommands';
import { assertNamespace } from './mlflow';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

export const EVALHUB_E2E_MANAGED_LABEL = 'opendatahub.io/dashboard-e2e-managed';

export type EvalHubResource = {
  metadata?: {
    name?: string;
    namespace?: string;
    labels?: Partial<Record<string, string>>;
  };
  spec?: {
    tenancy?: string;
  };
};

export type EvalHubInstance = {
  name: string;
  namespace: string;
  managedByE2e: boolean;
};

type RequiredEvalHubInstance = Pick<EvalHubInstance, 'name' | 'namespace'>;

type EvalHubList = {
  items?: EvalHubResource[];
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

type MlflowHttpResponse = {
  body: string;
  status: number;
};

type MlflowDeleteAttempt = {
  commandResult: Cypress.Exec;
  httpResponse?: MlflowHttpResponse;
};

const EVALHUB_PROVISION_IF_MISSING_ENV = 'CY_EVAL_HUB_PROVISION_IF_MISSING';
const EVALHUB_EXISTING_NAMESPACE_ENV = 'CY_EVAL_HUB_EXISTING_NAMESPACE';
const DEFAULT_EXISTING_EVALHUB_NAMESPACE = 'evalhub';
const EVALHUB_SERVICE_NAME_PREFIX = 'evalhub';
const KUBERNETES_NAME_RE = /^[a-z0-9](?:[-a-z0-9]{0,61}[a-z0-9])?$/;
const DEFAULT_EVALHUB_MLFLOW_CLEANUP_MAX_ATTEMPTS = 3;
const EVALHUB_MLFLOW_CLEANUP_EXEC_TIMEOUT_MS = 60000;
// Three 16s attempt limits, one-second kill grace periods, and two backoffs total at most 53s.
const EVALHUB_MLFLOW_CLEANUP_ATTEMPT_TIMEOUT_SECONDS = 16;
const EVALHUB_MLFLOW_CLEANUP_CURL_TIMEOUT_SECONDS = 10;
const MLFLOW_HTTP_STATUS_MARKER = 'EVALHUB_MLFLOW_HTTP_STATUS';
const RETRYABLE_MLFLOW_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

const shellQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

const getMlflowPodLookupCommand = (applicationsNamespace: string): string[] => [
  `pod_name=$(oc --request-timeout=15s get pods -n ${applicationsNamespace} ` +
    `-l app=mlflow -o jsonpath="{.items[0].metadata.name}" --field-selector=status.phase=Running)`,
  'oc_exit_code=$?',
  `pod_name=$(printf '%s' "$pod_name" | tr -d '"')`,
  'if [ "$oc_exit_code" -ne 0 ]; then exit "$oc_exit_code"; fi',
  'if [ -z "$pod_name" ]; then echo "No running MLflow pod found" >&2; exit 1; fi',
];

const captureMlflowHttpResponse = (
  curlCommand: string,
  retryTransientStatuses: boolean,
): string[] => [
  `curl_response=$(${curlCommand} --write-out '\\n%{http_code}')`,
  'curl_exit_code=$?',
  'if [ "$curl_exit_code" -ne 0 ]; then exit "$curl_exit_code"; fi',
  `curl_status=$(printf '%s\\n' "$curl_response" | tail -n 1)`,
  `curl_body=$(printf '%s\\n' "$curl_response" | sed '$d')`,
  ...(retryTransientStatuses
    ? [
        `case "$curl_status" in ${Array.from(RETRYABLE_MLFLOW_HTTP_STATUSES).join('|')})`,
        '  printf "Retrying transient MLflow HTTP status %s\\n" "$curl_status" >&2',
        '  exit 75 ;;',
        'esac',
      ]
    : []),
  `printf '%s\\n${MLFLOW_HTTP_STATUS_MARKER}:%s' "$curl_body" "$curl_status"`,
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === 'string';

const isMlflowExperimentLookupResponse = (
  value: unknown,
): value is MlflowExperimentLookupResponse => {
  if (!isRecord(value)) {
    return false;
  }

  const { error, experiment } = value;
  return (
    isOptionalString(value.error_code) &&
    isOptionalString(value.message) &&
    (error === undefined ||
      (isRecord(error) && isOptionalString(error.code) && isOptionalString(error.message))) &&
    (experiment === undefined ||
      (isRecord(experiment) &&
        isOptionalString(experiment.experiment_id) &&
        isOptionalString(experiment.lifecycle_stage)))
  );
};

const parseMlflowHttpResponse = (output: string): MlflowHttpResponse => {
  const statusMatch = new RegExp(`(?:^|\\n)${MLFLOW_HTTP_STATUS_MARKER}:(\\d{3})$`).exec(output);
  if (!statusMatch) {
    throw new Error('MLflow response did not include an HTTP status');
  }
  return {
    body: output.slice(0, statusMatch.index),
    status: Number(statusMatch[1]),
  };
};

const execEvalHubMlflowCleanupCommand = (
  command: string,
  maxAttempts = DEFAULT_EVALHUB_MLFLOW_CLEANUP_MAX_ATTEMPTS,
): Cypress.Chainable<Cypress.Exec> => {
  const EVALHUB_MLFLOW_CLEANUP_MAX_ATTEMPTS = maxAttempts;
  const retryCommand = [
    'output_file="$(mktemp)"',
    'error_file="$(mktemp)"',
    `trap 'rm -f "$output_file" "$error_file"' EXIT`,
    'timeout_command=$(command -v timeout || command -v gtimeout || true)',
    'if [ -z "$timeout_command" ]; then echo "timeout or gtimeout is required for bounded EvalHub cleanup retries" >&2; exit 127; fi',
    'attempt=1',
    `while [ "$attempt" -le ${EVALHUB_MLFLOW_CLEANUP_MAX_ATTEMPTS} ]; do`,
    `  "$timeout_command" --kill-after 1s --signal TERM ${EVALHUB_MLFLOW_CLEANUP_ATTEMPT_TIMEOUT_SECONDS}s sh -c ${shellQuote(
      command,
    )} >"$output_file" 2>"$error_file"`,
    '  exit_code=$?',
    '  if [ "$exit_code" -eq 0 ]; then',
    '    cat "$output_file"',
    '    exit 0',
    '  fi',
    `  if [ "$attempt" -eq ${EVALHUB_MLFLOW_CLEANUP_MAX_ATTEMPTS} ]; then`,
    '    cat "$error_file" >&2',
    '    exit "$exit_code"',
    '  fi',
    '  sleep 1',
    '  attempt=$((attempt + 1))',
    'done',
  ].join('\n');

  return cy.exec(retryCommand, {
    failOnNonZeroExit: false,
    timeout: EVALHUB_MLFLOW_CLEANUP_EXEC_TIMEOUT_MS,
    log: false,
  });
};

const formatInstance = ({ name, namespace, managedByE2e }: EvalHubInstance): string =>
  `${namespace}/${name}${managedByE2e ? ' (E2E-provisioned)' : ''}`;

/**
 * Resolves the multi-tenant EvalHub instance that the Dashboard BFF will use.
 *
 * Single-tenant CRs do not reconcile labelled tenant namespaces and are ignored. The operator
 * gives each multi-tenant instance its own `<name>.url` discovery key, and the BFF selects the
 * lexicographically smallest key. The selected service name must begin with `evalhub`, matching
 * the BFF's validation contract. Multiple multi-tenant CRs with the same name are unsafe because
 * they overwrite the same key.
 */
export const resolveEvalHubInstance = (
  resources: EvalHubResource[],
  requiredInstance?: RequiredEvalHubInstance,
): EvalHubInstance | null => {
  const instances = resources
    .filter(({ spec }) => spec?.tenancy !== 'single')
    .map(({ metadata }) => {
      const { name, namespace, labels } = metadata ?? {};
      if (!name || !namespace) {
        throw new Error(
          'The EvalHub resource list contains a multi-tenant instance without a name or namespace.',
        );
      }

      return {
        name,
        namespace,
        managedByE2e: labels?.[EVALHUB_E2E_MANAGED_LABEL] === 'true',
      };
    });

  const instancesByName = new Map<string, EvalHubInstance[]>();
  instances.forEach((instance) => {
    instancesByName.set(instance.name, [...(instancesByName.get(instance.name) ?? []), instance]);
  });

  const duplicateGroups = [...instancesByName.values()].filter((group) => group.length > 1);
  if (duplicateGroups.length > 0) {
    const duplicates = duplicateGroups
      .map((group) => group.map(formatInstance).join(', '))
      .join('; ');
    throw new Error(
      `Found duplicate multi-tenant EvalHub names across namespaces: ${duplicates}. ` +
        'Those instances write the same discovery key, so the selected service is unstable. ' +
        'Remove the stale duplicate before running EvalHub E2E tests.',
    );
  }

  const selectedInstance = instances
    .toSorted((left, right) => {
      const leftKey = `${left.name}.url`;
      const rightKey = `${right.name}.url`;
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    })
    .at(0);

  if (selectedInstance && !selectedInstance.name.startsWith(EVALHUB_SERVICE_NAME_PREFIX)) {
    throw new Error(
      `Dashboard discovery would select ${formatInstance(selectedInstance)}, but the EvalHub BFF ` +
        `only accepts service names beginning with '${EVALHUB_SERVICE_NAME_PREFIX}'. ` +
        'Rename or remove the incompatible multi-tenant EvalHub instance.',
    );
  }

  if (!requiredInstance) {
    return selectedInstance ?? null;
  }

  if (!selectedInstance) {
    throw new Error(
      `Required preinstalled EvalHub ${requiredInstance.namespace}/${requiredInstance.name} was not found.`,
    );
  }

  const required = instances.find(
    ({ name, namespace }) =>
      name === requiredInstance.name && namespace === requiredInstance.namespace,
  );
  if (!required) {
    throw new Error(
      `Required preinstalled EvalHub ${requiredInstance.namespace}/${requiredInstance.name} was not found.`,
    );
  }

  if (
    selectedInstance.name !== requiredInstance.name ||
    selectedInstance.namespace !== requiredInstance.namespace
  ) {
    throw new Error(
      `Dashboard discovery would select ${formatInstance(selectedInstance)}, not the required ` +
        `${requiredInstance.namespace}/${requiredInstance.name}.`,
    );
  }

  return required;
};

export const assertEvalHubProvisionTargetAvailable = (
  resources: EvalHubResource[],
  target: RequiredEvalHubInstance,
): void => {
  const existingTarget = resources.find(
    ({ metadata }) => metadata?.name === target.name && metadata.namespace === target.namespace,
  );
  if (existingTarget) {
    throw new Error(
      `Refusing to provision EvalHub ${target.namespace}/${target.name} because that resource ` +
        'already exists but is not a reusable multi-tenant instance. Remove or rename it before ' +
        'allowing Cypress to provision EvalHub.',
    );
  }
};

const assertKubernetesName = (value: string, description: string): string => {
  if (!KUBERNETES_NAME_RE.test(value)) {
    throw new Error(`${description} must be a DNS-1123 name; received '${value}'.`);
  }
  return value;
};

const getApplicationsNamespace = (): string => {
  const namespace = Cypress.env('APPLICATIONS_NAMESPACE');
  if (!namespace) {
    throw new Error(
      'APPLICATIONS_NAMESPACE is not configured. Set CY_TEST_CONFIG to point to your test-variables.yml file.',
    );
  }
  return assertNamespace(namespace);
};

const shouldProvisionEvalHubIfMissing = (): boolean => {
  const configuredValue = Cypress.env(EVALHUB_PROVISION_IF_MISSING_ENV) as unknown;
  if (configuredValue === undefined || configuredValue === '') {
    return true;
  }
  if (typeof configuredValue === 'boolean') {
    return configuredValue;
  }
  if (typeof configuredValue === 'string') {
    if (configuredValue.toLowerCase() === 'true') {
      return true;
    }
    if (configuredValue.toLowerCase() === 'false') {
      return false;
    }
  }

  throw new Error(`${EVALHUB_PROVISION_IF_MISSING_ENV} must be either true or false.`);
};

const getRequiredEvalHubNamespace = (): string => {
  const configuredNamespace = Cypress.env(EVALHUB_EXISTING_NAMESPACE_ENV) as unknown;
  if (configuredNamespace !== undefined && typeof configuredNamespace !== 'string') {
    throw new Error(`${EVALHUB_EXISTING_NAMESPACE_ENV} must be a Kubernetes namespace.`);
  }
  return assertNamespace(configuredNamespace || DEFAULT_EXISTING_EVALHUB_NAMESPACE);
};

const waitEvalHubReady = (namespace: string, crName: string): Cypress.Chainable<Cypress.Exec> =>
  pollUntilSuccess(
    `oc get evalhub ${crName} -n ${namespace} -o json | jq -e '.status.phase == "Ready"'`,
    `EvalHub ${crName} Ready in ${namespace}`,
    { maxAttempts: 72, pollIntervalMs: 5000 },
  );

const listEvalHubResources = (): Cypress.Chainable<EvalHubResource[]> =>
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

    return evalHubList.items ?? [];
  });

const waitForRequiredEvalHub = (
  namespace: string,
  crName: string,
): Cypress.Chainable<EvalHubInstance> =>
  pollUntilSuccess(
    `oc get evalhub ${crName} -n ${namespace} -o name`,
    `preinstalled EvalHub ${namespace}/${crName}`,
    { maxAttempts: 72, pollIntervalMs: 5000 },
  ).then(() =>
    listEvalHubResources().then((resources) => {
      const instance = resolveEvalHubInstance(resources, { name: crName, namespace });
      if (!instance) {
        throw new Error(`Required preinstalled EvalHub ${namespace}/${crName} was not found.`);
      }
      return waitEvalHubReady(instance.namespace, instance.name).then(() => instance);
    }),
  );

const provisionEvalHub = (
  crName: string,
  fixturePathRelativeToFixtures: string,
): Cypress.Chainable<EvalHubInstance> => {
  const namespace = getApplicationsNamespace();
  cy.log(`Creating EvalHub CR ${crName} in ${namespace} (operator will create service)`);

  return cy.fixture(fixturePathRelativeToFixtures, 'utf8').then((yamlContent: string) => {
    const patchedYaml = yamlContent.replace(
      /mlflow\.redhat-ods-applications\.svc/g,
      `mlflow.${namespace}.svc`,
    );
    const tmpFile = `/tmp/evalhub-cr-${namespace}-${crName}-${Date.now()}.yaml`;
    cy.writeFile(tmpFile, patchedYaml);

    return cy
      .exec(`oc create -f "${tmpFile}" -n ${namespace}`, { failOnNonZeroExit: false })
      .then((createResult) =>
        listEvalHubResources().then((resources) => {
          const instance = resolveEvalHubInstance(resources);
          if (!instance) {
            const maskedOutput = maskSensitiveInfo(
              createResult.stderr || createResult.stdout || '',
            );
            throw new Error(
              createResult.exitCode === 0
                ? `EvalHub manifest created, but no multi-tenant EvalHub instance was found.`
                : `oc create EvalHub failed and no concurrent instance was found: ${maskedOutput}`,
            );
          }

          if (createResult.exitCode !== 0) {
            cy.log(
              'EvalHub create did not succeed, but another runner provisioned a usable instance; reusing it',
            );
          }
          return waitEvalHubReady(instance.namespace, instance.name).then(() => instance);
        }),
      );
  });
};

/**
 * Resolves the same multi-tenant EvalHub instance as the Dashboard BFF and waits for it to be Ready.
 * By default, a blank cluster is provisioned in `APPLICATIONS_NAMESPACE`. Environments with
 * preinstalled infrastructure must set `CY_EVAL_HUB_PROVISION_IF_MISSING=false`; the test then
 * waits for `<CY_EVAL_HUB_EXISTING_NAMESPACE || evalhub>/<crName>` and never creates a fallback CR.
 */
export const ensureEvalHubCrReady = (
  crName: string,
  fixturePathRelativeToFixtures: string,
): Cypress.Chainable<EvalHubInstance> => {
  const safeCrName = assertKubernetesName(crName, 'EvalHub CR name');
  if (!shouldProvisionEvalHubIfMissing()) {
    const requiredNamespace = getRequiredEvalHubNamespace();
    cy.log(`Reusing required preinstalled EvalHub ${requiredNamespace}/${safeCrName}`);
    return waitForRequiredEvalHub(requiredNamespace, safeCrName);
  }

  return listEvalHubResources().then((resources) => {
    const existingInstance = resolveEvalHubInstance(resources);
    if (existingInstance) {
      cy.log(
        `Reusing EvalHub CR ${existingInstance.namespace}/${existingInstance.name}; waiting for Ready`,
      );
      return waitEvalHubReady(existingInstance.namespace, existingInstance.name).then(
        () => existingInstance,
      );
    }

    const targetNamespace = getApplicationsNamespace();
    assertEvalHubProvisionTargetAvailable(resources, {
      name: safeCrName,
      namespace: targetNamespace,
    });
    return provisionEvalHub(safeCrName, fixturePathRelativeToFixtures);
  });
};

const getEvalHubMlflowExperiment = (
  workspace: string,
  experimentName: string,
  reportFailure?: (message: string) => void,
): Cypress.Chainable<EvalHubMlflowExperiment | null> => {
  const applicationsNamespace = assertNamespace(getApplicationsNamespace());
  const safeWorkspace = assertNamespace(workspace);
  const encodedExperimentName = encodeURIComponent(experimentName);
  const curlCommand = [
    `oc --request-timeout=15s exec -n ${applicationsNamespace} "$pod_name" -c mlflow --`,
    `curl -skS --connect-timeout 5 --max-time ${EVALHUB_MLFLOW_CLEANUP_CURL_TIMEOUT_SECONDS} ` +
      `'https://localhost:8443/mlflow/api/2.0/mlflow/experiments/get-by-name?experiment_name=${encodedExperimentName}'`,
    '-H "Authorization: Bearer $(oc whoami -t)"',
    `-H 'X-MLFLOW-WORKSPACE: ${safeWorkspace}'`,
  ].join(' ');
  const lookupCommand = [
    ...getMlflowPodLookupCommand(applicationsNamespace),
    ...captureMlflowHttpResponse(curlCommand, true),
  ].join('\n');
  const failLookup = (message: string): Cypress.Chainable<EvalHubMlflowExperiment | null> => {
    if (reportFailure) {
      reportFailure(message);
      return cy.wrap<EvalHubMlflowExperiment | null>(null, { log: false });
    }
    throw new Error(message);
  };

  return execEvalHubMlflowCleanupCommand(lookupCommand).then<EvalHubMlflowExperiment | null>(
    (lookupResult) => {
      if (lookupResult.exitCode !== 0) {
        return failLookup(
          `MLflow experiment lookup command failed: ${maskSensitiveInfo(
            lookupResult.stderr || lookupResult.stdout || `exit code ${lookupResult.exitCode}`,
          )}`,
        );
      }

      let httpResponse: MlflowHttpResponse;
      try {
        httpResponse = parseMlflowHttpResponse(lookupResult.stdout);
      } catch (error) {
        return failLookup(
          `MLflow experiment lookup failed: ${maskSensitiveInfo(
            error instanceof Error ? error.message : String(error),
          )}`,
        );
      }
      let parsedResponse: unknown;
      try {
        parsedResponse = JSON.parse(httpResponse.body) as unknown;
      } catch {
        return failLookup(
          `MLflow returned an invalid experiment lookup response for ${experimentName}`,
        );
      }
      if (!isMlflowExperimentLookupResponse(parsedResponse)) {
        return failLookup(
          `MLflow returned an invalid experiment lookup response for ${experimentName}`,
        );
      }
      const response = parsedResponse;

      const errorCode = response.error_code ?? response.error?.code;
      if (errorCode === 'RESOURCE_DOES_NOT_EXIST') {
        return cy.wrap<EvalHubMlflowExperiment | null>(
          { experimentId: '', lifecycleStage: 'missing' },
          { log: false },
        );
      }
      if (httpResponse.status < 200 || httpResponse.status >= 300) {
        return failLookup(
          `MLflow experiment lookup returned HTTP ${httpResponse.status}: ${maskSensitiveInfo(
            response.message ?? response.error?.message ?? httpResponse.body,
          )}`,
        );
      }
      if (errorCode) {
        return failLookup(
          `MLflow experiment lookup failed for ${experimentName}: ${
            response.message ?? response.error?.message ?? errorCode
          }`,
        );
      }

      const experimentId = response.experiment?.experiment_id;
      const lifecycleStage = response.experiment?.lifecycle_stage;
      if (!experimentId || !lifecycleStage) {
        return failLookup(
          `MLflow lookup did not return complete experiment details for ${experimentName}`,
        );
      }
      return cy.wrap<EvalHubMlflowExperiment | null>(
        { experimentId, lifecycleStage },
        { log: false },
      );
    },
  );
};

const deleteEvalHubMlflowExperiment = (
  workspace: string,
  experimentId: string,
): Cypress.Chainable<MlflowDeleteAttempt> => {
  const applicationsNamespace = assertNamespace(getApplicationsNamespace());
  const safeWorkspace = assertNamespace(workspace);
  const escapedBody = JSON.stringify({ experiment_id: experimentId }).replace(/'/g, "'\\''"); // eslint-disable-line camelcase
  const curlCommand = [
    `printf '%s' '${escapedBody}'`,
    '|',
    `oc --request-timeout=15s exec -n ${applicationsNamespace} -i "$pod_name" -c mlflow --`,
    `curl -skS --connect-timeout 5 --max-time ${EVALHUB_MLFLOW_CLEANUP_CURL_TIMEOUT_SECONDS} ` +
      "-X POST 'https://localhost:8443/mlflow/api/2.0/mlflow/experiments/delete'",
    "-H 'Content-Type: application/json'",
    '-H "Authorization: Bearer $(oc whoami -t)"',
    `-H 'X-MLFLOW-WORKSPACE: ${safeWorkspace}'`,
    '--data-binary @-',
  ].join(' ');
  const command = [
    ...getMlflowPodLookupCommand(applicationsNamespace),
    ...captureMlflowHttpResponse(curlCommand, false),
  ].join('\n');

  // A failed or ambiguous POST must be reconciled by reading experiment state before it is replayed.
  return execEvalHubMlflowCleanupCommand(command, 1).then((commandResult) => {
    if (commandResult.exitCode !== 0) {
      return cy.wrap<MlflowDeleteAttempt>({ commandResult }, { log: false });
    }
    try {
      return cy.wrap<MlflowDeleteAttempt>(
        { commandResult, httpResponse: parseMlflowHttpResponse(commandResult.stdout) },
        { log: false },
      );
    } catch {
      return cy.wrap<MlflowDeleteAttempt>({ commandResult }, { log: false });
    }
  });
};

const getMlflowDeleteError = (experimentName: string, responseText: string): string | undefined => {
  if (!responseText.trim()) {
    return undefined;
  }

  let parsedResponse: unknown;
  try {
    parsedResponse = JSON.parse(responseText) as unknown;
  } catch {
    return `MLflow returned an invalid delete response for ${experimentName}`;
  }
  if (!isMlflowExperimentLookupResponse(parsedResponse)) {
    return `MLflow returned an invalid delete response for ${experimentName}`;
  }
  const response = parsedResponse;

  const errorCode = response.error_code ?? response.error?.code;
  if (errorCode) {
    return `MLflow experiment deletion failed for ${experimentName}: ${
      response.message ?? response.error?.message ?? errorCode
    }`;
  }
  return undefined;
};

/** Soft-deletes an EvalHub test experiment from its MLflow workspace when it exists. */
export const cleanupEvalHubMlflowExperiment = (
  workspace: string,
  experimentName: string,
  reportFailure?: (message: string) => void,
): Cypress.Chainable<boolean> =>
  getEvalHubMlflowExperiment(workspace, experimentName, reportFailure).then<boolean>(
    (experiment) => {
      if (!experiment) {
        return cy.wrap<boolean>(false, { log: false });
      }
      const { experimentId, lifecycleStage } = experiment;
      if (!experimentId) {
        cy.log(`MLflow experiment ${experimentName} not found in workspace ${workspace}`);
        return cy.wrap<boolean>(false, { log: false });
      }
      if (lifecycleStage === 'deleted') {
        cy.log(`MLflow experiment ${experimentName} is already deleted in workspace ${workspace}`);
        return cy.wrap<boolean>(false, { log: false });
      }

      cy.log(`Deleting MLflow experiment ${experimentName} from workspace ${workspace}`);
      const deleteWithReconciliation = (attempt = 1): Cypress.Chainable<boolean> =>
        deleteEvalHubMlflowExperiment(workspace, experimentId).then(
          ({ commandResult, httpResponse }) => {
            const commandFailed = commandResult.exitCode !== 0;
            const status = httpResponse?.status;
            const retryableStatus =
              status !== undefined && RETRYABLE_MLFLOW_HTTP_STATUSES.has(status);
            const needsStateCheck = commandFailed || retryableStatus || status === 404;

            if (needsStateCheck) {
              return getEvalHubMlflowExperiment(workspace, experimentName, reportFailure).then(
                (current) => {
                  if (!current) {
                    return cy.wrap<boolean>(false, { log: false });
                  }
                  if (!current.experimentId || current.lifecycleStage === 'deleted') {
                    cy.log(
                      `MLflow experiment ${experimentName} is deleted after an ambiguous delete response.`,
                    );
                    return cy.wrap<boolean>(true, { log: false });
                  }

                  const failure = commandFailed
                    ? maskSensitiveInfo(
                        commandResult.stderr ||
                          commandResult.stdout ||
                          `oc exec exited with code ${commandResult.exitCode}`,
                      )
                    : `HTTP ${String(status)}: ${maskSensitiveInfo(
                        httpResponse?.body || 'empty response',
                      )}`;
                  if (!commandFailed && !retryableStatus) {
                    const message = `MLflow experiment deletion returned ${failure} and the experiment remains active.`;
                    if (reportFailure) {
                      reportFailure(message);
                      return cy.wrap<boolean>(false, { log: false });
                    }
                    throw new Error(message);
                  }
                  if (attempt >= DEFAULT_EVALHUB_MLFLOW_CLEANUP_MAX_ATTEMPTS) {
                    const message =
                      `MLflow experiment deletion failed after ${attempt} attempts; ` +
                      `the experiment remains ${current.lifecycleStage}: ${failure}`;
                    if (reportFailure) {
                      reportFailure(message);
                      return cy.wrap<boolean>(false, { log: false });
                    }
                    throw new Error(message);
                  }

                  cy.log(
                    `MLflow delete attempt ${attempt} returned an ambiguous result; the experiment ` +
                      'is still active. Re-resolving the tracking pod before retrying.',
                  );
                  return deleteWithReconciliation(attempt + 1);
                },
              );
            }

            if (!httpResponse) {
              const message = 'MLflow deletion command returned no HTTP response.';
              if (reportFailure) {
                reportFailure(message);
                return cy.wrap<boolean>(false, { log: false });
              }
              throw new Error(message);
            }
            if (status === undefined || status < 200 || status >= 300) {
              const message = `MLflow experiment deletion returned HTTP ${String(
                status,
              )}: ${maskSensitiveInfo(httpResponse.body || 'empty response')}`;
              if (reportFailure) {
                reportFailure(message);
                return cy.wrap<boolean>(false, { log: false });
              }
              throw new Error(message);
            }

            const deleteError = getMlflowDeleteError(experimentName, httpResponse.body);
            if (deleteError) {
              if (reportFailure) {
                reportFailure(deleteError);
                return cy.wrap<boolean>(false, { log: false });
              }
              throw new Error(deleteError);
            }
            return getEvalHubMlflowExperiment(workspace, experimentName, reportFailure).then(
              (deletedExperiment) => {
                if (!deletedExperiment) {
                  return cy.wrap<boolean>(false, { log: false });
                }
                if (
                  deletedExperiment.experimentId &&
                  deletedExperiment.lifecycleStage !== 'deleted'
                ) {
                  const message =
                    `MLflow experiment ${experimentName} is still ${deletedExperiment.lifecycleStage} ` +
                    `after deletion (ID ${deletedExperiment.experimentId})`;
                  if (reportFailure) {
                    reportFailure(message);
                    return cy.wrap<boolean>(false, { log: false });
                  }
                  throw new Error(message);
                }
                return cy.wrap<boolean>(true, { log: false });
              },
            );
          },
        );

      return deleteWithReconciliation();
    },
  );

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

/** Checks the Kueue APIs and runtime before provisioning queue-backed EvalHub tests. */
export const isEvalHubKueueAvailable = (): Cypress.Chainable<boolean> => {
  const requiredCrds = [
    'workloads.kueue.x-k8s.io',
    'clusterqueues.kueue.x-k8s.io',
    'localqueues.kueue.x-k8s.io',
    'resourceflavors.kueue.x-k8s.io',
  ];

  return cy
    .exec(`oc get crd ${requiredCrds.join(' ')} --ignore-not-found -o name`, {
      failOnNonZeroExit: false,
    })
    .then((crdResult) => {
      if (crdResult.exitCode !== 0) {
        throw new Error(`Unable to check Kueue CRDs: ${crdResult.stderr || crdResult.stdout}`);
      }

      const installedCrds = crdResult.stdout.split(/\s+/);
      const hasRequiredCrds = requiredCrds.every((crd) =>
        installedCrds.some((item) => item.endsWith(`/${crd}`)),
      );

      return cy
        .exec(
          "oc get pods -A -o 'custom-columns=NAME:.metadata.name,PHASE:.status.phase,IMAGES:.spec.containers[*].image' --no-headers",
          { failOnNonZeroExit: false },
        )
        .then((podsResult) => {
          if (podsResult.exitCode !== 0) {
            throw new Error(
              `Unable to check Kueue runtime: ${podsResult.stderr || podsResult.stdout}`,
            );
          }

          const hasRunningController = podsResult.stdout.split('\n').some((line) => {
            const [name, phase, images] = line.trim().split(/\s+/);
            if (!name || !images || phase !== 'Running') {
              return false;
            }
            return (
              /kueue.*controller|controller.*kueue/i.test(name) ||
              images
                .split(',')
                .some((image) => /\/kueue(?:-controller|-rhel\d+)?(?:[:@]|$)/i.test(image))
            );
          });
          return hasRequiredCrds && hasRunningController;
        });
    });
};

/** Confirms that the submitted EvalHub run was scheduled through the selected LocalQueue. */
export const waitForEvalHubKueueWorkload = (
  namespace: string,
  localQueueName: string,
): Cypress.Chainable<Cypress.Exec> =>
  pollUntilSuccess(
    `oc get workloads -n ${assertNamespace(namespace)} -o json | ` +
      `jq -e '[.items[] | select(.spec.queueName == "${assertNamespace(
        localQueueName,
      )}")] | length > 0'`,
    `EvalHub Kueue Workload in LocalQueue ${localQueueName}`,
    { maxAttempts: 24, pollIntervalMs: 5000 },
  );

/**
 * Polls until all evaluation Jobs in the namespace have reached a terminal state.
 *
 * The first poll requires a Job to exist so an empty namespace cannot be treated as
 * a completed evaluation. Once a Job has been observed, an empty list is accepted
 * because the Kubernetes TTL controller may delete completed Jobs before the next poll.
 * Works for both single-benchmark runs (1 Job) and benchmark collection runs (N Jobs).
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
