import { applyOpenShiftYaml, pollUntilSuccess } from './baseCommands';
import type { CommandLineResult } from '../../types';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

const PGVECTOR_RESOURCE_FIXTURE = 'resources/autorag/pgvector.yaml';
const PGVECTOR_NETWORK_CHECK_FIXTURE = 'resources/autorag/pgvector-network-check.yaml';
const PGVECTOR_DEPLOYMENT = 'autorag-pgvector';
const PGVECTOR_SERVICE = 'autorag-pgvector';
const PGVECTOR_DATABASE = 'autorag_test_db';
const PGVECTOR_USER = 'autorag_test_user';
const PGVECTOR_PORT = '5432';
const PGVECTOR_NETWORK_CHECK_JOB_PREFIX = 'autorag-pgvector-check';
const PGVECTOR_NETWORK_CHECK_BASE_SELECTOR =
  'app.kubernetes.io/name=autorag-pgvector-network-check,app.kubernetes.io/part-of=autorag-e2e';
const PGVECTOR_RESOURCE_BASE_SELECTOR =
  'app.kubernetes.io/name=autorag-pgvector,app.kubernetes.io/part-of=autorag-e2e';
const PGVECTOR_FIXED_RESOURCES = [
  { kind: 'deployment', name: PGVECTOR_DEPLOYMENT },
  { kind: 'secret', name: 'autorag-pgvector-credentials' },
  { kind: 'configmap', name: 'autorag-pgvector-init' },
  { kind: 'service', name: PGVECTOR_SERVICE },
  { kind: 'networkpolicy', name: PGVECTOR_SERVICE },
] as const;
const PGVECTOR_NETWORK_CHECK_TIMEOUT_SECONDS = 720;
const PGVECTOR_NETWORK_CHECK_BACKOFF_LIMIT = 1;
const PGVECTOR_NETWORK_CHECK_CONNECT_TIMEOUT_SECONDS = 2;
const PGVECTOR_NETWORK_CHECK_QUERY_TIMEOUT_MS = 2000;
const PGVECTOR_NETWORK_CHECK_RETRY_INTERVAL_SECONDS = 2;
const PGVECTOR_NETWORK_CHECK_SCHEDULING_MARGIN_SECONDS = 60;
const PGVECTOR_NETWORK_CHECK_POLL_INTERVAL_SECONDS = 10;
const PGVECTOR_NETWORK_STATUS_ERROR_RETRIES = 6;
const PGVECTOR_NETWORK_CHECK_ATTEMPT_BUDGET_SECONDS =
  PGVECTOR_NETWORK_CHECK_CONNECT_TIMEOUT_SECONDS +
  PGVECTOR_NETWORK_CHECK_QUERY_TIMEOUT_MS / 1000 +
  PGVECTOR_NETWORK_CHECK_RETRY_INTERVAL_SECONDS;
const PGVECTOR_NETWORK_CHECK_ATTEMPTS = Math.max(
  1,
  Math.floor(
    (PGVECTOR_NETWORK_CHECK_TIMEOUT_SECONDS - PGVECTOR_NETWORK_CHECK_SCHEDULING_MARGIN_SECONDS) /
      (PGVECTOR_NETWORK_CHECK_ATTEMPT_BUDGET_SECONDS * (PGVECTOR_NETWORK_CHECK_BACKOFF_LIMIT + 1)),
  ),
);
const E2E_OWNER_LABEL = 'odh-dashboard.io/e2e-owner';
const OPERATOR_DEPLOYMENT_LABEL_SELECTOR =
  'app.kubernetes.io/name=dashboard-operator,app.kubernetes.io/component=manager';
const OPERATOR_CONTAINER_NAME = 'manager';
const RELATED_IMAGE_ENV_VAR = 'RELATED_IMAGE_POSTGRESQL_16_IMAGE';

type DeploymentContainer = {
  name?: string;
  env?: Array<{ name?: string; value?: string }>;
};

type DeploymentResource = {
  metadata?: { name?: string; namespace?: string; labels?: Record<string, string> };
  spec?: { template?: { spec?: { containers?: DeploymentContainer[] } } };
};

type DeploymentList = { items?: DeploymentResource[] };

