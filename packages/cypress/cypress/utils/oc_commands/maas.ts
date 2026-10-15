import { getClusterAppsDomain } from './baseCommands';
import type { CommandLineResult } from '../../types';
import { Path } from '../../types';
import { replacePlaceholdersInYaml } from '../../utils/yaml_files';

export const modelsAsAServiceNamespace = 'models-as-a-service';

/** OpenShift Route that exposes the shared MaaS API gateway. */
const maasGatewayRouteName = 'maas-gateway-route';
const maasGatewayRouteNamespace = 'openshift-ingress';

/** LLM completions can exceed Cypress's default 30s `cy.request` timeout (especially with high `max_tokens`). */
const completionsRequestTimeoutMs = 180000;

/** DNS-1123 label: lowercase alphanumeric + hyphens, max 63 characters. */
const K8S_DNS1123_LABEL_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/**
 * Rejects values that are unsafe to interpolate into `oc` / shell commands (CWE-78).
 * K8s resource names and namespaces used by these helpers must be DNS-1123 labels.
 */
const assertValidK8sLabel = (value: string, description: string): string => {
  if (!value || !K8S_DNS1123_LABEL_RE.test(value)) {
    throw new Error(
      `Invalid ${description}: '${value}' must be a DNS-1123 label (lowercase alphanumeric and hyphens, max 63 characters).`,
    );
  }
  return value;
};

const assertValidK8sNamespace = (namespace: string): string =>
  assertValidK8sLabel(namespace, 'namespace');

/** Quote a shell argument after allowlist validation (defense in depth for cy.exec). */
const quoteShellArg = (value: string): string => `"${value}"`;

/** Status phases used with `oc wait` (e.g. Ready, Active) — alphanumeric only. */
const assertValidK8sPhase = (phase: string): string => {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(phase)) {
    throw new Error(
      `Invalid phase: '${phase}' must be an alphanumeric Kubernetes status phase name.`,
    );
  }
  return phase;
};

/**
 * Resolves the MaaS API gateway hostname from the cluster Route
 * (`maas-gateway-route` in `openshift-ingress`).
 *
 * @returns Hostname only (e.g. `maas.apps.my-cluster.example.com`), no scheme.
 */
export const getGatewayHostForMaaS = (): Cypress.Chainable<string> => {
  const routeName = assertValidK8sLabel(maasGatewayRouteName, 'MaaS gateway route name');
  const routeNamespace = assertValidK8sNamespace(maasGatewayRouteNamespace);
  const ocCommand = `oc get route ${quoteShellArg(routeName)} -n ${quoteShellArg(
    routeNamespace,
  )} -o jsonpath='{.spec.host}'`;
  cy.log(`Resolving MaaS gateway host: ${ocCommand}`);
  return cy.exec(ocCommand, { failOnNonZeroExit: true }).then((result: CommandLineResult) => {
    const host = result.stdout.trim().replace(/^'|'$/g, '');
    if (!host) {
      throw new Error(`MaaS gateway Route ${routeNamespace}/${routeName} has an empty .spec.host`);
    }
    cy.log(`✅ MaaS gateway host: ${host}`);
    return cy.wrap(host);
  });
};

/**
 * Builds the tenant-scoped MaaS inference URL for a model
 * (LLMInferenceService or ExternalModel).
 *
 * Host + tenant prefix stay the same; only `apiPath` changes by format:
 * - OpenAI Chat → `/v1/chat/completions` (default)
 * - Anthropic Messages → `/v1/messages`
 *
 * Example:
 * `https://maas.apps…/test-external-models-115451/e2e-external-model-115451/v1/chat/completions`
 */
export const buildMaaSInferenceUrl = (
  gatewayHost: string,
  namespace: string,
  modelName: string,
  apiPath: string = Path.OPENAI_CHAT,
): string => {
  const host = gatewayHost.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const ns = namespace.replace(/^\/+|\/+$/g, '');
  const model = modelName.replace(/^\/+|\/+$/g, '');
  const path = apiPath.startsWith('/') ? apiPath : `/${apiPath}`;
  return `https://${host}/${ns}/${model}${path}`;
};

const ocGetIndicatesResourceNotFound = (result: Cypress.Exec): boolean => {
  const combined = `${result.stderr}\n${result.stdout}`;
  return /not found/i.test(combined) || /\bNotFound\b/.test(combined);
};

/**
 * Type for MaaS Resource Condition
 */
type MaaSResourceCondition = {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
  observedGeneration?: number;
};

/**
 * Type for MaaS ModelRef Status
 */
type MaaSModelRefStatus = {
  name: string;
  namespace: string;
  ready?: boolean;
  reason?: string;
  message?: string;
};

/**
 * Type for MaaS TokenRateLimit Status
 */
type MaaSTokenRateLimitStatus = {
  name: string;
  namespace: string;
  model?: string;
  ready?: boolean;
  reason?: string;
  message?: string;
};

/**
 * Type for MaaS Resource Status
 */
type MaaSResourceStatus = {
  phase?: string;
  conditions?: MaaSResourceCondition[];
  modelRefStatuses?: MaaSModelRefStatus[];
  tokenRateLimitStatuses?: MaaSTokenRateLimitStatus[];
};

/**
 * Type for MaaS named reference (group or model ref name)
 */
type MaaSNamedReference = {
  name: string;
  namespace?: string;
};

/**
 * Type for MaaS subscription model ref spec entry
 */
type MaaSSubscriptionModelRef = {
  name: string;
  namespace: string;
  tokenRateLimits?: {
    limit: number;
    window: string;
  }[];
};

/**
 * Type for MaaSSubscription State
 */
type MaaSSubscriptionState = {
  kind?: string;
  metadata?: {
    name?: string;
    namespace?: string;
    annotations?: Record<string, string>;
  };
  spec?: {
    modelRefs?: MaaSSubscriptionModelRef[];
    owner?: {
      groups?: MaaSNamedReference[];
    };
    priority?: number;
  };
  status?: MaaSResourceStatus;
};

/**
 * Type for MaaSAuthPolicy State
 */
type MaaSAuthPolicyState = {
  kind?: string;
  metadata?: {
    name?: string;
    namespace?: string;
    annotations?: Record<string, string>;
  };
  spec?: {
    subjects?: {
      groups?: MaaSNamedReference[];
    };
    modelRefs?: MaaSNamedReference[];
  };
  status?: MaaSResourceStatus;
};

export type CheckMaaSOptions = {
  expectDeleted?: boolean;
  groups?: string[];
  models?: string[];
  phase?: string;
  maxAttempts?: number;
  retryIntervalMs?: number;
};

/** Default poll budget for MaaS subscription/policy phase checks (24 attempts × 5s ≈ 2 min). */
export const MAAS_STATE_DEFAULT_MAX_ATTEMPTS = 24;
export const MAAS_STATE_DEFAULT_RETRY_INTERVAL_MS = 5000;

type MaaSOptionsCheckResult = { met: true } | { met: false; reason: string; retryable: boolean };

