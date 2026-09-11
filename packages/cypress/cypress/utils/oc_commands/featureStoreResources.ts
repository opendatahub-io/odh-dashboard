import { applyOpenShiftYaml, pollUntilSuccess, waitForPodReady } from '../oc_commands/baseCommands';
import { AWS_BUCKETS } from '../s3Buckets';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

const trimOcJsonpath = (stdout: string): string => stdout.trim().replace(/^'|'$/g, '');

/** Feature repo directory inside the Feast registry container. */
const FEAST_FEATURE_REPO_DIR = '/feast-data/credit_scoring_local/feature_repo';

/** Container port the Feast registry serves its REST API on (set by the feast-operator). */
const REGISTRY_REST_PORT = 6573;

/**
 * Resolves the Feast Deployment name in the namespace for a given FeatureStore instance.
 * Prefers `feast-<instance>` then `feast-<instance>-registry`.
 */
const resolveFeastDeployment = (
  namespace: string,
  feastInstanceName: string,
): Cypress.Chainable<string> => {
  const labelCmd = `oc get deploy -n ${namespace} -l app.kubernetes.io/managed-by=feast,app.kubernetes.io/instance=${feastInstanceName} -o jsonpath='{.items[0].metadata.name}'`;
  return cy.exec(labelCmd, { failOnNonZeroExit: false, timeout: 30000 }).then((labelResult) => {
    const labelName = trimOcJsonpath(labelResult.stdout);
    if (labelName) {
      return cy.wrap(labelName);
    }

    const grepCmd = `oc get deploy -n ${namespace} -o custom-columns="NAME:.metadata.name" --no-headers | grep -i "${feastInstanceName}"`;
    return cy.exec(grepCmd, { failOnNonZeroExit: false, timeout: 30000 }).then((grepResult) => {
      const deploys = grepResult.stdout.trim().split('\n').filter(Boolean);
      const registryDeploy = deploys.find((d) => d.includes('registry')) ?? deploys[0];
      if (!registryDeploy) {
        throw new Error(
          `No Feast deployment found for instance=${feastInstanceName} in ${namespace}. ` +
            `Label query returned: ${labelResult.stderr}`,
        );
      }
      return cy.wrap(registryDeploy);
    });
  });
};

/**
 * Resolves a container on the Feast Deployment. Prefers `registry`, then `online`, else first.
 */
const resolveFeastContainer = (
  namespace: string,
  deployName: string,
): Cypress.Chainable<string> => {
  const cmd = `oc get deploy/${deployName} -n ${namespace} -o jsonpath='{.spec.template.spec.containers[*].name}'`;
  return cy.exec(cmd, { failOnNonZeroExit: false, timeout: 30000 }).then((result) => {
    const containers = trimOcJsonpath(result.stdout).split(/\s+/).filter(Boolean);
    if (containers.length === 0) {
      throw new Error(`No containers found on deploy/${deployName} in ${namespace}`);
    }
    const container =
      containers.find((c) => c.includes('registry')) ??
      containers.find((c) => c.includes('online')) ??
      containers[0];
    return cy.wrap(container);
  });
};

/**
 * Runs a Python script inside the Feast Deployment via:
 * `cat script.py | oc exec -i -n <ns> deploy/<name> -c <container> -- python -`
 *
 * @param successMarker Substring that must appear in stdout for success
 */
const runPythonInFeastDeploy = (
  namespace: string,
  feastInstanceName: string,
  pythonScript: string,
  successMarker: string,
): Cypress.Chainable<string> => {
  return resolveFeastDeployment(namespace, feastInstanceName).then((deployName) => {
    return resolveFeastContainer(namespace, deployName).then((container) => {
      const tmpFile = `/tmp/cypress-feast-script-${Date.now()}.py`;

      return cy.writeFile(tmpFile, pythonScript).then(() => {
        const cmd =
          `cat ${tmpFile} | oc exec -i -n ${namespace} deploy/${deployName} -c ${container} -- ` +
          `sh -c "cd ${FEAST_FEATURE_REPO_DIR} && python -"; ` +
          `rm -f ${tmpFile}`;

        return cy.exec(cmd, { failOnNonZeroExit: false, timeout: 300000 }).then((result) => {
          const output = `${result.stdout}\n${result.stderr}`;
          if (result.exitCode !== 0 || !output.includes(successMarker)) {
            throw new Error(
              `Python script failed on deploy/${deployName}: exit=${result.exitCode}\n${output}`,
            );
          }
          cy.log(`Script succeeded (marker: ${successMarker})`);
          return cy.wrap(output);
        });
      });
    });
  });
};

