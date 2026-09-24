import { pollUntilSuccess } from './baseCommands';
import { assertNamespace, deleteMlflowExperimentViaAPI } from './mlflow';
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

const EVALHUB_PROVISION_IF_MISSING_ENV = 'CY_EVAL_HUB_PROVISION_IF_MISSING';
const EVALHUB_EXISTING_NAMESPACE_ENV = 'CY_EVAL_HUB_EXISTING_NAMESPACE';
const DEFAULT_EXISTING_EVALHUB_NAMESPACE = 'evalhub';
const KUBERNETES_NAME_RE = /^[a-z0-9](?:[-a-z0-9]{0,61}[a-z0-9])?$/;

const formatInstance = ({ name, namespace, managedByE2e }: EvalHubInstance): string =>
  `${namespace}/${name}${managedByE2e ? ' (E2E-provisioned)' : ''}`;

/**
 * Resolves the multi-tenant EvalHub instance that the Dashboard BFF will use.
 *
 * Single-tenant CRs do not reconcile labelled tenant namespaces and are ignored. Different
 * multi-tenant CR names are supported because the operator gives each one its own `<name>.url`
 * discovery key. The BFF deterministically selects the lexicographically smallest key.
 * Multiple multi-tenant CRs with the same name are unsafe because they overwrite the same key.
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
  cy.log(`Applying EvalHub CR ${crName} in ${namespace} (operator will create service)`);

  return cy.fixture(fixturePathRelativeToFixtures, 'utf8').then((yamlContent: string) => {
    const patchedYaml = yamlContent.replace(
      /mlflow\.redhat-ods-applications\.svc/g,
      `mlflow.${namespace}.svc`,
    );
    const tmpFile = `/tmp/evalhub-cr-${namespace}-${crName}-${Date.now()}.yaml`;
    cy.writeFile(tmpFile, patchedYaml);

    return cy
      .exec(`oc apply -f "${tmpFile}" -n ${namespace}`, { failOnNonZeroExit: false })
      .then((applyResult) =>
        listEvalHubResources().then((resources) => {
          const instance = resolveEvalHubInstance(resources);
          if (!instance) {
            const maskedOutput = maskSensitiveInfo(applyResult.stderr || applyResult.stdout || '');
            throw new Error(
              applyResult.exitCode === 0
                ? `EvalHub manifest applied, but no multi-tenant EvalHub instance was found.`
                : `oc apply EvalHub failed and no concurrent instance was found: ${maskedOutput}`,
            );
          }

          if (applyResult.exitCode !== 0) {
            cy.log(
              'EvalHub apply did not succeed, but another runner provisioned a usable instance; reusing it',
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

    return provisionEvalHub(safeCrName, fixturePathRelativeToFixtures);
  });
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