export const cleanupSubscription = (
  subscriptionName: string,
  namespace: string,
): Cypress.Chainable<CommandLineResult> => {
  const name = assertValidK8sLabel(subscriptionName, 'subscription name');
  const ns = assertValidK8sNamespace(namespace);
  const ocCommand = `oc delete MaaSSubscription ${quoteShellArg(name)} -n ${quoteShellArg(
    ns,
  )} --ignore-not-found`;
  cy.log(`Executing delete subscription command: ${ocCommand}`);
  return cy.exec(ocCommand, { failOnNonZeroExit: false });
};

export const cleanupAuthPolicy = (
  authPolicyName: string,
  namespace: string,
): Cypress.Chainable<CommandLineResult> => {
  const name = assertValidK8sLabel(authPolicyName, 'auth policy name');
  const ns = assertValidK8sNamespace(namespace);
  const ocCommand = `oc delete MaaSAuthPolicy ${quoteShellArg(name)} -n ${quoteShellArg(
    ns,
  )} --ignore-not-found`;
  cy.log(`Executing delete auth policy command: ${ocCommand}`);
  return cy.exec(ocCommand, { failOnNonZeroExit: false });
};

/**
 * Deletes a single API key row from the Postgres `api_keys` table by name.
 *
 * Credentials are read from the `postgres-creds` secret in APPLICATIONS_NAMESPACE.
 * Intended for E2E cleanup of keys created by Cypress tests (matched on `name`).
 *
 * @param apiKeyName Display name of the API key to delete (same value used in the UI).
 */
