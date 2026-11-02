import { applyOpenShiftYaml, pollUntilSuccess } from './baseCommands';
import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

const PGVECTOR_RESOURCE_FIXTURE = 'resources/autorag/pgvector.yaml';
const PGVECTOR_DEPLOYMENT = 'autorag-pgvector';
const PGVECTOR_SERVICE = 'autorag-pgvector';
const PGVECTOR_DATABASE = 'autorag_test_db';
const PGVECTOR_USER = 'autorag_test_user';
const PGVECTOR_PORT = '5432';
const PGVECTOR_NETWORK_CHECK_JOB = 'autorag-pgvector-network-check';
const E2E_OWNER_LABEL = 'odh-dashboard.io/e2e-owner';
const OPERATOR_DEPLOYMENT_LABEL_SELECTOR = 'app.kubernetes.io/name=dashboard-operator';
const OPERATOR_CONTAINER_NAME = 'manager';
const RELATED_IMAGE_ENV_VAR = 'RELATED_IMAGE_POSTGRESQL_16_IMAGE';

type DeploymentContainer = {
  name?: string;
  env?: Array<{ name?: string; value?: string }>;
};

type DeploymentResource = {
  metadata?: { name?: string; namespace?: string };
  spec?: { template?: { spec?: { containers?: DeploymentContainer[] } } };
};

type DeploymentList = { items?: DeploymentResource[] };

const pgvectorPasswords = new Map<string, string>();
const pgvectorOwners = new Map<string, string>();

const createPgvectorPassword = (): string =>
  `autorag-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const createPgvectorOwner = (): string =>
  `autorag-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const commandOutput = (result: CommandLineResult): string =>
  maskSensitiveInfo(result.stderr || result.stdout)
    .trim()
    .slice(0, 500) || 'no output';

const pgvectorResourceSelector = (owner: string): string =>
  `app.kubernetes.io/name=autorag-pgvector,app.kubernetes.io/part-of=autorag-e2e,${E2E_OWNER_LABEL}=${owner}`;

const networkCheckSelector = (owner: string): string =>
  `app.kubernetes.io/name=autorag-pgvector-network-check,app.kubernetes.io/part-of=autorag-e2e,${E2E_OWNER_LABEL}=${owner}`;

const shellQuote = (value: string): string => `'${value.replace(/'/g, `'"'"'`)}'`;

const getOperatorDeployment = (): Cypress.Chainable<{ name: string; namespace: string }> => {
  const configuredNamespace = Cypress.env('OPERATOR_NAMESPACE');
  const namespace =
    typeof configuredNamespace === 'string' && configuredNamespace.trim()
      ? configuredNamespace.trim()
      : undefined;
  const namespaceScope = namespace ? `-n ${shellQuote(namespace)}` : '-A';
  return cy
    .exec(
      `oc get deployments ${namespaceScope} -l ${shellQuote(
        OPERATOR_DEPLOYMENT_LABEL_SELECTOR,
      )} -o json`,
      { failOnNonZeroExit: false, log: false },
    )
    .then((result: CommandLineResult) => {
      if (result.exitCode !== 0) {
        throw new Error(
          `Unable to discover the dashboard operator deployment: ${commandOutput(result)}`,
        );
      }

      let deploymentList: DeploymentList;
      try {
        deploymentList = JSON.parse(result.stdout) as DeploymentList;
      } catch {
        throw new Error('Dashboard operator deployment discovery returned invalid JSON.');
      }

      if (!Array.isArray(deploymentList.items)) {
        throw new Error('Dashboard operator deployment discovery returned no deployment list.');
      }

      const candidates = deploymentList.items.filter(
        (deployment) =>
          typeof deployment.metadata?.name === 'string' &&
          (namespace ? deployment.metadata.namespace === namespace : true),
      );
      if (candidates.length !== 1) {
        const candidateNames = candidates
          .map(
            (candidate) =>
              `${candidate.metadata?.namespace ?? 'unknown'}/${
                candidate.metadata?.name ?? 'unknown'
              }`,
          )
          .join(', ');
        throw new Error(
          `Expected exactly one dashboard operator deployment ${
            namespace ? `in ${namespace}` : 'across the cluster'
          }; found ${candidates.length}${candidateNames ? ` (${candidateNames})` : ''}.`,
        );
      }

      const deploymentName = candidates[0].metadata?.name;
      const deploymentNamespace = candidates[0].metadata?.namespace ?? namespace;
      if (!deploymentName || !deploymentNamespace) {
        throw new Error('Dashboard operator deployment has no name.');
      }

      return cy
        .exec(
          `oc wait --for=condition=Available ${shellQuote(
            `deployment/${deploymentName}`,
          )} -n ${shellQuote(deploymentNamespace)} --timeout=300s`,
          { failOnNonZeroExit: false, timeout: 310000, log: false },
        )
        .then((waitResult: CommandLineResult) => {
          if (waitResult.exitCode !== 0) {
            throw new Error(
              `Dashboard operator deployment ${deploymentName} in ${deploymentNamespace} is not available: ${commandOutput(
                waitResult,
              )}`,
            );
          }
          return cy.wrap({ name: deploymentName, namespace: deploymentNamespace });
        });
    });
};