/** Default name for the Feast Permission applied to test namespaces. */
const DEFAULT_FEAST_PERMISSION_NAME = 'feast-auth';

export type ApplyFeastPermissionViaSdkOptions = {
  name?: string;
  namespaces: string[];
};

/**
 * Writes `permission.py` into the Feast registry feature repo, then applies the feature
 * repo to the registry without DynamoDB infra updates.
 *
 * Target directory (registry container):
 *   /feast-data/credit_scoring_local/feature_repo
 *
 * Full `feast apply` is avoided because shared DynamoDB tables hit TagResource
 * LimitExceededException under concurrent applies. Registry-only apply still loads
 * entities / feature views / services / permissions into the S3 registry.
 */
export const applyFeastPermissionViaSdk = (
  namespace: string,
  feastInstanceName: string,
  options: ApplyFeastPermissionViaSdkOptions,
): Cypress.Chainable<string> => {
  const permissionName = options.name ?? DEFAULT_FEAST_PERMISSION_NAME;
  const namespacesLiteral = JSON.stringify(options.namespaces);
  const featureRepoDir = FEAST_FEATURE_REPO_DIR;

  const permissionPy = `
from feast.permissions.permission import Permission
from feast.permissions.action import READ, AuthzedAction
from feast.permissions.policy import NamespaceBasedPolicy
from feast.feast_object import ALL_RESOURCE_TYPES

${permissionName.replace(/-/g, '_')} = Permission(
    name=${JSON.stringify(permissionName)},
    types=ALL_RESOURCE_TYPES,
    policy=NamespaceBasedPolicy(namespaces=${namespacesLiteral}),
    actions=[AuthzedAction.DESCRIBE] + READ,
)
`.trim();

  // Registry-only apply: same objects as feast apply, but skip online-store TagResource
  const applyPy = `
from pathlib import Path
from feast import FeatureStore
from feast.repo_operations import parse_repo, extract_objects_for_apply_delete

store = FeatureStore(repo_path=".")
# Skip DynamoDB / online-store infra updates (avoids TagResource LimitExceededException)
store._get_provider().update_infra = lambda *args, **kwargs: None
if hasattr(store, "_should_use_plan"):
    store._should_use_plan = lambda: False

repo = parse_repo(Path("."))
all_to_apply, all_to_delete, _, _ = extract_objects_for_apply_delete(
    store.project, store.registry, repo
)
store.apply(
    all_to_apply,
    objects_to_delete=all_to_delete,
    partial=False,
    skip_feature_view_validation=True,
)
print("REGISTRY_ONLY_APPLY_OK")
print("APPLIED_PERMISSION:${permissionName}")
`.trim();

  const permissionTmpFile = `/tmp/cypress-feast-permission-${Date.now()}.py`;
  const applyTmpFile = `/tmp/cypress-feast-registry-apply-${Date.now()}.py`;

  cy.step(
    `Write ${featureRepoDir}/permission.py and registry-only apply (ns=${namespace}, instance=${feastInstanceName})`,
  );

  return resolveFeastDeployment(namespace, feastInstanceName).then((deployName) => {
    return resolveFeastContainer(namespace, deployName).then((container) => {
      return cy.writeFile(permissionTmpFile, permissionPy).then(() => {
        return cy.writeFile(applyTmpFile, applyPy).then(() => {
          const writeCmd =
            `cat ${permissionTmpFile} | oc exec -i -n ${namespace} deploy/${deployName} -c ${container} -- ` +
            `tee ${featureRepoDir}/permission.py > /dev/null && ` +
            `oc exec -n ${namespace} deploy/${deployName} -c ${container} -- ` +
            `ls -la ${featureRepoDir}/permission.py ${featureRepoDir}/feature_definitions.py && ` +
            `rm -f ${permissionTmpFile}`;

          return cy
            .exec(writeCmd, { failOnNonZeroExit: false, timeout: 120000, log: false })
            .then((writeResult) => {
              if (writeResult.exitCode !== 0) {
                throw new Error(
                  `Failed to write permission.py into ${featureRepoDir}: ${
                    writeResult.stderr || writeResult.stdout
                  }`,
                );
              }
              cy.log(`Wrote permission.py into registry feature repo:\n${writeResult.stdout}`);

              // Pipe apply script into the pod (skips DynamoDB TagResource via update_infra no-op).
              // Use `apply_rc` (not `status`) — zsh treats `status` as read-only.
              const pipedApplyCmd =
                `cat ${applyTmpFile} | oc exec -i -n ${namespace} deploy/${deployName} -c ${container} -- ` +
                `sh -c "cd ${featureRepoDir} && python -"; apply_rc=$?; ` +
                `rm -f ${applyTmpFile}; ` +
                `if [ "$apply_rc" -eq 0 ]; then echo "REGISTRY_APPLY_OK"; fi; ` +
                `exit "$apply_rc"`;

              return cy
                .exec(pipedApplyCmd, { failOnNonZeroExit: false, timeout: 300000 })
                .then((applyResult) => {
                  const output = `${applyResult.stdout}\n${applyResult.stderr}`;
                  cy.log(output);

                  const applySucceeded =
                    applyResult.exitCode === 0 &&
                    (output.includes('REGISTRY_APPLY_OK') ||
                      output.includes('REGISTRY_ONLY_APPLY_OK'));

                  if (applySucceeded) {
                    cy.log(`Registry-only apply succeeded for permission ${permissionName}`);
                    const registryReadyCmd =
                      `oc exec -n ${namespace} deploy/${deployName} -c ${container} -- ` +
                      `sh -c 'curl -sk -H "Authorization: Bearer ` +
                      `$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" ` +
                      `https://localhost:${REGISTRY_REST_PORT}/api/v1/projects' ` +
                      `| jq -e '(.projects // []) | length > 0'`;

                    return pollUntilSuccess(
                      registryReadyCmd,
                      `registry on deploy/${deployName} to serve at least one project`,
                      { maxAttempts: 30, pollIntervalMs: 2000 },
                    ).then(() => cy.wrap(permissionName));
                  }

                  throw new Error(`Registry-only apply failed on deploy/${deployName}: ${output}`);
                });
            });
        });
      });
    });
  });
};