export const cleanupApiKeys = (apiKeyName: string): Cypress.Chainable<CommandLineResult> => {
  const applicationNamespace = assertValidK8sNamespace(
    Cypress.env('APPLICATIONS_NAMESPACE') as string,
  );
  const escapedName = apiKeyName.replace(/'/g, "''");
  cy.log(`Deleting API key "${apiKeyName}" from Postgres api_keys table`);

  return cy
    .exec(
      `oc get secret postgres-creds -n ${quoteShellArg(
        applicationNamespace,
      )} -o jsonpath='{.data.POSTGRES_USER}' | base64 -d`,
      { failOnNonZeroExit: false },
    )
    .then((userResult) => {
      const pgUser = userResult.stdout.trim();
      return cy
        .exec(
          `oc get secret postgres-creds -n ${quoteShellArg(
            applicationNamespace,
          )} -o jsonpath='{.data.POSTGRES_DB}' | base64 -d`,
          { failOnNonZeroExit: false },
        )
        .then((dbResult) => {
          const pgDb = dbResult.stdout.trim();
          return cy.exec(
            `oc exec -n ${quoteShellArg(
              applicationNamespace,
            )} deployment/postgres -- psql -U "${pgUser}" -d "${pgDb}" -c "DELETE FROM api_keys WHERE name = '${escapedName}';"`,
            { failOnNonZeroExit: false },
          );
        });
    });
};

/**
 * Creates an LLMInferenceService with MaaS enabled by applying a YAML fixture.
 * Substitutes `{{PROJECT_NAME}}`, `{{MODEL_NAME}}`, and optional `{{CONNECTION_NAME}}`
 * placeholders in the fixture.
 *
 * @param projectName - The namespace/project where the LLMInferenceService will be created
 * @param modelName - The name for the LLMInferenceService and model
 * @param fixturePath - Path to the YAML fixture file (relative to cypress/fixtures)
 * @param connectionName - Optional connection name for fixtures that use `{{CONNECTION_NAME}}`
 * @returns Cypress.Chainable with the command result
 */
export const createLLMInferenceServiceWithMaaSEnabled = (
  projectName: string,
  modelName: string,
  fixturePath: string,
  connectionName = '',
): Cypress.Chainable<CommandLineResult> => {
  const project = assertValidK8sNamespace(projectName);
  const model = assertValidK8sLabel(modelName, 'model name');
  if (connectionName) {
    assertValidK8sLabel(connectionName, 'connection name');
  }
  cy.log(`Creating LLMInferenceService "${model}" in namespace "${project}"`);

  return cy.fixture(fixturePath).then((yamlContent: string) => {
    const replacements = {
      PROJECT_NAME: project,
      MODEL_NAME: model,
      CONNECTION_NAME: connectionName,
    };
    const processedYaml = replacePlaceholdersInYaml(yamlContent, replacements);

    const ocCommand = `cat <<'EOF' | oc apply -f -
${processedYaml}
EOF`;

    cy.log(`Applying LLMInferenceService YAML for "${model}" in "${project}"`);
    return cy.exec(ocCommand, { failOnNonZeroExit: false });
  });
};

/**
 * Creates a MaaSModelRef by applying a YAML fixture.
 * Substitutes `{{PROJECT_NAME}}` and `{{MODEL_NAME}}` placeholders in the fixture.
 *
 * @param projectName - The namespace/project where the MaaSModelRef will be created
 * @param modelName - The name for the MaaSModelRef (should match the LLMInferenceService name)
 * @param fixturePath - Path to the YAML fixture file (relative to cypress/fixtures)
 * @returns Cypress.Chainable with the command result
 */
export const createMaaSModelRef = (
  projectName: string,
  modelName: string,
  fixturePath = 'resources/maas/MaaSModelRef.yaml',
): Cypress.Chainable<CommandLineResult> => {
  const project = assertValidK8sNamespace(projectName);
  const model = assertValidK8sLabel(modelName, 'model name');
  cy.log(`Creating MaaSModelRef "${model}" in namespace "${project}"`);

  return cy.fixture(fixturePath).then((yamlContent: string) => {
    const replacements = {
      PROJECT_NAME: project,
      MODEL_NAME: model,
    };
    const processedYaml = replacePlaceholdersInYaml(yamlContent, replacements);

    const ocCommand = `cat <<'EOF' | oc apply -f -
${processedYaml}
EOF`;

    cy.log(`Applying MaaSModelRef YAML for "${model}" in "${project}"`);
    return cy.exec(ocCommand, { failOnNonZeroExit: false });
  });
};

export const createMaaSSubscription = (
  subscriptionName: string,
  subscriptionDescription: string,
  projectName: string,
  modelName: string,
  fixturePath = 'resources/maas/MaaSSubscription.yaml',
  fixtureReplacements: Record<string, string> = {},
): Cypress.Chainable<CommandLineResult> => {
  const name = assertValidK8sLabel(subscriptionName, 'subscription name');
  const project = assertValidK8sNamespace(projectName);
  const model = assertValidK8sLabel(modelName, 'model name');
  cy.log(`Creating MaaSSubscription "${name} through yaml"`);
  return cy.fixture(fixturePath).then((yamlContent: string) => {
    const replacements = {
      SUBSCRIPTION_NAME: name,
      SUBSCRIPTION_DESCRIPTION: subscriptionDescription,
      MODEL_NAME: model,
      PROJECT_NAME: project,
      ...fixtureReplacements,
    };
    const processedYaml = replacePlaceholdersInYaml(yamlContent, replacements);
    const ocCommand = `cat <<'EOF' | oc apply -f -
${processedYaml}
EOF`;
    cy.log(`Applying MaaSSubscription YAML for "${name}"`);
    return cy.exec(ocCommand, { failOnNonZeroExit: true });
  });
};

export const createMaaSAuthPolicy = (
  policyName: string,
  projectName: string,
  modelName: string,
  fixturePath = 'resources/maas/MaaSAuthPolicy.yaml',
  fixtureReplacements: Record<string, string> = {},
): Cypress.Chainable<CommandLineResult> => {
  const name = assertValidK8sLabel(policyName, 'auth policy name');
  const project = assertValidK8sNamespace(projectName);
  const model = assertValidK8sLabel(modelName, 'model name');
  cy.log(`Creating MaaSAuthPolicy "${name} through yaml"`);
  return cy.fixture(fixturePath).then((yamlContent: string) => {
    const replacements = {
      POLICY_NAME: name,
      MODEL_NAME: model,
      PROJECT_NAME: project,
      ...fixtureReplacements,
    };
    const processedYaml = replacePlaceholdersInYaml(yamlContent, replacements);
    const ocCommand = `cat <<'EOF' | oc apply -f -
${processedYaml}
EOF`;
    cy.log(`Applying MaaSAuthPolicy YAML for "${name}"`);
    return cy.exec(ocCommand, { failOnNonZeroExit: true });
  });
};

const applyExternalModelsFixture = (
  resourceLabel: string,
  projectName: string,
  resourceName: string,
  fixturePath: string,
  failOnNonZeroExit = true,
): Cypress.Chainable<CommandLineResult> => {
  const project = assertValidK8sNamespace(projectName);
  const name = assertValidK8sLabel(resourceName, 'resource name');
  cy.log(`Creating ${resourceLabel} "${name}" in namespace "${project}"`);
  return cy.fixture(fixturePath).then((yamlContent: string) => {
    const processedYaml = replacePlaceholdersInYaml(yamlContent, {
      PROJECT_NAME: project,
      RESOURCE_NAME: name,
    });
    const ocCommand = `cat <<'EOF' | oc apply -f -
${processedYaml}
EOF`;
    cy.log(`Applying ${resourceLabel} YAML for "${name}" in "${project}"`);
    return cy.exec(ocCommand, { failOnNonZeroExit });
  });
};

export const createExternalProviderSecret = (
  projectName: string,
  resourceName: string,
  fixturePath = 'resources/maas/ExternalProviderSecret.yaml',
): Cypress.Chainable<CommandLineResult> =>
  applyExternalModelsFixture('Secret', projectName, resourceName, fixturePath);

export function checkSecretExists(
  projectName: string,
  resourceName: string,
): Cypress.Chainable<CommandLineResult> {
  const name = assertValidK8sLabel(resourceName, 'secret name');
  const ns = assertValidK8sNamespace(projectName);
  return cy
    .exec(`oc get secret ${quoteShellArg(name)} -n ${quoteShellArg(ns)}`, {
      failOnNonZeroExit: false,
    })
    .then((result: CommandLineResult) => {
      if (result.exitCode !== 0) {
        throw new Error(
          `Secret ${name} does not exist in namespace ${ns}: ${result.stderr || result.stdout}`,
        );
      }
      return result;
    });
}

type ExternalProviderDoc = {
  status?: {
    phase?: string;
  };
};

/**
 * Verifies an ExternalProvider exists and reaches the expected status phase (default: Ready),
 * or is absent when `expectDeleted` is true.
 * Polls until the condition is met or throws on Failed / timeout.
 */
export const checkExternalProviderExists = (
  projectName: string,
  resourceName: string,
  options: {
    expectDeleted?: boolean;
    phase?: string;
    maxAttempts?: number;
    retryIntervalMs?: number;
  } = {},
): Cypress.Chainable<CommandLineResult> => {
  const expectDeleted = options.expectDeleted === true;
  const expectedPhase = options.phase ?? 'Ready';
  const maxAttempts = options.maxAttempts ?? MAAS_STATE_DEFAULT_MAX_ATTEMPTS;
  const retryIntervalMs = options.retryIntervalMs ?? MAAS_STATE_DEFAULT_RETRY_INTERVAL_MS;
  const name = assertValidK8sLabel(resourceName, 'ExternalProvider name');
  const ns = assertValidK8sNamespace(projectName);
  const ocCommand = `oc get externalprovider ${quoteShellArg(name)} -n ${quoteShellArg(
    ns,
  )} -o json`;
  let attempts = 0;

  const checkState = (): Cypress.Chainable<CommandLineResult> =>
    cy
      .exec(ocCommand, { failOnNonZeroExit: false })
      .then((result: CommandLineResult): Cypress.Chainable<CommandLineResult> => {
        attempts++;

        if (expectDeleted) {
          if (result.exitCode !== 0 && ocGetIndicatesResourceNotFound(result)) {
            cy.log(`✅ ExternalProvider ${name} does not exist in namespace ${ns}`);
            return cy.wrap(result);
          }

          if (result.exitCode === 0 && attempts < maxAttempts) {
            cy.log(
              `ExternalProvider ${name} still exists, waiting for deletion (attempt ${attempts}/${maxAttempts})`,
            );
            // eslint-disable-next-line cypress/no-unnecessary-waiting -- poll for controller reconcile
            return cy.wait(retryIntervalMs).then(() => checkState());
          }

          if (result.exitCode === 0) {
            throw new Error(
              `ExternalProvider ${name} still exists in namespace ${ns} after ${maxAttempts} attempts`,
            );
          }

          throw new Error(
            `Unexpected oc error while verifying ExternalProvider deletion: ${
              result.stderr || result.stdout
            }`,
          );
        }

        if (result.exitCode !== 0) {
          if (attempts < maxAttempts) {
            cy.log(`ExternalProvider ${name} not found yet (attempt ${attempts}/${maxAttempts})`);
            // eslint-disable-next-line cypress/no-unnecessary-waiting -- poll for controller reconcile
            return cy.wait(retryIntervalMs).then(() => checkState());
          }
          throw new Error(
            `ExternalProvider ${name} does not exist in namespace ${ns}: ${
              result.stderr || result.stdout
            }`,
          );
        }

        let doc: ExternalProviderDoc;
        try {
          doc = JSON.parse(result.stdout) as ExternalProviderDoc;
        } catch {
          throw new Error(`Failed to parse ExternalProvider JSON for ${name}`);
        }

        const phase = doc.status?.phase;
        if (phase === expectedPhase) {
          cy.log(`✅ ExternalProvider ${name} exists with phase ${expectedPhase}`);
          return cy.wrap(result);
        }

        if (phase === 'Failed') {
          throw new Error(`ExternalProvider ${name} is in Failed phase in namespace ${ns}`);
        }

        if (attempts < maxAttempts) {
          cy.log(
            `ExternalProvider ${name} phase is ${
              phase ?? 'Unknown'
            }, expected ${expectedPhase} (attempt ${attempts}/${maxAttempts})`,
          );
          // eslint-disable-next-line cypress/no-unnecessary-waiting -- poll for controller reconcile
          return cy.wait(retryIntervalMs).then(() => checkState());
        }

        throw new Error(
          `ExternalProvider ${name} did not reach phase ${expectedPhase} in namespace ${ns}. Current phase: ${
            phase ?? 'Unknown'
          }`,
        );
      });

  return checkState();
};

type CheckExternalModelOptions = {
  expectDeleted?: boolean;
  phase?: string;
  modelName?: string;
  externalProviderRefs?: string[];
  maxAttempts?: number;
  retryIntervalMs?: number;
};

type ExternalModelDoc = {
  status?: {
    phase?: string;
  };
  spec?: {
    modelName?: string;
    externalProviderRefs?: Array<{
      ref?: { name?: string };
    }>;
  };
};

const parseExternalModelDoc = (resourceName: string, stdout: string): ExternalModelDoc => {
  try {
    return JSON.parse(stdout) as ExternalModelDoc;
  } catch {
    throw new Error(`Failed to parse ExternalModel JSON for ${resourceName}`);
  }
};

const externalModelOptionsMet = (
  doc: ExternalModelDoc,
  options: CheckExternalModelOptions,
): MaaSOptionsCheckResult => {
  if (options.phase && doc.status?.phase !== options.phase) {
    return {
      met: false,
      reason: `phase: expected ${options.phase}, got ${doc.status?.phase ?? 'Unknown'}`,
      retryable: true,
    };
  }

  if (options.modelName !== undefined) {
    const actual = doc.spec?.modelName;
    if (actual !== options.modelName) {
      return {
        met: false,
        reason: `modelName: expected '${options.modelName}', got '${actual ?? 'undefined'}'`,
        retryable: true,
      };
    }
  }

  if (options.externalProviderRefs) {
    const actualNames = (doc.spec?.externalProviderRefs ?? []).map(
      (ref) => ref.ref?.name ?? 'undefined',
    );
    const expectedNames = options.externalProviderRefs;
    if (actualNames.length !== expectedNames.length) {
      return {
        met: false,
        reason: `externalProviderRefs length: expected ${expectedNames.length}, got ${actualNames.length}`,
        retryable: true,
      };
    }
    for (const expectedName of expectedNames) {
      if (!actualNames.includes(expectedName)) {
        return {
          met: false,
          reason: `missing externalProviderRef name=${expectedName}. Actual names: ${actualNames.join(
            ', ',
          )}`,
          retryable: true,
        };
      }
    }
  }

  return { met: true };
};

/**
 * Verifies an ExternalModel exists and reaches the expected status phase (default: Ready),
 * optionally matching `spec.modelName` / `spec.externalProviderRefs`,
 * or is absent when `expectDeleted` is true.
 */
export const checkExternalModelExists = (
  projectName: string,
  resourceName: string,
  options: CheckExternalModelOptions = {},
): Cypress.Chainable<CommandLineResult> => {
  const name = assertValidK8sLabel(resourceName, 'ExternalModel name');
  const ns = assertValidK8sNamespace(projectName);
  const ocCommand = `oc get externalmodel ${quoteShellArg(name)} -n ${quoteShellArg(ns)} -o json`;
  const resourceLabel = `ExternalModel ${name} in namespace ${ns}`;

  if (options.expectDeleted === true) {
    cy.log(`Checking ExternalModel is absent: ${name} in namespace ${ns}`);
    return assertMaaSResourceDeleted(resourceLabel, ocCommand, options);
  }

  const checkOptions: CheckExternalModelOptions = {
    ...options,
    phase: options.phase ?? 'Ready',
  };
  cy.log(`Checking ExternalModel exists: ${name} in namespace ${ns}`);

  return pollMaaSResourceState(
    resourceLabel,
    'ExternalModel',
    name,
    ns,
    ocCommand,
    (stdout) => parseExternalModelDoc(name, stdout),
    externalModelOptionsMet,
    checkOptions,
    true,
  );
};

type CheckMaaSModelRefOptions = {
  expectDeleted?: boolean;
  modelRef?: {
    kind: string;
    name?: string;
  };
  displayName?: string;
  description?: string;
  maxAttempts?: number;
  retryIntervalMs?: number;
};

const parseMaaSModelRefDoc = (
  resourceName: string,
  stdout: string,
): {
  metadata?: { annotations?: Record<string, string> };
  spec?: { modelRef?: { kind?: string; name?: string } };
} => {
  try {
    return JSON.parse(stdout) as {
      metadata?: { annotations?: Record<string, string> };
      spec?: { modelRef?: { kind?: string; name?: string } };
    };
  } catch {
    throw new Error(`Failed to parse MaaSModelRef JSON for ${resourceName}`);
  }
};

const maaSModelRefOptionsMet = (
  doc: {
    metadata?: { annotations?: Record<string, string> };
    spec?: { modelRef?: { kind?: string; name?: string } };
  },
  options: CheckMaaSModelRefOptions & { resourceName: string },
): MaaSOptionsCheckResult => {
  if (options.modelRef) {
    const expectedKind = options.modelRef.kind;
    const expectedName = options.modelRef.name ?? options.resourceName;
    const actualKind = doc.spec?.modelRef?.kind;
    const actualName = doc.spec?.modelRef?.name;
    if (actualKind !== expectedKind || actualName !== expectedName) {
      return {
        met: false,
        reason: `spec.modelRef: expected kind=${expectedKind} name=${expectedName}, got kind=${
          actualKind ?? 'undefined'
        } name=${actualName ?? 'undefined'}`,
        retryable: true,
      };
    }
  }

  if (options.displayName !== undefined) {
    const actual = doc.metadata?.annotations?.['openshift.io/display-name'];
    if (actual !== options.displayName) {
      return {
        met: false,
        reason: `display-name: expected '${options.displayName}', got '${actual ?? 'undefined'}'`,
        retryable: true,
      };
    }
  }

  if (options.description !== undefined) {
    const actual = doc.metadata?.annotations?.['openshift.io/description'];
    if (actual !== options.description) {
      return {
        met: false,
        reason: `description: expected '${options.description}', got '${actual ?? 'undefined'}'`,
        retryable: true,
      };
    }
  }

  return { met: true };
};

/**
 * Verifies a MaaSModelRef exists (optionally matching `spec.modelRef` / OpenShift annotations),
 * or is absent when `expectDeleted` is true.
 */
export const checkMaaSModelRefExists = (
  projectName: string,
  resourceName: string,
  options: CheckMaaSModelRefOptions = {},
): Cypress.Chainable<CommandLineResult> => {
  const name = assertValidK8sLabel(resourceName, 'MaaSModelRef name');
  const ns = assertValidK8sNamespace(projectName);
  const ocCommand = `oc get MaaSModelRef ${quoteShellArg(name)} -n ${quoteShellArg(ns)} -o json`;
  const resourceLabel = `MaaSModelRef ${name} in namespace ${ns}`;

  if (options.expectDeleted === true) {
    cy.log(`Checking MaaSModelRef is absent: ${name} in namespace ${ns}`);
    return assertMaaSResourceDeleted(resourceLabel, ocCommand, options);
  }

  cy.log(`Checking MaaSModelRef exists: ${name} in namespace ${ns}`);
  const checkOptions = { ...options, resourceName: name };

  return pollMaaSResourceState(
    resourceLabel,
    'MaaSModelRef',
    name,
    ns,
    ocCommand,
    (stdout) => parseMaaSModelRefDoc(name, stdout),
    maaSModelRefOptionsMet,
    checkOptions,
    true,
  );
};

export const createExternalProvider = (
  projectName: string,
  resourceName: string,
  fixturePath = 'resources/maas/ExternalProvider.yaml',
): Cypress.Chainable<CommandLineResult> =>
  applyExternalModelsFixture('ExternalProvider', projectName, resourceName, fixturePath);

export const createExternalModel = (
  projectName: string,
  resourceName: string,
  fixturePath = 'resources/maas/ExternalModel.yaml',
): Cypress.Chainable<CommandLineResult> =>
  applyExternalModelsFixture('ExternalModel', projectName, resourceName, fixturePath);

export const createMaaSModelRefForExternalModel = (
  projectName: string,
  resourceName: string,
  fixturePath = 'resources/maas/MaaSModelRefExternalModel.yaml',
): Cypress.Chainable<CommandLineResult> =>
  applyExternalModelsFixture('MaaSModelRef', projectName, resourceName, fixturePath, false);

export const cleanupMaaSModelRef = (
  resourceName: string,
  projectName: string,
): Cypress.Chainable<CommandLineResult> => {
  const name = assertValidK8sLabel(resourceName, 'MaaSModelRef name');
  const ns = assertValidK8sNamespace(projectName);
  const ocCommand = `oc delete MaaSModelRef ${quoteShellArg(name)} -n ${quoteShellArg(
    ns,
  )} --ignore-not-found`;
  cy.log(`Executing delete MaaSModelRef command: ${ocCommand}`);
  return cy.exec(ocCommand, { failOnNonZeroExit: false });
};

export const cleanupExternalModel = (
  resourceName: string,
  projectName: string,
): Cypress.Chainable<CommandLineResult> => {
  const name = assertValidK8sLabel(resourceName, 'ExternalModel name');
  const ns = assertValidK8sNamespace(projectName);
  const ocCommand = `oc delete ExternalModel ${quoteShellArg(name)} -n ${quoteShellArg(
    ns,
  )} --ignore-not-found`;
  cy.log(`Executing delete ExternalModel command: ${ocCommand}`);
  return cy.exec(ocCommand, { failOnNonZeroExit: false });
};

/**
 * Deletes ExternalModel and its companion MaaSModelRef (same resource name).
 * Order: MaaSModelRef → ExternalModel.
 */
export const cleanupExternalModelResources = (
  resourceName: string,
  projectName: string,
): Cypress.Chainable<CommandLineResult> => {
  cy.log(`Cleaning up external model resources "${resourceName}" in namespace "${projectName}"`);
  return cleanupMaaSModelRef(resourceName, projectName).then(() =>
    cleanupExternalModel(resourceName, projectName),
  );
};

export const cleanupExternalProvider = (
  resourceName: string,
  projectName: string,
): Cypress.Chainable<CommandLineResult> => {
  const name = assertValidK8sLabel(resourceName, 'ExternalProvider name');
  const ns = assertValidK8sNamespace(projectName);
  const ocCommand = `oc delete ExternalProvider ${quoteShellArg(name)} -n ${quoteShellArg(
    ns,
  )} --ignore-not-found`;
  cy.log(`Executing delete ExternalProvider command: ${ocCommand}`);
  return cy.exec(ocCommand, { failOnNonZeroExit: false });
};

export const cleanupExternalProviderSecret = (
  resourceName: string,
  projectName: string,
): Cypress.Chainable<CommandLineResult> => {
  const name = assertValidK8sLabel(resourceName, 'secret name');
  const ns = assertValidK8sNamespace(projectName);
  const ocCommand = `oc delete Secret ${quoteShellArg(name)} -n ${quoteShellArg(
    ns,
  )} --ignore-not-found`;
  cy.log(`Executing delete Secret command: ${ocCommand}`);
  return cy.exec(ocCommand, { failOnNonZeroExit: false });
};

type MaaSModelRefCondition = {
  type?: string;
  status?: string;
};

type MaaSModelRefDoc = {
  metadata?: {
    name?: string;
    annotations?: Record<string, string>;
  };
  spec?: {
    modelRef?: {
      kind?: string;
      name?: string;
    };
  };
  status?: {
    conditions?: MaaSModelRefCondition[];
  };
};

/**
 * Poll until the companion MaaSModelRef exists and GovernanceAttached is not True
 * (no subscription/policy yet → UI shows the pending governance warning).
 */
export const waitForExternalModelGovernancePending = (
  projectName: string,
  resourceName: string,
  options: { maxAttempts?: number; retryIntervalMs?: number } = {},
): Cypress.Chainable<CommandLineResult> => {
  const maxAttempts = options.maxAttempts ?? MAAS_STATE_DEFAULT_MAX_ATTEMPTS;
  const retryIntervalMs = options.retryIntervalMs ?? MAAS_STATE_DEFAULT_RETRY_INTERVAL_MS;
  const name = assertValidK8sLabel(resourceName, 'MaaSModelRef name');
  const ns = assertValidK8sNamespace(projectName);
  const ocCommand = `oc get MaaSModelRef ${quoteShellArg(name)} -n ${quoteShellArg(ns)} -o json`;
  let attempts = 0;

  const checkState = (): Cypress.Chainable<CommandLineResult> =>
    cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
      attempts++;
      if (result.exitCode === 0) {
        let doc: MaaSModelRefDoc;
        try {
          doc = JSON.parse(result.stdout) as MaaSModelRefDoc;
        } catch {
          throw new Error(`Failed to parse MaaSModelRef JSON for ${name}`);
        }
        const governanceCondition = doc.status?.conditions?.find(
          (condition) => condition.type === 'GovernanceAttached',
        );
        const governanceAttached = governanceCondition?.status === 'True';
        if (!governanceAttached) {
          cy.log(
            `✅ MaaSModelRef ${name} exists with GovernanceAttached not True (attempt ${attempts})`,
          );
          return cy.wrap(result);
        }
      }

      if (attempts < maxAttempts) {
        cy.log(
          `⏳ Waiting for MaaSModelRef ${name} governance pending (attempt ${attempts}/${maxAttempts})`,
        );
        // eslint-disable-next-line cypress/no-unnecessary-waiting -- poll for controller reconcile
        return cy.wait(retryIntervalMs).then(() => checkState());
      }

      throw new Error(
        `MaaSModelRef ${name} did not reach governance-pending state in namespace ${ns}`,
      );
    });

  return checkState();
};

