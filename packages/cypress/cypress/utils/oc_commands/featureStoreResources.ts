import { applyOpenShiftYaml, waitForPodReady } from '../oc_commands/baseCommands';
import { AWS_BUCKETS } from '../s3Buckets';
import { maskSensitiveInfo } from '../maskSensitiveInfo';

export type CreateSavedDatasetViaSdkOptions = {
  name: string;
  project: string;
  storagePath: string;
  featureServiceName?: string;
};

export type ApplyFeastPermissionViaSdkOptions = {
  name?: string;
  project: string;
  namespaces: string[];
};

/**
 * Resolves the Feast Deployment name in the namespace for a given FeatureStore instance.
 * Prefers `feast-<instance>` then `feast-<instance>-registry`.
 */
const resolveFeastDeployment = (
  namespace: string,
  feastInstanceName: string,
): Cypress.Chainable<string> => {
  return cy
    .exec(`oc get deploy -n ${namespace} -o custom-columns=NAME:.metadata.name --no-headers`, {
      failOnNonZeroExit: false,
    })
    .then((result) => {
      const names = result.stdout
        .trim()
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const preferred = [`feast-${feastInstanceName}`, `feast-${feastInstanceName}-registry`];
      const found =
        preferred.find((name) => names.includes(name)) ||
        names.find((name) => name.includes(feastInstanceName));

      if (!found) {
        throw new Error(
          `No Feast Deployment found in namespace ${namespace} for instance ${feastInstanceName}. Deployments: ${names.join(
            ', ',
          )}`,
        );
      }

      cy.log(`Using Feast Deployment: ${found}`);
      return cy.wrap(found);
    });
};

/**
 * Resolves a container on the Feast Deployment. Prefers `registry`, then `online`, else first.
 */