/**
 * Resolve the PostgreSQL/PGVector image from the operator's related-image environment.
 *
 * The image must come from the running dashboard operator so the test uses the same
 * disconnected/mirrored image resolution as the cluster. In particular, do not use the
 * Gen AI deployment as an image carrier: AutoRAG's temporary fixture is independent of it.
 */
const getClusterPostgreSQLImage = (): Cypress.Chainable<string> =>
  getOperatorDeployment().then(({ name, namespace }) =>
    cy
      .exec(`oc get deployment ${shellQuote(name)} -n ${shellQuote(namespace)} -o json`, {
        failOnNonZeroExit: false,
        log: false,
      })
      .then((result: CommandLineResult) => {
        if (result.exitCode !== 0) {
          throw new Error(
            `Unable to read the available dashboard operator deployment: ${commandOutput(result)}`,
          );
        }

        let deployment: DeploymentResource;
        try {
          deployment = JSON.parse(result.stdout) as DeploymentResource;
        } catch {
          throw new Error('Dashboard operator deployment lookup returned invalid JSON.');
        }

        const managerContainer = deployment.spec?.template?.spec?.containers?.find(
          (container) => container.name === OPERATOR_CONTAINER_NAME,
        );
        if (!managerContainer) {
          throw new Error(
            `Dashboard operator deployment ${name} does not contain a ${OPERATOR_CONTAINER_NAME} container.`,
          );
        }

        const image = managerContainer.env?.find(
          (env) => env.name === RELATED_IMAGE_ENV_VAR,
        )?.value;
        if (!image?.trim()) {
          throw new Error(
            `${RELATED_IMAGE_ENV_VAR} is not configured on the dashboard operator deployment.`,
          );
        }

        if (!/^[A-Za-z0-9][A-Za-z0-9._:/@+-]*$/.test(image.trim())) {
          throw new Error(
            `${RELATED_IMAGE_ENV_VAR} contains an invalid container image reference.`,
          );
        }

        cy.log('Using the operator-resolved PostgreSQL image for the temporary AutoRAG fixture.');
        return cy.wrap(image.trim(), { log: false });
      }),
  );

export const getVectorDatabaseConnection = (
  namespace: string,
): {
  host: string;
  port: string;
  db: string;
  user: string;
  password: string;
} => {
  const password = pgvectorPasswords.get(namespace);
  if (!password) {
    throw new Error(`Temporary AutoRAG PGVector has not been provisioned in ${namespace}.`);
  }

  return {
    host: `${PGVECTOR_SERVICE}.${namespace}.svc.cluster.local`,
    port: PGVECTOR_PORT,
    db: PGVECTOR_DATABASE,
    user: PGVECTOR_USER,
    password,
  };
};

/**
 * Create the temporary project-scoped PGVector instance and verify both readiness and
 * same-namespace network reachability before an AutoRAG connection is created.
 */
export const provisionAutoragPgvector = (namespace: string): Cypress.Chainable<unknown> =>
  getClusterPostgreSQLImage().then((image) => {
    const password = pgvectorPasswords.get(namespace) ?? createPgvectorPassword();
    const owner = pgvectorOwners.get(namespace) ?? createPgvectorOwner();
    pgvectorPasswords.set(namespace, password);
    pgvectorOwners.set(namespace, owner);

    return cy
      .fixture(PGVECTOR_RESOURCE_FIXTURE, 'utf8')
      .then((template: string) => {
        const rendered = template
          .replaceAll('__PGVECTOR_IMAGE__', image)
          .replaceAll('__PGVECTOR_PASSWORD__', password)
          .replaceAll('__PGVECTOR_OWNER__', owner);
        return applyOpenShiftYaml(rendered, namespace).then((result) => {
          if (result.exitCode !== 0) {
            throw new Error(
              `Failed to provision the temporary AutoRAG PGVector instance in ${namespace}: ${commandOutput(
                result,
              )}`,
            );
          }
        });
      })
      .then(() => {
        cy.step('Wait for the temporary AutoRAG PGVector database to be ready');
        return cy
          .exec(
            `oc rollout status ${shellQuote(`deployment/${PGVECTOR_DEPLOYMENT}`)} -n ${shellQuote(
              namespace,
            )} --timeout=300s`,
            { failOnNonZeroExit: false, timeout: 310000 },
          )
          .then((result: CommandLineResult) => {
            if (result.exitCode !== 0) {
              throw new Error(
                `Temporary AutoRAG PGVector deployment did not become ready in ${namespace}: ${commandOutput(
                  result,
                )}`,
              );
            }
          });
      })
      .then(() => {
        cy.step('Verify the temporary AutoRAG PGVector extension');
        const extensionCheck =
          `oc exec ${shellQuote(`deploy/${PGVECTOR_DEPLOYMENT}`)} -n ${shellQuote(namespace)} -- ` +
          `psql -U ${shellQuote(PGVECTOR_USER)} -d ${shellQuote(
            PGVECTOR_DATABASE,
          )} -tAc "SELECT extname FROM pg_extension WHERE extname = 'vector';" | grep -qx vector`;
        return pollUntilSuccess(extensionCheck, 'PGVector extension', {
          maxAttempts: 30,
          pollIntervalMs: 2000,
        });
      })
      .then(() => verifyAutoragPgvectorNetwork(namespace))
      .then(() => undefined);
  }) as unknown as Cypress.Chainable<unknown>;