export type CreateSavedDatasetViaSdkOptions = {
  name: string;
  project: string;
  storagePath: string;
  featureServiceName?: string;
};

/**
 * Registers a saved dataset via the Feast Python SDK inside the Feast pod.
 * Uses `registry.apply_saved_dataset` (metadata register) — works when REST POST
 * `/saved_datasets` is unavailable (405 on older Feast builds).
 */
export const createSavedDatasetViaSdk = (
  namespace: string,
  feastInstanceName: string,
  options: CreateSavedDatasetViaSdkOptions,
): Cypress.Chainable<string> => {
  const pythonScript = `
from feast import FeatureStore
try:
    from feast import SavedDataset
except ImportError:
    from feast.saved_dataset import SavedDataset
from feast.infra.offline_stores.file_source import SavedDatasetFileStorage
import inspect

store = FeatureStore(repo_path=".")
kwargs = dict(
    name=${JSON.stringify(options.name)},
    features=[],
    join_keys=[],
    storage=SavedDatasetFileStorage(path=${JSON.stringify(options.storagePath)}),
)
${
  options.featureServiceName
    ? `if "feature_service" in inspect.signature(SavedDataset.__init__).parameters:\n    kwargs["feature_service"] = store.get_feature_service(${JSON.stringify(
        options.featureServiceName,
      )})`
    : ''
}
ds = SavedDataset(**kwargs)
store.registry.apply_saved_dataset(ds, ${JSON.stringify(options.project)}, commit=True)
print("CREATED_SAVED_DATASET:" + ds.name)
`.trim();

  cy.step(
    `Create saved dataset via SDK on Feast deploy (ns=${namespace}, instance=${feastInstanceName})`,
  );

  return runPythonInFeastDeploy(
    namespace,
    feastInstanceName,
    pythonScript,
    'CREATED_SAVED_DATASET:',
  ).then(() => {
    cy.log(`Created saved dataset via SDK: ${options.name}`);
    return cy.wrap(options.name);
  });
};