const resolveFeastContainer = (
  namespace: string,
  deployName: string,
): Cypress.Chainable<string> => {
  return cy
    .exec(
      `oc get deploy ${deployName} -n ${namespace} -o jsonpath='{.spec.template.spec.containers[*].name}'`,
      { failOnNonZeroExit: false },
    )
    .then((result) => {
      const containers = result.stdout.trim().split(/\s+/).filter(Boolean);
      if (containers.length === 0) {
        throw new Error(`No containers found on deploy/${deployName} in ${namespace}`);
      }
      const container = containers.includes('registry')
        ? 'registry'
        : containers.includes('online')
        ? 'online'
        : containers[0];
      cy.log(`Using Feast container: ${container}`);
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
  const tempFile = `/tmp/cypress-feast-sdk-${Date.now()}.py`;

  return resolveFeastDeployment(namespace, feastInstanceName).then((deployName) => {
    return resolveFeastContainer(namespace, deployName).then((container) => {
      return cy.writeFile(tempFile, pythonScript).then(() => {
        const execCmd =
          `cat ${tempFile} | oc exec -i -n ${namespace} deploy/${deployName} ` +
          `-c ${container} -- python - && rm -f ${tempFile}`;

        return cy
          .exec(execCmd, { failOnNonZeroExit: false, timeout: 180000, log: false })
          .then((result) => {
            if (result.code !== 0 || !result.stdout.includes(successMarker)) {
              throw new Error(
                `Feast SDK exec failed on deploy/${deployName}: ${result.stderr || result.stdout}`,
              );
            }
            return cy.wrap(result.stdout);
          });
      });
    });
  });
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
  const featureServiceLine = options.featureServiceName
    ? `feature_service_name=${JSON.stringify(options.featureServiceName)},`
    : '';

  const pythonScript = `
from feast import FeatureStore
from feast.saved_dataset import SavedDataset
from feast.infra.offline_stores.file_source import SavedDatasetFileStorage

store = FeatureStore(repo_path=".")
ds = SavedDataset(
    name=${JSON.stringify(options.name)},
    features=[],
    join_keys=[],
    storage=SavedDatasetFileStorage(path=${JSON.stringify(options.storagePath)}),
    ${featureServiceLine}
)
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
  const permissionName = options.name ?? 'feast-auth';
  const namespacesLiteral = JSON.stringify(options.namespaces);
  const featureRepoDir = '/feast-data/credit_scoring_local/feature_repo';

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

  const permissionTempFile = `/tmp/cypress-feast-permission-${Date.now()}.py`;
  const applyTempFile = `/tmp/cypress-feast-registry-apply-${Date.now()}.py`;

  cy.step(
    `Write ${featureRepoDir}/permission.py and registry-only apply (ns=${namespace}, instance=${feastInstanceName})`,
  );

  return resolveFeastDeployment(namespace, feastInstanceName).then((deployName) => {
    return resolveFeastContainer(namespace, deployName).then((container) => {
      return cy.writeFile(permissionTempFile, permissionPy).then(() => {
        return cy.writeFile(applyTempFile, applyPy).then(() => {
          const writeCmd =
            `cat ${permissionTempFile} | oc exec -i -n ${namespace} deploy/${deployName} -c ${container} -- ` +
            `tee ${featureRepoDir}/permission.py > /dev/null && ` +
            `oc exec -n ${namespace} deploy/${deployName} -c ${container} -- ` +
            `ls -la ${featureRepoDir}/permission.py ${featureRepoDir}/feature_definitions.py && ` +
            `rm -f ${permissionTempFile}`;

          return cy
            .exec(writeCmd, { failOnNonZeroExit: false, timeout: 120000, log: false })
            .then((writeResult) => {
              if (writeResult.code !== 0) {
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
                `cat ${applyTempFile} | oc exec -i -n ${namespace} deploy/${deployName} -c ${container} -- ` +
                `sh -c "cd ${featureRepoDir} && python -"; apply_rc=$?; ` +
                `rm -f ${applyTempFile}; ` +
                `if [ "$apply_rc" -eq 0 ]; then echo "REGISTRY_APPLY_OK"; fi; ` +
                `exit "$apply_rc"`;

              return cy
                .exec(pipedApplyCmd, {
                  failOnNonZeroExit: false,
                  timeout: 300000,
                })
                .then((applyResult) => {
                  const output = `${applyResult.stdout}\n${applyResult.stderr}`;
                  cy.log(output);

                  const applySucceeded =
                    applyResult.code === 0 &&
                    (output.includes('REGISTRY_APPLY_OK') ||
                      output.includes('REGISTRY_ONLY_APPLY_OK'));

                  if (applySucceeded) {
                    cy.log(`Registry-only apply succeeded for permission ${permissionName}`);
                    return cy.wrap(permissionName);
                  }

                  throw new Error(`Registry-only apply failed on deploy/${deployName}: ${output}`);
                });
            });
        });
      });
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
    const {
      AWS_ACCESS_KEY_ID: awsAccessKey,
      AWS_SECRET_ACCESS_KEY: awsSecretKey,
      BUCKET_1: { NAME: awsBucketName, REGION: awsDefaultRegion },
    } = AWS_BUCKETS;

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
    // Apply the modified YAML
    applyOpenShiftYaml(yamlContent);
    //wait for the feature store cr to be created
    waitForPodReady(feastInstanceName, '300s', namespace);
  });
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
    if (findResult.code !== 0 || !findResult.stdout.trim()) {
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
          if (createResult.code !== 0) {
            const maskedStderr = maskSensitiveInfo(createResult.stderr);
            cy.log(`ERROR creating route: ${maskedStderr}`);
            throw new Error(`Failed to create route: ${maskedStderr}`);
          }

          cy.log(`Created route:\n${createResult.stdout}`);

          // Get the route host
          const getCommand = `oc get route -n ${namespace} -o jsonpath="{.items[?(@.spec.to.name=='${serviceName}')].spec.host}"`;

          return cy.exec(getCommand, { failOnNonZeroExit: false }).then((getResult) => {
            if (getResult.code !== 0 || !getResult.stdout.trim()) {
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