const parseMaaSSubscriptionDoc = (
  subscriptionName: string,
  stdout: string,
): MaaSSubscriptionState => {
  let doc: MaaSSubscriptionState;
  try {
    doc = JSON.parse(stdout) as MaaSSubscriptionState;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to parse MaaSSubscription JSON for ${subscriptionName}: ${errorMsg}`);
  }

  expect(doc.kind).to.equal('MaaSSubscription');
  expect(doc.metadata?.name).to.equal(subscriptionName);

  return doc;
};

const parseMaaSAuthPolicyDoc = (policyName: string, stdout: string): MaaSAuthPolicyState => {
  let doc: MaaSAuthPolicyState;
  try {
    doc = JSON.parse(stdout) as MaaSAuthPolicyState;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to parse MaaSAuthPolicy JSON for ${policyName}: ${errorMsg}`);
  }

  expect(doc.kind).to.equal('MaaSAuthPolicy');
  expect(doc.metadata?.name).to.equal(policyName);

  return doc;
};

const subscriptionOptionsMet = (
  doc: MaaSSubscriptionState,
  options: CheckMaaSOptions,
): MaaSOptionsCheckResult => {
  if (options.models) {
    const modelNames = getSubscriptionModelRefNames(doc);
    const expected = [...options.models].toSorted();
    const actual = [...modelNames].toSorted();
    if (expected.length !== actual.length || !expected.every((name, i) => name === actual[i])) {
      return {
        met: false,
        reason: `models: expected [${expected.join(', ')}], got [${actual.join(', ')}]`,
        retryable: true,
      };
    }
  }
  if (options.phase && doc.status?.phase !== options.phase) {
    return {
      met: false,
      reason: `phase: expected ${options.phase}, got ${doc.status?.phase ?? 'Unknown'}`,
      retryable: true,
    };
  }
  return { met: true };
};