const FEAST_OPERATOR_DEPLOY = 'feast-operator-controller-manager';

/**
 * Fail fast when the Feast operator cannot reconcile FeatureStore CRs.
 * Without a Ready controller, Registry never becomes True (~8 min poll).
 */
const assertFeastOperatorReady = (): Cypress.Chainable => {
  const applicationsNamespace = Cypress.env('APPLICATIONS_NAMESPACE');
  cy.step('Check Feast operator is Ready');
  return cy
    .exec(
      `oc get deploy/${FEAST_OPERATOR_DEPLOY} -n ${applicationsNamespace} -o jsonpath='{.status.readyReplicas}'`,
      { failOnNonZeroExit: false, timeout: 30000 },
    )
    .then((result) => {
      const readyReplicas = parseInt(trimOcJsonpath(result.stdout), 10) || 0;
      if (readyReplicas >= 1) {
        return;
      }

      return cy
        .exec(
          `oc get pods -n ${applicationsNamespace} -l app.kubernetes.io/name=feast-operator ` +
            `-o jsonpath='{range .items[*]}{.metadata.name}{" phase="}{.status.phase}` +
            `{" ready="}{.status.containerStatuses[0].ready}` +
            `{" state="}{.status.containerStatuses[0].state}{"\\n"}{end}'`,
          { failOnNonZeroExit: false, timeout: 30000 },
        )
        .then((podResult) => {
          throw new Error(
            `Feast operator deploy/${FEAST_OPERATOR_DEPLOY} is not Ready ` +
              `(readyReplicas=${result.stdout.trim() || '0'}). ` +
              `FeatureStore Registry will never become True until the operator recovers.\n` +
              `${podResult.stdout || podResult.stderr}`,
          );
        });
    });
};

/**
 * Creates Feature Store custom resource by applying a YAML template.
 * This function dynamically replaces placeholders in the template with actual values and applies it.
 *
 * @param {string} namespace - The namespace of the feast custom resource flavor to be created.
 */
export const createFeatureStoreCR = (namespace: string, feastInstanceName: string): void => {
  cy.fixture('resources/yaml/feast.yaml').then((yamlTemplate) => {
    const buckets = (Cypress.env('AWS_PIPELINES') as typeof AWS_BUCKETS | undefined) ?? AWS_BUCKETS;
    const {
      AWS_ACCESS_KEY_ID: awsAccessKey,
      AWS_SECRET_ACCESS_KEY: awsSecretKey,
      BUCKET_1: { NAME: awsBucketName, REGION: awsDefaultRegion },
    } = buckets;

    if (!awsBucketName) {
      throw new Error(
        'AWS_PIPELINES.BUCKET_1.NAME is empty. Export CY_TEST_CONFIG to packages/cypress/test-variables.yml before running E2E.',
      );
    }

    const variables: Record<string, string> = {
      awsAccessKey,
      awsSecretKey,
      awsBucketName,
      awsDefaultRegion,
      namespace,
    };

    // Replace placeholders in YAML with actual values
    const yamlContent = Object.entries(variables).reduce(
      (content, [key, value]) => content.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value),
      yamlTemplate,
    );
    return assertFeastOperatorReady().then(() => {
      // Apply the modified YAML
      applyOpenShiftYaml(yamlContent);
      //wait for the feature store cr to be created
      waitForPodReady(feastInstanceName, '300s', namespace);

      // Wait for Feast operator reconciliation so the dashboard can discover the Feature Store
      pollUntilSuccess(
        `oc get featurestores.feast.dev ${feastInstanceName} -n ${namespace} -o json | jq -e '.status.conditions[]? | select(.type=="Registry") | .status == "True"'`,
        `FeatureStore/${feastInstanceName} Registry condition to be True`,
        { maxAttempts: 30, pollIntervalMs: 5000 },
      );
      pollUntilSuccess(
        `oc get namespace ${namespace} -o json | jq -e '.metadata.labels["opendatahub.io/feast"] == "true"'`,
        `namespace ${namespace} to have opendatahub.io/feast=true label`,
        { maxAttempts: 30, pollIntervalMs: 5000 },
      );
    });
  });
};

