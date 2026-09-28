import { applyOpenShiftYaml, pollUntilSuccess } from './baseCommands';
import { createEvalHubHardwareProfile } from './evalHubHardwareProfile';
import { checkInferenceServiceState } from './modelServing';
import type { CommandLineResult, EvalHubTestData } from '../../types';

const EVALHUB_DISCOVERY_CONFIGMAP = 'evalhub-discovery';
const EVALHUB_DISCOVERY_URL_KEY = 'service-url';
const EVALHUB_JOB_CONFIG_CLUSTER_ROLE = 'trustyai-service-operator-evalhub-job-config';
const EVALHUB_JOBS_WRITER_CLUSTER_ROLE = 'trustyai-service-operator-evalhub-jobs-writer';
const KUBERNETES_NAME_RE = /^[a-z0-9](?:[-a-z0-9]{0,61}[a-z0-9])?$/;
const KSERVE_APPLY_MAX_ATTEMPTS = 4;
const KSERVE_APPLY_RETRY_INTERVAL_MS = 5000;

type EvalHubDiscoveryConfigMap = {
  data?: Partial<Record<string, string>>;
};

type EvalHubServiceTarget = {
  serviceName: string;
  serviceNamespace: string;
};

type EvalHubServiceIdentity = EvalHubServiceTarget & {
  serviceAccountName: string;
};

const isTransientKServeWebhookError = (output: string): boolean =>
  output.includes('failed calling webhook') &&
  ['context deadline exceeded', 'connection refused', 'no endpoints available for service'].some(
    (message) => output.includes(message),
  );

const applyKServeResource = (
  namespace: string,
  filePath: string,
  resourceDescription: string,
  attempt = 1,
): Cypress.Chainable<CommandLineResult> =>
  cy
    .exec(`oc apply -n ${namespace} -f ${filePath}`, { failOnNonZeroExit: false })
    .then((result) => {
      if (result.exitCode === 0) {
        return cy.wrap(result);
      }

      const output = result.stderr || result.stdout;
      if (isTransientKServeWebhookError(output) && attempt < KSERVE_APPLY_MAX_ATTEMPTS) {
        cy.log(
          `${resourceDescription} admission webhook was unavailable; retrying ` +
            `(${attempt}/${KSERVE_APPLY_MAX_ATTEMPTS})`,
        );
        // eslint-disable-next-line cypress/no-unnecessary-waiting -- bounded webhook readiness backoff
        return cy
          .wait(KSERVE_APPLY_RETRY_INTERVAL_MS)
          .then(() => applyKServeResource(namespace, filePath, resourceDescription, attempt + 1));
      }

      throw new Error(`${resourceDescription} apply failed: ${output}`);
    });

const assertKubernetesName = (value: string, description: string): string => {
  if (!KUBERNETES_NAME_RE.test(value)) {
    throw new Error(`${description} must be a DNS-1123 name; received '${value}'.`);
  }
  return value;
};

/**
 * Mirrors the EvalHub BFF's discovery selection. Each supported E2E environment has one
 * multi-tenant EvalHub instance, either pre-existing or provisioned by the test.
 */
const resolveDiscoveryURL = (data: Partial<Record<string, string>>): string => {
  let selectedKey = '';
  let selectedURL = '';

  Object.entries(data).forEach(([key, value]) => {
    const url = value?.trim() ?? '';
    if (key.endsWith('.url') && url && (!selectedKey || key < selectedKey)) {
      selectedKey = key;
      selectedURL = url;
    }
  });

  return selectedURL || data[EVALHUB_DISCOVERY_URL_KEY]?.trim() || '';
};