const authPolicyOptionsMet = (
  doc: MaaSAuthPolicyState,
  options: CheckMaaSOptions,
): MaaSOptionsCheckResult => {
  if (options.groups) {
    const groupNames = getAuthPolicyGroupNames(doc);
    const expected = [...options.groups].toSorted();
    const actual = [...groupNames].toSorted();
    if (expected.length !== actual.length || !expected.every((name, i) => name === actual[i])) {
      return {
        met: false,
        reason: `groups: expected [${expected.join(', ')}], got [${actual.join(', ')}]`,
        retryable: true,
      };
    }
  }
  if (options.phase && doc.status?.phase !== options.phase) {
    return {
      met: false,
      reason: `phase: expected ${options.phase}, got ${doc.status?.phase ?? 'Unknown'}`,
      retryable: true,
    };
  }
  return { met: true };
};

const shouldPollMaaSState = (options: CheckMaaSOptions): boolean =>
  !!(options.phase || options.models || options.groups);

type MaaSPollOptions = {
  phase?: string;
  maxAttempts?: number;
  retryIntervalMs?: number;
};

const getMaaSWaitTimeoutSeconds = (options: MaaSPollOptions, pollForState: boolean): number => {
  const maxAttempts = pollForState ? options.maxAttempts ?? MAAS_STATE_DEFAULT_MAX_ATTEMPTS : 1;
  const retryIntervalMs = options.retryIntervalMs ?? MAAS_STATE_DEFAULT_RETRY_INTERVAL_MS;
  return Math.max(1, Math.ceil((maxAttempts * retryIntervalMs) / 1000));
};