const cleanupAutoragPgvectorNetworkCheck = (namespace: string): Cypress.Chainable<Cypress.Exec> => {
  const owner = pgvectorOwners.get(namespace);
  if (!owner) {
    return cy.wrap({ exitCode: 0, stdout: '', stderr: '' });
  }
  return cy.exec(
    `oc delete job -l ${shellQuote(networkCheckSelector(owner))} -n ${shellQuote(
      namespace,
    )} --ignore-not-found --wait=true`,
    { failOnNonZeroExit: false, log: false },
  );
};

const verifyAutoragPgvectorNetwork = (namespace: string): Cypress.Chainable<unknown> => {
  const waitForJob = `oc wait --for=condition=complete ${shellQuote(
    `job/${PGVECTOR_NETWORK_CHECK_JOB}`,
  )} -n ${shellQuote(namespace)} --timeout=120s`;

  cy.step('Verify same-namespace AutoRAG pipeline connectivity to PGVector');
  return cy
    .exec(waitForJob, { failOnNonZeroExit: false, timeout: 130000, log: false })
    .then((waitResult) => {
      if (waitResult.exitCode !== 0) {
        const waitError = new Error(
          `AutoRAG pipeline connectivity to PGVector was not ready in ${namespace}: ${commandOutput(
            waitResult,
          )}`,
        );
        return cleanupAutoragPgvectorNetworkCheck(namespace).then(() => {
          throw waitError;
        });
      }
      return cleanupAutoragPgvectorNetworkCheck(namespace);
    })
    .then(() => undefined) as unknown as Cypress.Chainable<unknown>;
};

// ---------------------------------------------------------------------------
// Cleanup helpers (resilient — each call uses failOnNonZeroExit: false)
// ---------------------------------------------------------------------------

/**
 * Clean up a generated project-scoped secret.
 */
export const cleanupAutoragSecret = (namespace: string, secretName: string): void => {
  cy.log(`Cleaning up AutoRAG secret ${secretName}`);
  cy.exec(
    `oc delete secret ${shellQuote(secretName)} -n ${shellQuote(
      namespace,
    )} --ignore-not-found --wait=true`,
    {
      failOnNonZeroExit: false,
    },
  );
};

/**
 * Remove owned connections before recreating them after a test retry.
 *
 * AutoRAG connection names are intentionally stable so the selectors can find them. Since
 * retryableBefore reruns setup before suite cleanup, clear stale secrets from the test project
 * first to keep connection creation idempotent.
 */
export const resetAutoragConnections = (
  namespace: string,
  maasSecretName: string,
  vectorDbSecretName: string,
): void => {
  cleanupAutoragSecret(namespace, maasSecretName);
  cleanupAutoragSecret(namespace, vectorDbSecretName);
};

/**
 * Clean up only resources generated in the unique AutoRAG project.
 */
export const cleanupAutoragInfrastructure = (
  namespace: string,
  maasSecretName: string,
  vectorDbSecretName: string,
  ownership: { maasSecretCreated: boolean; vectorDbSecretCreated: boolean },
): void => {
  cy.log(`Cleaning up temporary AutoRAG PGVector resources in ${namespace}`);
  const owner = pgvectorOwners.get(namespace);
  if (owner) {
    cy.exec(
      `oc delete all,configmap,secret,networkpolicy -l ${shellQuote(
        pgvectorResourceSelector(owner),
      )} -n ${shellQuote(namespace)} --ignore-not-found --wait=true`,
      { failOnNonZeroExit: false, log: false },
    );
    cy.exec(
      `oc delete job -l ${shellQuote(networkCheckSelector(owner))} -n ${shellQuote(
        namespace,
      )} --ignore-not-found --wait=true`,
      { failOnNonZeroExit: false, log: false },
    );
    pgvectorOwners.delete(namespace);
  }
  pgvectorPasswords.delete(namespace);
  if (ownership.maasSecretCreated) {
    cleanupAutoragSecret(namespace, maasSecretName);
  }
  if (ownership.vectorDbSecretCreated) {
    cleanupAutoragSecret(namespace, vectorDbSecretName);
  }
};