/**
 * Polls until a FeatureStore CR reaches the Ready phase.
 */
export const waitForFeatureStoreReady = (
  namespace: string,
  storeName: string,
  options?: { maxAttempts?: number; pollIntervalMs?: number },
): Cypress.Chainable => {
  const { maxAttempts = 60, pollIntervalMs = 5000 } = options ?? {};
  return pollUntilSuccess(
    `oc get featurestores.feast.dev ${storeName} -n ${namespace} -o jsonpath='{.status.phase}' | grep -q '^Ready$'`,
    `FeatureStore/${storeName} to be Ready`,
    { maxAttempts, pollIntervalMs },
  );
};

/**
 * Polls until a FeatureStore CR is deleted from the cluster.
 */
export const waitForFeatureStoreDeleted = (
  namespace: string,
  storeName: string,
  options?: { maxAttempts?: number; pollIntervalMs?: number },
): Cypress.Chainable => {
  const { maxAttempts = 30, pollIntervalMs = 3000 } = options ?? {};
  return pollUntilSuccess(
    `oc get featurestores.feast.dev ${storeName} -n ${namespace} 2>&1 | grep -q 'NotFound'`,
    `FeatureStore/${storeName} to be deleted`,
    { maxAttempts, pollIntervalMs },
  );
};

/**
 * Creates a route for the Feature Store service and returns the URL.
 * This function finds a service containing 'registry-rest' and creates a passthrough route.
 *
 * @param {string} namespace - The namespace where the route will be created.
 * @param {string} feastProject - The feast project name to be used in the route name.
 * @returns {Cypress.Chainable<string>} The route URL
 */
export const createRouteAndGetUrl = (
  namespace: string,
  feastProject: string,
): Cypress.Chainable<string> => {
  const routeName = `${feastProject}-registry-rest`;

  cy.step(`Finding service containing 'registry-rest' in namespace ${namespace}`);

  // Find service containing 'registry-rest' in the namespace
  const findServiceCommand = `oc get services -n ${namespace} -o custom-columns="NAME:.metadata.name" --no-headers | grep registry-rest`;

  return cy.exec(findServiceCommand, { failOnNonZeroExit: false }).then((findResult) => {
    if (findResult.exitCode !== 0 || !findResult.stdout.trim()) {
      cy.log(`ERROR finding service with 'registry-rest': ${findResult.stderr}`);
      throw new Error(`No service containing 'registry-rest' found in namespace ${namespace}`);
    }

    const serviceName = findResult.stdout.trim().split('\n')[0];
    cy.log(`Found service: ${serviceName}`);

    return cy
      .step(`Creating route ${routeName} for service ${serviceName} in namespace ${namespace}`)
      .then(() => {
        // Create the route
        const createCommand = `oc create route passthrough ${routeName} --service=${serviceName} --port=https -n ${namespace}`;

        return cy.exec(createCommand, { failOnNonZeroExit: false }).then((createResult) => {
          if (createResult.exitCode !== 0) {
            const maskedStderr = maskSensitiveInfo(createResult.stderr);
            cy.log(`ERROR creating route: ${maskedStderr}`);
            throw new Error(`Failed to create route: ${maskedStderr}`);
          }

          cy.log(`Created route:\n${createResult.stdout}`);

          // Get the route host
          const getCommand = `oc get route -n ${namespace} -o jsonpath="{.items[?(@.spec.to.name=='${serviceName}')].spec.host}"`;

          return cy.exec(getCommand, { failOnNonZeroExit: false }).then((getResult) => {
            if (getResult.exitCode !== 0 || !getResult.stdout.trim()) {
              const maskedStderr = maskSensitiveInfo(getResult.stderr);
              cy.log(`Failed to get route host: ${maskedStderr}`);
              throw new Error(`Failed to get route host: ${maskedStderr}`);
            }

            const host = getResult.stdout.trim();
            const routeUrl = `https://${host}`;
            cy.log(`Route URL: ${routeUrl}`);

            return cy.wrap(routeUrl);
          });
        });
      });
  });
};