const waitForMaaSPhase = (
  kind: string,
  name: string,
  namespace: string,
  phase: string,
  timeoutSeconds: number,
): Cypress.Chainable<CommandLineResult> => {
  const safeName = assertValidK8sLabel(name, `${kind} name`);
  const ns = assertValidK8sNamespace(namespace);
  const safePhase = assertValidK8sPhase(phase);
  const resource = `${kind}/${safeName}`;
  const command = `oc wait --for=jsonpath='{.status.phase}'=${quoteShellArg(
    safePhase,
  )} ${quoteShellArg(resource)} -n ${quoteShellArg(ns)} --timeout=${timeoutSeconds}s`;
  cy.log(`⏳ oc wait ${resource} phase=${safePhase} (timeout ${timeoutSeconds}s)`);
  return cy
    .exec(command, { failOnNonZeroExit: false, timeout: (timeoutSeconds + 15) * 1000 })
    .then((result) => {
      if (result.exitCode !== 0) {
        throw new Error(
          `${resource} in namespace ${ns} did not reach phase ${safePhase}: ${
            result.stderr || result.stdout
          }`,
        );
      }
      cy.log(`✅ ${resource} reached phase ${safePhase}`);
      return cy.wrap(result);
    });
};

/**
 * Shared poll helper for MaaS CRs:
 * - when `phase` is set and `pollForState` is true, `oc wait` for phase then verify options
 * - otherwise get + verify (retrying while `pollForState` until timeout)
 */
const pollMaaSResourceState = <TDoc, TOptions extends MaaSPollOptions>(
  resourceLabel: string,
  kind: string,
  name: string,
  namespace: string,
  ocCommand: string,
  parseDoc: (stdout: string) => TDoc,
  optionsMet: (doc: TDoc, options: TOptions) => MaaSOptionsCheckResult,
  options: TOptions,
  pollForState: boolean,
): Cypress.Chainable<CommandLineResult> => {
  const maxAttempts = pollForState ? options.maxAttempts ?? MAAS_STATE_DEFAULT_MAX_ATTEMPTS : 1;
  const retryIntervalMs = options.retryIntervalMs ?? MAAS_STATE_DEFAULT_RETRY_INTERVAL_MS;

  const getAndCheck = (attempt = 1): Cypress.Chainable<CommandLineResult> =>
    cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
      if (result.exitCode !== 0) {
        if (attempt < maxAttempts) {
          cy.log(`⏳ ${resourceLabel} not found yet (attempt ${attempt}/${maxAttempts})`);
          // eslint-disable-next-line cypress/no-unnecessary-waiting -- poll for controller reconcile
          return cy.wait(retryIntervalMs).then(() => getAndCheck(attempt + 1));
        }
        throw new Error(`${resourceLabel} not found: ${result.stderr || result.stdout}`);
      }

      const doc = parseDoc(result.stdout);
      const checkResult = optionsMet(doc, options);
      if (!checkResult.met) {
        if (checkResult.retryable && attempt < maxAttempts) {
          cy.log(`⏳ ${resourceLabel}: ${checkResult.reason} (attempt ${attempt}/${maxAttempts})`);
          // eslint-disable-next-line cypress/no-unnecessary-waiting -- poll for controller reconcile
          return cy.wait(retryIntervalMs).then(() => getAndCheck(attempt + 1));
        }
        throw new Error(`${resourceLabel} did not meet expected state. ${checkResult.reason}`);
      }
      cy.log(`✅ ${resourceLabel} conditions met`);
      return cy.wrap(result);
    });

  if (options.phase && pollForState) {
    return waitForMaaSPhase(
      kind,
      name,
      namespace,
      options.phase,
      getMaaSWaitTimeoutSeconds(options, pollForState),
    ).then(() => getAndCheck());
  }

  return getAndCheck();
};