const resolveEvalHubServiceTarget = (serviceURL: string): EvalHubServiceTarget => {
  let endpoint: URL;
  try {
    endpoint = new URL(serviceURL);
  } catch {
    throw new Error(`EvalHub discovery ConfigMap has an invalid service URL: '${serviceURL}'.`);
  }

  if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password) {
    throw new Error(`EvalHub discovery ConfigMap has an unsafe service URL: '${serviceURL}'.`);
  }

  const { hostname } = endpoint;
  const serviceHost = hostname.endsWith('.svc.cluster.local')
    ? hostname.slice(0, -'.svc.cluster.local'.length)
    : hostname.endsWith('.svc')
    ? hostname.slice(0, -'.svc'.length)
    : '';
  const [serviceName, serviceNamespace, ...unexpectedHostParts] = serviceHost.split('.');

  if (unexpectedHostParts.length > 0 || !serviceName.startsWith('evalhub') || !serviceNamespace) {
    throw new Error(
      `EvalHub discovery URL must identify an in-cluster EvalHub service; received '${serviceURL}'.`,
    );
  }

  return {
    serviceName: assertKubernetesName(serviceName, 'EvalHub service name'),
    serviceNamespace: assertKubernetesName(serviceNamespace, 'EvalHub service namespace'),
  };
};

const getEvalHubServiceIdentity = (
  tenantNamespace: string,
): Cypress.Chainable<EvalHubServiceIdentity> =>
  cy
    .exec(`oc -n ${tenantNamespace} get configmap ${EVALHUB_DISCOVERY_CONFIGMAP} -o json`, {
      failOnNonZeroExit: false,
    })
    .then((result) => {
      if (result.exitCode !== 0) {
        throw new Error(
          `Unable to read ${EVALHUB_DISCOVERY_CONFIGMAP} in ${tenantNamespace}: ${
            result.stderr || result.stdout
          }`,
        );
      }

      let discoveryConfigMap: EvalHubDiscoveryConfigMap;
      try {
        discoveryConfigMap = JSON.parse(result.stdout) as EvalHubDiscoveryConfigMap;
      } catch {
        throw new Error(
          `Unable to parse ${EVALHUB_DISCOVERY_CONFIGMAP} in ${tenantNamespace} as JSON.`,
        );
      }

      const serviceURL = resolveDiscoveryURL(discoveryConfigMap.data ?? {});
      if (!serviceURL) {
        throw new Error(
          `${EVALHUB_DISCOVERY_CONFIGMAP} in ${tenantNamespace} does not contain an EvalHub service URL.`,
        );
      }

      return resolveEvalHubServiceTarget(serviceURL);
    })
    .then(({ serviceName, serviceNamespace }) =>
      cy
        .exec(
          `oc -n ${serviceNamespace} get deployment ${serviceName} ` +
            "-o jsonpath='{.spec.template.spec.serviceAccountName}'",
          { failOnNonZeroExit: false },
        )
        .then((result) => {
          if (result.exitCode !== 0) {
            throw new Error(
              `Unable to read EvalHub deployment ${serviceNamespace}/${serviceName}: ${
                result.stderr || result.stdout
              }`,
            );
          }

          return {
            serviceName,
            serviceNamespace,
            serviceAccountName: assertKubernetesName(
              result.stdout.trim(),
              `service account for EvalHub deployment ${serviceNamespace}/${serviceName}`,
            ),
          };
        }),
    );

const renderEvalHubJobRoleBindings = ({
  serviceNamespace,
  serviceAccountName,
}: EvalHubServiceIdentity): string => `
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: e2e-evalhub-job-config
  labels:
    opendatahub.io/dashboard-e2e-evalhub-tenant-rbac: 'true'
subjects:
  - kind: ServiceAccount
    name: ${serviceAccountName}
    namespace: ${serviceNamespace}
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: ${EVALHUB_JOB_CONFIG_CLUSTER_ROLE}
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: e2e-evalhub-jobs-writer
  labels:
    opendatahub.io/dashboard-e2e-evalhub-tenant-rbac: 'true'
subjects:
  - kind: ServiceAccount
    name: ${serviceAccountName}
    namespace: ${serviceNamespace}
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: ${EVALHUB_JOBS_WRITER_CLUSTER_ROLE}
`;