type JobResource = {
  metadata?: { name?: string; labels?: Record<string, string> };
};

type JobList = { items?: JobResource[] };

const pgvectorPasswords = new Map<string, string>();
const pgvectorOwners = new Map<string, string>();

const createRandomToken = (): string => {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const createPgvectorPassword = (): string => `autorag-${createRandomToken()}`;

const createPgvectorOwner = (): string => `autorag-${createRandomToken()}`;

const commandOutput = (result: CommandLineResult): string =>
  maskSensitiveInfo(result.stderr || result.stdout)
    .trim()
    .slice(0, 500) || 'no output';

const pgvectorResourceSelector = (owner: string): string =>
  `${PGVECTOR_RESOURCE_BASE_SELECTOR},${E2E_OWNER_LABEL}=${owner}`;

const pgvectorNetworkCheckSelector = (owner: string): string =>
  `${PGVECTOR_NETWORK_CHECK_BASE_SELECTOR},${E2E_OWNER_LABEL}=${owner}`;

const pgvectorNetworkCheckJobName = (owner: string): string =>
  `${PGVECTOR_NETWORK_CHECK_JOB_PREFIX}-${owner}`;

export type AutoragVectorDatabaseConnection = {
  host: string;
  port: string;
  db: string;
  user: string;
  password: string;
};

const resolveAutoragPgvectorOwner = (namespace: string): Cypress.Chainable<string | undefined> => {
  return cy
    .exec(
      `oc get deployment ${shellQuote(PGVECTOR_DEPLOYMENT)} -n ${shellQuote(namespace)} -o json`,
      { failOnNonZeroExit: false, log: false },
    )
    .then((result) => {
      if (result.exitCode !== 0) {
        if (/not found/i.test(commandOutput(result))) {
          return cy.wrap<string | undefined>(undefined);
        }
        throw new Error(
          `Unable to resolve AutoRAG PGVector ownership in ${namespace}: ${commandOutput(result)}`,
        );
      }

      let deployment: DeploymentResource;
      try {
        deployment = JSON.parse(result.stdout) as DeploymentResource;
      } catch {
        throw new Error('AutoRAG PGVector deployment lookup returned invalid JSON.');
      }

      const labels = deployment.metadata?.labels;
      if (
        !labels ||
        labels['app.kubernetes.io/name'] !== 'autorag-pgvector' ||
        labels['app.kubernetes.io/part-of'] !== 'autorag-e2e'
      ) {
        throw new Error(
          `Existing deployment ${PGVECTOR_DEPLOYMENT} in ${namespace} is not an AutoRAG-owned PGVector resource.`,
        );
      }

      const owner = labels[E2E_OWNER_LABEL];
      if (!owner) {
        throw new Error(
          `Existing AutoRAG PGVector deployment in ${namespace} has no ownership label.`,
        );
      }
      return cy.wrap<string | undefined>(owner);
    });
};

const shellQuote = (value: string): string => `'${value.replace(/'/g, `'"'"'`)}'`;

const ensureNoUnownedAutoragResources = (namespace: string): Cypress.Chainable<void> => {
  const checkFixedResourceNames = (index: number): Cypress.Chainable<void> => {
    if (index >= PGVECTOR_FIXED_RESOURCES.length) {
      return cy.wrap(undefined as void);
    }

    const resource = PGVECTOR_FIXED_RESOURCES[index];
    return cy
      .exec(
        `oc get ${resource.kind} ${shellQuote(resource.name)} -n ${shellQuote(namespace)} -o json`,
        { failOnNonZeroExit: false, log: false },
      )
      .then((result) => {
        if (result.exitCode !== 0) {
          if (/not found/i.test(commandOutput(result))) {
            return;
          }
          throw new Error(
            `Unable to check for existing AutoRAG PGVector ${resource.kind}/${
              resource.name
            } in ${namespace}: ${commandOutput(result)}`,
          );
        }

        let existingResource: { metadata?: { labels?: Record<string, string> } };
        try {
          existingResource = JSON.parse(result.stdout) as typeof existingResource;
        } catch {
          throw new Error(
            `AutoRAG PGVector ${resource.kind}/${resource.name} lookup returned invalid JSON.`,
          );
        }

        const owner = existingResource.metadata?.labels?.[E2E_OWNER_LABEL];
        throw new Error(
          `Cannot provision AutoRAG PGVector in ${namespace} because existing ${resource.kind}/${
            resource.name
          } has ${owner ? `owner ${owner}` : 'no recoverable owner'}.`,
        );
      })
      .then(() => checkFixedResourceNames(index + 1));
  };

  const checkResources = (
    resourceTypes: string,
    selector: string,
    description: string,
  ): Cypress.Chainable<void> =>
    cy
      .exec(
        `oc get ${resourceTypes} -l ${shellQuote(selector)} -n ${shellQuote(namespace)} -o json`,
        { failOnNonZeroExit: false, log: false },
      )
      .then((result) => {
        if (result.exitCode !== 0) {
          throw new Error(
            `Unable to check for existing AutoRAG PGVector ${description} in ${namespace}: ${commandOutput(
              result,
            )}`,
          );
        }

        let resourceList: JobList;
        try {
          resourceList = JSON.parse(result.stdout) as JobList;
        } catch {
          throw new Error(`AutoRAG PGVector ${description} lookup returned invalid JSON.`);
        }

        const resourceNames = (resourceList.items ?? [])
          .map((resource) => resource.metadata?.name)
          .filter((name): name is string => Boolean(name));
        if (resourceNames.length > 0) {
          throw new Error(
            `Cannot provision AutoRAG PGVector in ${namespace} because existing ${description} have no recoverable owner: ${resourceNames.join(
              ', ',
            )}.`,
          );
        }
        return cy.wrap(undefined as void);
      });

  return checkFixedResourceNames(0)
    .then(() => checkResources('jobs', PGVECTOR_NETWORK_CHECK_BASE_SELECTOR, 'network-check Jobs'))
    .then(() =>
      checkResources(
        'all,configmap,secret,networkpolicy',
        PGVECTOR_RESOURCE_BASE_SELECTOR,
        'resources',
      ),
    );
};

const getOperatorDeployment = (): Cypress.Chainable<{ name: string; namespace: string }> => {
  return cy
    .exec(`oc get deployments -A -l ${shellQuote(OPERATOR_DEPLOYMENT_LABEL_SELECTOR)} -o json`, {
      failOnNonZeroExit: false,
      log: false,
    })
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
        (deployment) => typeof deployment.metadata?.name === 'string',
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
          `Expected exactly one dashboard operator deployment across the cluster; found ${
            candidates.length
          }${candidateNames ? ` (${candidateNames})` : ''}.`,
        );
      }

      const deploymentName = candidates[0].metadata?.name;
      const deploymentNamespace = candidates[0].metadata?.namespace;
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