const assertMaaSResourceDeleted = (
  resourceLabel: string,
  ocCommand: string,
  options: { maxAttempts?: number; retryIntervalMs?: number } = {},
): Cypress.Chainable<CommandLineResult> => {
  const maxAttempts = options.maxAttempts ?? MAAS_STATE_DEFAULT_MAX_ATTEMPTS;
  const retryIntervalMs = options.retryIntervalMs ?? MAAS_STATE_DEFAULT_RETRY_INTERVAL_MS;
  let attempts = 0;

  const checkDeleted = (): Cypress.Chainable<CommandLineResult> =>
    cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
      attempts++;
      if (result.exitCode !== 0 && ocGetIndicatesResourceNotFound(result)) {
        cy.log(`✅ ${resourceLabel} does not exist`);
        return cy.wrap(result);
      }
      if (result.exitCode === 0 && attempts < maxAttempts) {
        cy.log(
          `⏳ ${resourceLabel} still exists, waiting for deletion (attempt ${attempts}/${maxAttempts})`,
        );
        // eslint-disable-next-line cypress/no-unnecessary-waiting -- poll for controller reconcile
        return cy.wait(retryIntervalMs).then(() => checkDeleted());
      }
      if (result.exitCode === 0) {
        throw new Error(`${resourceLabel} still exists after ${maxAttempts} attempts`);
      }
      throw new Error(
        `Unexpected oc error while verifying deletion of ${resourceLabel}: ${
          result.stderr || result.stdout
        }`,
      );
    });

  return checkDeleted();
};

const getAuthPolicyGroupNames = (doc: MaaSAuthPolicyState): string[] => {
  const groups = doc.spec?.subjects?.groups;
  if (!groups) {
    throw new Error('MaaSAuthPolicy spec.subjects.groups missing');
  }
  return groups.map((group, index) => {
    if (!group.name) {
      throw new Error(`MaaSAuthPolicy spec.subjects.groups[${index}] is missing name`);
    }
    return group.name;
  });
};

const getSubscriptionModelRefNames = (doc: MaaSSubscriptionState): string[] => {
  const modelRefs = doc.spec?.modelRefs;
  if (!modelRefs) {
    throw new Error('MaaSSubscription spec.modelRefs missing');
  }
  return modelRefs.map((modelRef, index) => {
    if (!modelRef.name) {
      throw new Error(`MaaSSubscription spec.modelRefs[${index}] is missing name`);
    }
    return modelRef.name;
  });
};

/**
 * Verifies `MaaSSubscription` on the cluster (same idea as `checkLLMInferenceServiceConfigState`):
 * - `expectDeleted`: `oc get` fails with NotFound.
 */
export const checkMaaSSubscriptionState = (
  subscriptionName: string,
  namespace = modelsAsAServiceNamespace,
  options: CheckMaaSOptions = {},
): Cypress.Chainable<CommandLineResult> => {
  const name = assertValidK8sLabel(subscriptionName, 'subscription name');
  const ns = assertValidK8sNamespace(namespace);
  const ocCommand = `oc get MaaSSubscription ${quoteShellArg(name)} -n ${quoteShellArg(
    ns,
  )} -o json`;

  if (options.expectDeleted === true) {
    cy.log(`Checking MaaSSubscription is absent: ${name} in namespace ${ns}`);
    return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
      if (result.exitCode !== 0 && ocGetIndicatesResourceNotFound(result)) {
        cy.log(`✅ MaaSSubscription ${name} is absent from namespace ${ns}`);
        return cy.wrap(result);
      }
      if (result.exitCode === 0) {
        throw new Error(`MaaSSubscription ${name} still exists in namespace ${ns}`);
      }
      throw new Error(
        `Unexpected oc error while verifying MaaSSubscription deletion: ${result.stderr}`,
      );
    });
  }
  cy.log(`Checking MaaSSubscription exists: ${name} in namespace ${ns}`);
  const resourceLabel = `MaaSSubscription ${name} in namespace ${ns}`;

  if (!options.phase && !options.models) {
    return cy.exec(ocCommand, { failOnNonZeroExit: true }).then((result) => {
      parseMaaSSubscriptionDoc(name, result.stdout);
      cy.log(`✅ ${resourceLabel} exists`);
      return cy.wrap(result);
    });
  }

  return pollMaaSResourceState(
    resourceLabel,
    'MaaSSubscription',
    name,
    ns,
    ocCommand,
    (stdout) => parseMaaSSubscriptionDoc(name, stdout),
    subscriptionOptionsMet,
    options,
    shouldPollMaaSState(options),
  );
};

/**
 * Verifies `MaaSAuthPolicy` state on the cluster. Validatest the groups and phase in the policy.
 */
export const checkMaaSAuthPolicyState = (
  policyName: string,
  namespace = modelsAsAServiceNamespace,
  options: CheckMaaSOptions = {},
): Cypress.Chainable<CommandLineResult> => {
  const name = assertValidK8sLabel(policyName, 'auth policy name');
  const ns = assertValidK8sNamespace(namespace);
  const ocCommand = `oc get MaaSAuthPolicy ${quoteShellArg(name)} -n ${quoteShellArg(ns)} -o json`;

  if (options.expectDeleted === true) {
    cy.log(`Checking MaaSAuthPolicy is absent: ${name} in namespace ${ns}`);
    return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
      if (result.exitCode !== 0 && ocGetIndicatesResourceNotFound(result)) {
        cy.log(`✅ MaaSAuthPolicy ${name} is absent from namespace ${ns}`);
        return cy.wrap(result);
      }
      if (result.exitCode === 0) {
        throw new Error(`MaaSAuthPolicy ${name} still exists in namespace ${ns}`);
      }
      throw new Error(
        `Unexpected oc error while verifying MaaSAuthPolicy deletion: ${result.stderr}`,
      );
    });
  }

  cy.log(`Checking MaaSAuthPolicy exists: ${name} in namespace ${ns}`);
  const resourceLabel = `MaaSAuthPolicy ${name} in namespace ${ns}`;

  if (!options.phase && !options.groups) {
    return cy.exec(ocCommand, { failOnNonZeroExit: true }).then((result) => {
      parseMaaSAuthPolicyDoc(name, result.stdout);
      cy.log(`✅ ${resourceLabel} exists`);
      return cy.wrap(result);
    });
  }

  return pollMaaSResourceState(
    resourceLabel,
    'MaaSAuthPolicy',
    name,
    ns,
    ocCommand,
    (stdout) => parseMaaSAuthPolicyDoc(name, stdout),
    authPolicyOptionsMet,
    options,
    shouldPollMaaSState(options),
  );
};

/** Wait for governance and runtime readiness, then read the ID exposed by the MaaS catalog. */
export const waitForMaaSModelReady = (
  modelNamespace: string,
  modelName: string,
): Cypress.Chainable<string> => {
  cy.exec(
    `oc wait --for=condition=Ready maasmodelref/${modelName} -n ${modelNamespace} --timeout=300s`,
    { timeout: 330000 },
  );
  return cy.exec(`oc get maasmodelref ${modelName} -n ${modelNamespace} -o json`).then((result) => {
    const modelRef = JSON.parse(result.stdout) as {
      status?: { resolvedModelAlias?: string };
    };
    const alias = modelRef.status?.resolvedModelAlias;
    if (!alias?.trim()) {
      throw new Error(`Ready MaaSModelRef ${modelName} has no status.resolvedModelAlias`);
    }
    // Explicitly wrap the ID so terminal-logging tasks cannot replace the yielded value.
    return cy.wrap(alias);
  });
};