const assertEvalHubJobPermission = (
  tenantNamespace: string,
  { serviceNamespace, serviceAccountName }: EvalHubServiceIdentity,
  resource: 'configmaps' | 'jobs',
): Cypress.Chainable<Cypress.Exec> =>
  cy
    .exec(
      `oc auth can-i --quiet create ${resource} ` +
        `--as=system:serviceaccount:${serviceNamespace}:${serviceAccountName} -n ${tenantNamespace}`,
      { failOnNonZeroExit: false },
    )
    .then((result) => {
      if (result.exitCode !== 0) {
        throw new Error(
          `EvalHub service account ${serviceNamespace}/${serviceAccountName} cannot create ${resource} ` +
            `in evaluation namespace ${tenantNamespace}.`,
        );
      }
      return result;
    });

const waitForEvalHubTenantResources = (
  tenantNamespace: string,
  { serviceNamespace }: EvalHubServiceIdentity,
): Cypress.Chainable<Cypress.Exec> => {
  const jobServiceAccountName = assertKubernetesName(
    `evalhub-${serviceNamespace}-job`,
    'operator-provisioned EvalHub Job ServiceAccount name',
  );
  const jobAccessRoleName = assertKubernetesName(
    `evalhub-${serviceNamespace}-job-access-role`,
    'operator-provisioned EvalHub Job access Role name',
  );

  return pollUntilSuccess(
    `oc -n ${tenantNamespace} get sa ${jobServiceAccountName} -o name`,
    `operator-provisioned ServiceAccount ${jobServiceAccountName}`,
    { maxAttempts: 30, pollIntervalMs: 2000 },
  )
    .then(() =>
      pollUntilSuccess(
        `oc -n ${tenantNamespace} get configmap evalhub-service-ca -o name`,
        'operator-provisioned evalhub-service-ca ConfigMap',
        { maxAttempts: 30, pollIntervalMs: 2000 },
      ),
    )
    .then(() =>
      pollUntilSuccess(
        `oc -n ${tenantNamespace} get role ${jobAccessRoleName} -o name`,
        `operator-provisioned status-events Role ${jobAccessRoleName}`,
        { maxAttempts: 30, pollIntervalMs: 2000 },
      ),
    );
};

const ensureEvalHubTenantJobAccess = (tenantNamespace: string): void => {
  pollUntilSuccess(
    `oc -n ${tenantNamespace} get configmap ${EVALHUB_DISCOVERY_CONFIGMAP} -o name`,
    'operator-provisioned EvalHub discovery ConfigMap',
    { maxAttempts: 30, pollIntervalMs: 2000 },
  ).then(() =>
    getEvalHubServiceIdentity(tenantNamespace).then((serviceIdentity) => {
      return waitForEvalHubTenantResources(tenantNamespace, serviceIdentity).then(() => {
        cy.step(
          `Grant EvalHub ${serviceIdentity.serviceNamespace}/${serviceIdentity.serviceAccountName} job access in tenant`,
        );
        return applyOpenShiftYaml(renderEvalHubJobRoleBindings(serviceIdentity), tenantNamespace)
          .then((result) => {
            if (result.exitCode !== 0) {
              throw new Error(
                `Failed to grant EvalHub job access in ${tenantNamespace}: ${
                  result.stderr || result.stdout
                }`,
              );
            }
            return assertEvalHubJobPermission(tenantNamespace, serviceIdentity, 'configmaps');
          })
          .then(() => assertEvalHubJobPermission(tenantNamespace, serviceIdentity, 'jobs'));
      });
    }),
  );
};

/**
 * Grants a user EvalHub tenant access in the namespace. Creates the `evalhub-evaluator` Role
 * (evaluations, collections, providers + MLflow experiments) and binds the user to it.
 */