export const getVectorDatabaseConnection = (namespace: string): AutoragVectorDatabaseConnection => {
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

export const verifyAutoragVectorDatabaseConnectionSecret = (
  secretName: string,
  projectName: string,
  connection: AutoragVectorDatabaseConnection,
): Cypress.Chainable<void> => {
  const secretRef = `${shellQuote(secretName)} -n ${shellQuote(projectName)}`;
  const existsCommand = `oc get secret ${secretRef} -o name`;
  const secretCommand = `oc get secret ${secretRef} -o json`;

  return pollUntilSuccess(existsCommand, 'AutoRAG PGVector connection secret', {
    maxAttempts: 30,
    pollIntervalMs: 1000,
  }).then(() =>
    cy
      .exec(secretCommand, { failOnNonZeroExit: false, log: false })
      .then((result) => {
        if (result.exitCode !== 0) {
          throw new Error('Unable to read the AutoRAG PGVector connection secret.');
        }

        let decodedConnection: AutoragVectorDatabaseConnection;
        try {
          const secret = JSON.parse(result.stdout) as {
            data?: Record<string, string>;
          };
          const decode = (key: string): string => {
            const encoded = secret.data?.[key];
            if (
              typeof encoded !== 'string' ||
              !encoded ||
              encoded.length % 4 !== 0 ||
              !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
            ) {
              throw new Error(`Secret field ${key} is missing or not valid base64.`);
            }

            const decoded = Buffer.from(encoded, 'base64');
            if (!decoded.length || decoded.toString('base64') !== encoded) {
              throw new Error(`Secret field ${key} is missing or not valid base64.`);
            }
            return decoded.toString('utf8');
          };
          decodedConnection = {
            host: decode('PGVECTOR_HOST'),
            port: decode('PGVECTOR_PORT'),
            db: decode('PGVECTOR_DB'),
            user: decode('PGVECTOR_USER'),
            password: decode('PGVECTOR_PASSWORD'),
          };
        } catch {
          throw new Error('AutoRAG PGVector connection secret returned invalid data.');
        }

        const matchesNonPasswordConnection =
          decodedConnection.host === connection.host &&
          decodedConnection.port === connection.port &&
          decodedConnection.db === connection.db &&
          decodedConnection.user === connection.user;

        return cy
          .task(
            'compareSecretValues',
            { actual: decodedConnection.password, expected: connection.password },
            { log: false },
          )
          .then((passwordMatches) => {
            if (!matchesNonPasswordConnection || passwordMatches !== true) {
              throw new Error(
                'AutoRAG PGVector connection secret does not match the ready database.',
              );
            }
          });
      })
      .then(() => undefined),
  ) as unknown as Cypress.Chainable<void>;
};

const deleteAutoragPgvectorNetworkCheck = (
  namespace: string,
  owner?: string,
): Cypress.Chainable<Cypress.Exec> => {
  if (!owner) {
    return cy.wrap<Cypress.Exec>({ exitCode: 0, stdout: '', stderr: '' });
  }

  return cy.exec(
    `oc delete jobs -l ${shellQuote(pgvectorNetworkCheckSelector(owner))} -n ${shellQuote(
      namespace,
    )} --ignore-not-found --wait=true`,
    { failOnNonZeroExit: false, log: false },
  );
};

/**
 * Apply the PGVector fixture without exposing its generated Secret through command output.
 * The manifest includes the database password, so both the Cypress command log and shell output
 * are suppressed. Only the exit code is returned to the caller.
 */
const applyAutoragPgvectorResources = (
  rendered: string,
  namespace: string,
): Cypress.Chainable<CommandLineResult> =>
  cy.task('createSecureTempFile', rendered, { log: false }).then((tempFileName) => {
    if (typeof tempFileName !== 'string') {
      throw new Error('Unable to create the temporary AutoRAG PGVector manifest.');
    }

    const cleanupCommand = `rm -f -- ${shellQuote(tempFileName)}`;
    const ocCommand =
      `trap ${shellQuote(cleanupCommand)} 0 1 2 15; ` +
      `oc apply -n ${shellQuote(namespace)} -f ${shellQuote(tempFileName)} >/dev/null 2>&1`;
    return cy
      .exec(ocCommand, { failOnNonZeroExit: false, log: false, timeout: 60000 })
      .then((result) =>
        cy
          .task('deleteSecureTempFile', tempFileName, { log: false })
          .then((): CommandLineResult => ({ exitCode: result.exitCode, stdout: '', stderr: '' })),
      );
  });

const applyAutoragPgvectorNetworkCheck = (
  namespace: string,
  image: string,
  owner: string,
): Cypress.Chainable<CommandLineResult> =>
  cy.fixture(PGVECTOR_NETWORK_CHECK_FIXTURE, 'utf8').then((template: string) => {
    const rendered = template
      .replaceAll('__PGVECTOR_IMAGE__', image)
      .replaceAll('__PGVECTOR_OWNER__', owner)
      .replaceAll('__PGVECTOR_NETWORK_CHECK_JOB__', pgvectorNetworkCheckJobName(owner))
      .replaceAll(
        '__PGVECTOR_NETWORK_CHECK_BACKOFF_LIMIT__',
        String(PGVECTOR_NETWORK_CHECK_BACKOFF_LIMIT),
      )
      .replaceAll(
        '__PGVECTOR_NETWORK_CHECK_TIMEOUT_SECONDS__',
        String(PGVECTOR_NETWORK_CHECK_TIMEOUT_SECONDS),
      )
      .replaceAll('__PGVECTOR_NETWORK_CHECK_ATTEMPTS__', String(PGVECTOR_NETWORK_CHECK_ATTEMPTS))
      .replaceAll(
        '__PGVECTOR_NETWORK_CHECK_CONNECT_TIMEOUT_SECONDS__',
        String(PGVECTOR_NETWORK_CHECK_CONNECT_TIMEOUT_SECONDS),
      )
      .replaceAll(
        '__PGVECTOR_NETWORK_CHECK_QUERY_TIMEOUT_MS__',
        String(PGVECTOR_NETWORK_CHECK_QUERY_TIMEOUT_MS),
      )
      .replaceAll(
        '__PGVECTOR_NETWORK_CHECK_RETRY_INTERVAL_SECONDS__',
        String(PGVECTOR_NETWORK_CHECK_RETRY_INTERVAL_SECONDS),
      );
    return deleteAutoragPgvectorNetworkCheck(namespace, owner).then((deleteResult) => {
      if (deleteResult.exitCode !== 0) {
        throw new Error(
          `Failed to remove the previous AutoRAG PGVector network check in ${namespace}: ${commandOutput(
            deleteResult,
          )}`,
        );
      }
      return applyOpenShiftYaml(rendered, namespace).then((result) => {
        if (result.exitCode !== 0) {
          throw new Error(
            `Failed to provision the temporary AutoRAG PGVector network check in ${namespace}: ${commandOutput(
              result,
            )}`,
          );
        }
      });
    });
  });

/**
 * Create the temporary project-scoped PGVector instance and verify both readiness and
 * same-namespace network reachability before an AutoRAG connection is created.
 */
export const provisionAutoragPgvector = (namespace: string): Cypress.Chainable<unknown> => {
  let image = '';
  let owner = '';

  return getClusterPostgreSQLImage()
    .then((resolvedImage) => {
      image = resolvedImage;
      const inMemoryOwner = pgvectorOwners.get(namespace);
      const inMemoryPassword = pgvectorPasswords.get(namespace);
      return resolveAutoragPgvectorOwner(namespace).then((previousOwner) => {
        const prepareResources = () => {
          if (previousOwner && (!inMemoryOwner || !inMemoryPassword)) {
            throw new Error(
              `Existing AutoRAG PGVector resources in ${namespace} cannot be safely recovered without their in-process ownership and credentials.`,
            );
          }
          if (inMemoryOwner && previousOwner && inMemoryOwner !== previousOwner) {
            throw new Error(
              `AutoRAG PGVector ownership changed unexpectedly in ${namespace}; refusing to replace another run's resources.`,
            );
          }

          const password = inMemoryPassword ?? createPgvectorPassword();
          owner = inMemoryOwner ?? createPgvectorOwner();
          pgvectorPasswords.set(namespace, password);
          pgvectorOwners.set(namespace, owner);

          return deleteAutoragPgvectorNetworkCheck(namespace, owner)
            .then((deleteResult) => {
              if (deleteResult.exitCode !== 0) {
                throw new Error(
                  `Failed to remove the previous AutoRAG PGVector network check in ${namespace}: ${commandOutput(
                    deleteResult,
                  )}`,
                );
              }

              return cy.fixture(PGVECTOR_RESOURCE_FIXTURE, 'utf8').then((template: string) => {
                const rendered = template
                  .replaceAll('__PGVECTOR_IMAGE__', image)
                  .replaceAll('__PGVECTOR_PASSWORD__', password)
                  .replaceAll('__PGVECTOR_OWNER__', owner);
                return applyAutoragPgvectorResources(rendered, namespace).then((result) => {
                  if (result.exitCode !== 0) {
                    throw new Error(
                      `Failed to provision the temporary AutoRAG PGVector instance in ${namespace}: ${commandOutput(
                        result,
                      )}`,
                    );
                  }
                });
              });
            })
            .then(() => undefined);
        };

        if (!previousOwner && !inMemoryOwner) {
          return ensureNoUnownedAutoragResources(namespace).then(prepareResources);
        }
        return prepareResources();
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
    .then(() => applyAutoragPgvectorNetworkCheck(namespace, image, owner))
    .then(() => verifyAutoragPgvectorNetwork(namespace, owner))
    .then(() => undefined) as unknown as Cypress.Chainable<unknown>;
};

const cleanupAutoragPgvectorNetworkCheck = (
  namespace: string,
  owner?: string,
): Cypress.Chainable<Cypress.Exec> =>
  deleteAutoragPgvectorNetworkCheck(namespace, owner).then((result) => {
    if (result.exitCode !== 0) {
      throw new Error(
        `Failed to clean up the AutoRAG PGVector network check in ${namespace}: ${commandOutput(
          result,
        )}`,
      );
    }
    return result;
  });

const cleanupAutoragPgvectorNetworkCheckBestEffort = (
  namespace: string,
  owner?: string,
): Cypress.Chainable<Cypress.Exec> =>
  !owner
    ? cy.wrap<Cypress.Exec>({ exitCode: 0, stdout: '', stderr: '' })
    : deleteAutoragPgvectorNetworkCheck(namespace, owner).then((result) => {
        if (result.exitCode !== 0) {
          Cypress.log({
            name: 'AutoRAG network-check cleanup',
            message: `Cleanup was incomplete in ${namespace}: ${commandOutput(result)}`,
          });
        }
        return result;
      });

const getAutoragPgvectorNetworkDiagnostics = (
  namespace: string,
  owner: string,
): Cypress.Chainable<string> => {
  const job = shellQuote(`job/${pgvectorNetworkCheckJobName(owner)}`);
  const jobNamespace = shellQuote(namespace);
  return cy
    .exec(`oc describe ${job} -n ${jobNamespace}`, {
      failOnNonZeroExit: false,
      log: false,
    })
    .then((describeResult) =>
      cy
        .exec(`oc logs ${job} -n ${jobNamespace} --all-containers=true --tail=100`, {
          failOnNonZeroExit: false,
          log: false,
        })
        .then(
          (logsResult) =>
            `Job description: ${commandOutput(describeResult)}; ` +
            `Pod logs: ${commandOutput(logsResult)}`,
        ),
    );
};

const verifyAutoragPgvectorNetwork = (
  namespace: string,
  owner: string,
): Cypress.Chainable<unknown> => {
  const job = shellQuote(`job/${pgvectorNetworkCheckJobName(owner)}`);
  const jobNamespace = shellQuote(namespace);
  const waitForJob =
    `end_time=$(($(date +%s) + ${PGVECTOR_NETWORK_CHECK_TIMEOUT_SECONDS})); ` +
    `status_error_count=0; ` +
    `while [ "$(date +%s)" -lt "$end_time" ]; do ` +
    `status_output=$(oc get ${job} -n ${jobNamespace} --request-timeout=5s ` +
    `-o jsonpath='{range .status.conditions[*]}{.type}={.status}{"\\n"}{end}' 2>&1); ` +
    `get_exit_code=$?; ` +
    `if [ "$get_exit_code" -ne 0 ]; then ` +
    `status_error_count=$((status_error_count + 1)); ` +
    `if printf '%s\\n' "$status_output" | grep -Eqi 'forbidden|unauthorized|access denied|you must be logged in|login required|authentication required'; then ` +
    `echo "Unable to read PGVector network-check Job status due to authorization (oc exit code $get_exit_code)." >&2; ` +
    `exit 3; ` +
    `fi; ` +
    `if printf '%s\\n' "$status_output" | grep -Eqi 'invalid namespace|unknown flag|no such file'; then ` +
    `echo "Unable to read PGVector network-check Job status due to an invalid oc request (oc exit code $get_exit_code)." >&2; ` +
    `exit 3; ` +
    `fi; ` +
    `if printf '%s\\n' "$status_output" | grep -Eqi 'not found|the server could not find'; then ` +
    `if [ "$status_error_count" -ge 2 ]; then ` +
    `echo "PGVector network-check Job was not found after repeated status reads." >&2; ` +
    `exit 3; ` +
    `fi; ` +
    `sleep ${PGVECTOR_NETWORK_CHECK_POLL_INTERVAL_SECONDS}; ` +
    `continue; ` +
    `fi; ` +
    `if [ "$status_error_count" -ge ${PGVECTOR_NETWORK_STATUS_ERROR_RETRIES} ]; then ` +
    `echo "Unable to read PGVector network-check Job status after repeated errors (oc exit code $get_exit_code)." >&2; ` +
    `exit 3; ` +
    `fi; ` +
    `sleep ${PGVECTOR_NETWORK_CHECK_POLL_INTERVAL_SECONDS}; ` +
    `continue; ` +
    `fi; ` +
    `status_error_count=0; ` +
    `if printf '%s\\n' "$status_output" | grep -qx 'Complete=True'; then exit 0; fi; ` +
    `if printf '%s\\n' "$status_output" | grep -qx 'Failed=True'; then exit 2; fi; ` +
    `sleep ${PGVECTOR_NETWORK_CHECK_POLL_INTERVAL_SECONDS}; ` +
    `done; exit 124`;

  cy.step('Verify same-namespace AutoRAG pipeline connectivity to PGVector');
  return cy
    .exec(waitForJob, {
      failOnNonZeroExit: false,
      timeout: (PGVECTOR_NETWORK_CHECK_TIMEOUT_SECONDS + 20) * 1000,
      log: false,
    })
    .then((waitResult) => {
      if (waitResult.exitCode !== 0) {
        return getAutoragPgvectorNetworkDiagnostics(namespace, owner).then((diagnostics) =>
          cleanupAutoragPgvectorNetworkCheckBestEffort(namespace, owner).then(() => {
            throw new Error(
              `AutoRAG pipeline connectivity to PGVector was not ready in ${namespace}: ${commandOutput(
                waitResult,
              )}. ${diagnostics}`,
            );
          }),
        );
      }
      return cleanupAutoragPgvectorNetworkCheck(namespace, owner);
    })
    .then(() => undefined) as unknown as Cypress.Chainable<unknown>;
};

// ---------------------------------------------------------------------------
// Cleanup helpers (resilient — each call uses failOnNonZeroExit: false)
// ---------------------------------------------------------------------------

/**
 * Clean up a generated project-scoped secret.
 */
export const cleanupAutoragSecret = (
  namespace: string,
  secretName: string,
): Cypress.Chainable<Cypress.Exec> => {
  cy.log(`Cleaning up AutoRAG secret ${secretName}`);
  return cy
    .exec(
      `oc delete secret ${shellQuote(secretName)} -n ${shellQuote(
        namespace,
      )} --ignore-not-found --wait=true`,
      {
        failOnNonZeroExit: false,
      },
    )
    .then((result) => {
      if (result.exitCode !== 0) {
        Cypress.log({
          name: 'AutoRAG secret cleanup',
          message: `Cleanup was incomplete for ${secretName} in ${namespace}: ${commandOutput(
            result,
          )}`,
        });
      }
      return result;
    });
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
  cleanupAutoragPgvectorNetworkCheckBestEffort(namespace, owner).then((jobResult) => {
    const resourceResult = owner
      ? cy.exec(
          `oc delete all,configmap,secret,networkpolicy -l ${shellQuote(
            pgvectorResourceSelector(owner),
          )} -n ${shellQuote(namespace)} --ignore-not-found --wait=true`,
          { failOnNonZeroExit: false, log: false },
        )
      : cy.wrap<Cypress.Exec>({ exitCode: 0, stdout: '', stderr: '' });

    resourceResult.then((result) => {
      if (result.exitCode !== 0) {
        cy.log(
          `AutoRAG PGVector resource cleanup was incomplete in ${namespace}: ${commandOutput(
            result,
          )}`,
        );
      }

      if (owner && jobResult.exitCode === 0 && result.exitCode === 0) {
        pgvectorOwners.delete(namespace);
        pgvectorPasswords.delete(namespace);
      } else if (owner) {
        cy.log(
          `Retaining AutoRAG PGVector ownership state for possible cleanup retry in ${namespace}.`,
        );
      }

      if (ownership.maasSecretCreated) {
        cleanupAutoragSecret(namespace, maasSecretName);
      }
      if (ownership.vectorDbSecretCreated) {
        cleanupAutoragSecret(namespace, vectorDbSecretName);
      }
    });
  });
};