/** Verify direct-user grants were persisted without logging the configured username. */
export const verifyMaaSUserAccess = (
  maasNamespace: string,
  subscriptionName: string,
  policyName: string,
  username: string,
): Cypress.Chainable<Cypress.Exec> =>
  cy
    .exec(
      `oc get maassubscription/${subscriptionName} maasauthpolicy/${policyName} -n ${maasNamespace} -o json`,
      { log: false },
    )
    .then((result) => {
      const resources = JSON.parse(result.stdout) as {
        items: {
          kind: string;
          spec: { owner?: { users?: string[] }; subjects?: { users?: string[] } };
        }[];
      };
      const subscription = resources.items.find((resource) => resource.kind === 'MaaSSubscription');
      const policy = resources.items.find((resource) => resource.kind === 'MaaSAuthPolicy');
      expect(
        subscription?.spec.owner?.users?.includes(username),
        'subscription directly grants ownership to the configured test user',
      ).to.eq(true);
      expect(
        policy?.spec.subjects?.users?.includes(username),
        'auth policy directly grants access to the configured test user',
      ).to.eq(true);
      return cy.wrap(result, { log: false });
    });

export const MAAS_COMPLETIONS_DEFAULT_MAX_ATTEMPTS = 24;

const MAAS_COMPLETIONS_DEFAULT_RETRY_INTERVAL_MS = 5000;

export type VerifyMaaSModelInferencingOptions = {
  maxAttempts?: number;
  retryIntervalMs?: number;
  /**
   * API path after `/{namespace}/{model}`.
   * Defaults to {@link Path.OPENAI_CHAT} (`/v1/chat/completions`).
   * Use {@link Path.MESSAGES} (`/v1/messages`) for Anthropic Messages format.
   */
  apiPath?: string;
};

/**
 * Verify the model is accessible with a token via the MaaS gateway:
 * `curl -k https://{gateway-host}/{namespace}/{model}{apiPath} ...`
 *
 * Resolves the gateway host from {@link getGatewayHostForMaaS} (Route `maas-gateway-route`).
 * Works for both LLMInferenceService and ExternalModel tenants.
 *
 * Default `apiPath` is OpenAI Chat (`/v1/chat/completions`). Pass
 * `apiPath: Path.MESSAGES` for Anthropic Messages (`/v1/messages`).
 *
 * Uses `strictSSL: false` on the request so self-signed cluster ingress TLS matches `curl -k`.
 * Uses an extended `cy.request` timeout because completions can run longer than the default 30s.
 *
 * Retries the POST when the gateway returns transient statuses (like 400/429/502/503/504), up to `maxAttempts`,
 * with `retryIntervalMs` between attempts (same polling pattern as other `maxAttempts` utilities in `oc_commands`).
 *
 * @param modelName Model name used in the path and JSON `model` field (LLMInferenceService or ExternalModel name).
 * @param namespace Project / tenant namespace for the path prefix.
 * @param apiKey The API key to use for the request.
 * @param options Optional retry budget and `apiPath`; defaults are {@link MAAS_COMPLETIONS_DEFAULT_MAX_ATTEMPTS} attempts and OpenAI Chat path.
 * @returns Cypress.Chainable whose `url` is the full inference URL used for the POST.
 */
export const verifyMaaSModelInferencing = (
  modelName: string,
  namespace: string,
  apiKey: string,
  options: VerifyMaaSModelInferencingOptions = {},
): Cypress.Chainable<{ url: string; response: Cypress.Response<unknown> }> => {
  const maxAttempts = options.maxAttempts ?? MAAS_COMPLETIONS_DEFAULT_MAX_ATTEMPTS;
  const retryIntervalMs = options.retryIntervalMs ?? MAAS_COMPLETIONS_DEFAULT_RETRY_INTERVAL_MS;
  const apiPath = options.apiPath ?? Path.OPENAI_CHAT;
  const approximateRetryWindowSec = (maxAttempts * retryIntervalMs) / 1000;

  return getGatewayHostForMaaS().then((gatewayHost) => {
    const url = buildMaaSInferenceUrl(gatewayHost, namespace, modelName, apiPath);

    cy.step(
      `MaaS inference POST (${apiPath}) with retries (max ${maxAttempts} attempts, ~${approximateRetryWindowSec}s backoff window)`,
    );

    const requestBody = {
      model: modelName,
      messages: [{ role: 'user', content: 'Today is' }],
      // eslint-disable-next-line camelcase
      max_tokens: 256,
      temperature: 1,
    };

    const makeRequest = (
      attemptNumber: number,
    ): Cypress.Chainable<{ url: string; response: Cypress.Response<unknown> }> => {
      cy.log(`Request attempt ${attemptNumber} of ${maxAttempts}`);
      cy.log(`Request URL: ${url}`);
      cy.log(`Request method: POST`);
      cy.log(
        `Request headers: ${JSON.stringify({
          'Content-Type': 'application/json',
          ...(apiKey && { Authorization: 'Bearer <redacted>' }),
        })}`,
      );
      cy.log(`Request body: ${JSON.stringify(requestBody)}`);
      cy.log(`Request timeout: ${completionsRequestTimeoutMs}ms`);
      const requestOptions: Partial<Cypress.RequestOptions> & { strictSSL: boolean } = {
        method: 'POST',
        url,
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        },
        body: requestBody,
        failOnStatusCode: false,
        strictSSL: false,
        timeout: completionsRequestTimeoutMs,
      };
      return cy.request(requestOptions).then((response) => {
        cy.log(`Response status: ${response.status}`);
        cy.log(`Response body: ${JSON.stringify(response.body)}`);

        if (response.status === 200) {
          return cy.wrap({ url, response });
        }

        if (
          (response.status === 503 || response.status === 502 || response.status === 400) &&
          attemptNumber < maxAttempts
        ) {
          cy.log(
            `Transient inference response (${response.status}), retrying in ${
              retryIntervalMs / 1000
            } seconds...`,
          );
          // eslint-disable-next-line cypress/no-unnecessary-waiting -- backoff between inference POST retries
          return cy.wait(retryIntervalMs).then(() => makeRequest(attemptNumber + 1));
        }

        if (attemptNumber >= maxAttempts) {
          cy.log(`Maximum retry attempts (${maxAttempts}) reached, returning last response`);
          return cy.wrap({ url, response });
        }

        return cy.wrap({ url, response });
      });
    };

    return makeRequest(1);
  });
};

export const ListMaaSModels = (
  token: string,
): Cypress.Chainable<{ url: string; response: Cypress.Response<unknown> }> => {
  return getClusterAppsDomain().then((clusterDomain) => {
    const url = `https://maas.${clusterDomain}/v1/models`;

    cy.log(`Request URL: ${url}`);
    cy.log(`Request method: GET`);
    cy.log(
      `Request headers: ${JSON.stringify({
        'Content-Type': 'application/json',
        ...(token && { Authorization: 'Bearer <redacted>' }),
      })}`,
    );

    const requestOptions: Partial<Cypress.RequestOptions> & { strictSSL: boolean } = {
      method: 'GET',
      url,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      failOnStatusCode: false,
      strictSSL: false,
      timeout: completionsRequestTimeoutMs,
    };

    return cy.request(requestOptions).then((response) => {
      cy.log(`Response status: ${response.status}`);
      cy.log(`Response body: ${JSON.stringify(response.body)}`);
      return cy.wrap({ url, response });
    });
  });
};