export function grantEvalHubTenantAccess(ns: string, username: string): void {
  const roleYaml = `
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: evalhub-evaluator
  namespace: ${ns}
rules:
  - apiGroups: ["trustyai.opendatahub.io"]
    resources: ["evaluations", "collections", "providers"]
    verbs: ["get", "list", "create", "update", "delete"]
  - apiGroups: ["mlflow.kubeflow.org"]
    resources: ["experiments"]
    verbs: ["create", "get"]
`;
  const tmpFile = `/tmp/evalhub-evaluator-role-${ns}.yaml`;
  cy.writeFile(tmpFile, roleYaml);
  cy.exec(`oc apply -f ${tmpFile}`, { failOnNonZeroExit: false });
  cy.exec(
    `oc create rolebinding e2e-tenant-evaluator --role=evalhub-evaluator --user=${username} -n ${ns}`,
    { failOnNonZeroExit: false },
  );
}

/** Removes the EvalHub tenant label before deleting an E2E tenant namespace. */
export function removeEvalHubTenantLabel(ns: string): Cypress.Chainable<Cypress.Exec> {
  return cy
    .exec(`oc get namespace ${ns} --ignore-not-found -o name`, {
      failOnNonZeroExit: false,
    })
    .then((result) => {
      if (result.exitCode !== 0) {
        throw new Error(
          `Failed to check EvalHub tenant namespace ${ns}: ${result.stderr || result.stdout}`,
        );
      }
      if (!result.stdout.trim()) {
        return cy.wrap(result);
      }

      return cy
        .exec(`oc label namespace ${ns} evalhub.trustyai.opendatahub.io/tenant-`, {
          failOnNonZeroExit: false,
        })
        .then((labelResult) => {
          if (labelResult.exitCode !== 0) {
            throw new Error(
              `Failed to remove EvalHub tenant label from ${ns}: ${
                labelResult.stderr || labelResult.stdout
              }`,
            );
          }
          return labelResult;
        });
    });
}

export function getVllmEndpointUrl(
  td: Omit<EvalHubTestData, 'benchmarkCardTitle'>,
  ns: string,
): string {
  return `http://${td.inferenceServiceName}-predictor.${ns}.svc.cluster.local:8080`;
}

export function setupTenantAndDeployModel(
  ns: string,
  td: Omit<EvalHubTestData, 'benchmarkCardTitle'>,
  hwProfileName: string,
): void {
  cy.step('Label namespace so TrustyAI operator provisions tenant RBAC');
  cy.exec(
    `oc label namespace ${ns} opendatahub.io/generated-namespace=true evalhub.trustyai.opendatahub.io/tenant= --overwrite`,
  );

  cy.step('Wait for operator to reconcile tenant resources');
  ensureEvalHubTenantJobAccess(ns);

  cy.step('Deploy vLLM model in tenant namespace');
  const {
    inferenceServiceName,
    modelOciUri,
    servingRuntimeYamlPath,
    hardwareProfileResourceYamlPath,
  } = td;

  createEvalHubHardwareProfile(hardwareProfileResourceYamlPath, hwProfileName);

  cy.fixture(servingRuntimeYamlPath, 'utf8').then((srYaml: string) => {
    const tmpFile = `/tmp/evalhub-sr-${ns}.yaml`;
    cy.writeFile(tmpFile, srYaml);
    applyKServeResource(ns, tmpFile, 'ServingRuntime');
  });

  cy.fixture('resources/eval-hub/evalhub-inference-service.yaml', 'utf8').then(
    (isvcTemplate: string) => {
      const isvcYaml = isvcTemplate
        .replace('__ISVC_NAME__', inferenceServiceName)
        .replace('__HW_PROFILE__', hwProfileName)
        .replace('__MODEL_URI__', modelOciUri);
      const isvcTmpFile = `/tmp/evalhub-isvc-${ns}.yaml`;
      cy.writeFile(isvcTmpFile, isvcYaml);
      applyKServeResource(ns, isvcTmpFile, 'InferenceService');
    },
  );

  cy.step('Wait for InferenceService to be Ready');
  checkInferenceServiceState(inferenceServiceName, ns, { checkReady: true });
}
