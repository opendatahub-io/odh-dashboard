/**
 * Utility functions for Model Registry OC commands
 */

import { applyOpenShiftYaml } from './baseCommands';
import type { CommandLineResult } from '../../types';
import { replacePlaceholdersInYaml } from '../yaml_files';

/**
 * Get the model registry namespace based on the environment
 * @returns The appropriate namespace for model registries
 */
export const getModelRegistryNamespace = (): string => {
  const applicationsNamespace = Cypress.env('APPLICATIONS_NAMESPACE');

  // For RHOAI use rhoai-model-registries, for ODH use odh-model-registries
  if (applicationsNamespace === 'redhat-ods-applications') {
    return 'rhoai-model-registries';
  }
  // Handle both 'opendatahub' and any other namespace as ODH
  return 'odh-model-registries';
};

/**
 * Check and ensure the model registry operator has 1Gi memory limit
 * @param deploymentName The deployment name from configuration
 * @returns Cypress.Chainable<boolean> that resolves to true if operator is properly configured
 */
export const ensureOperatorMemoryLimit = (deploymentName: string): Cypress.Chainable<boolean> => {
  const operatorNamespace = Cypress.env('APPLICATIONS_NAMESPACE');

  if (!operatorNamespace) {
    return cy.wrap(false);
  }

  // Check current memory limit
  const checkCommand = `oc get deployment ${deploymentName} -n ${operatorNamespace} -o jsonpath='{.spec.template.spec.containers[0].resources.limits.memory}'`;

  return cy.exec(checkCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      cy.log(`Failed to check operator memory limit: ${result.stderr}`);
      return cy.wrap(false);
    }

    const currentMemory = result.stdout.trim();
    cy.log(`Current operator memory limit: ${currentMemory}`);

    // Check if it's already 1Gi (1024Mi)
    if (currentMemory === '1Gi' || currentMemory === '1024Mi') {
      cy.log('Operator memory limit is already 1Gi, no patch needed');
      return cy.wrap(true);
    }

    // Need to patch to 1Gi
    cy.log(`Patching operator memory limit from ${currentMemory} to 1Gi...`);
    const patchCommand = `oc patch deployment ${deploymentName} -n ${operatorNamespace} -p '{"spec":{"template":{"spec":{"containers":[{"name":"manager","resources":{"limits":{"memory":"1Gi"}}}]}}}}'`;

    return cy
      .exec(patchCommand, { failOnNonZeroExit: false })
      .then((patchResult: CommandLineResult) => {
        if (patchResult.code !== 0) {
          cy.log(`Failed to patch operator memory: ${patchResult.stderr}`);
          return cy.wrap(false);
        }

        cy.log('Successfully patched operator memory to 1Gi');

        // Wait for rollout to complete
        const rolloutCommand = `oc rollout status deployment/${deploymentName} -n ${operatorNamespace} --timeout=120s`;
        return cy
          .exec(rolloutCommand, { failOnNonZeroExit: false, timeout: 120000 })
          .then((rolloutResult: CommandLineResult) => {
            if (rolloutResult.code === 0) {
              cy.log('Operator rollout completed successfully');
              return cy.wrap(true);
            }
            cy.log(`Operator rollout timeout or failed: ${rolloutResult.stderr}`);
            return cy.wrap(false);
          });
      });
  });
};

/**
 * Create a SQL database for model registry using YAML fixtures
 * @param databaseName Name of the database deployment (defaults to 'model-registry-db' for backwards compatibility)
 * @returns Cypress.Chainable<CommandLineResult>
 */
export const createModelRegistryDatabaseViaYAML = (
  databaseName = 'model-registry-db',
): Cypress.Chainable<CommandLineResult> => {
  const targetNamespace = getModelRegistryNamespace();

  const databaseReplacements = {
    NAMESPACE: targetNamespace,
    DATABASE_NAME: databaseName,
  };

  cy.log(
    `Creating SQL database '${databaseName}' for model registry in namespace ${targetNamespace}`,
  );

  // Check if database already exists and is ready
  return cy
    .exec(
      `oc get deployment ${databaseName} -n ${targetNamespace} -o jsonpath='{.status.readyReplicas}'`,
      { failOnNonZeroExit: false },
    )
    .then((checkResult: CommandLineResult) => {
      const readyReplicas = parseInt(checkResult.stdout.trim()) || 0;
      if (checkResult.code === 0 && readyReplicas > 0) {
        cy.log(
          `Model registry database '${databaseName}' already exists and is ready, skipping creation`,
        );
        return cy.wrap(checkResult);
      }

      // Database doesn't exist, create it
      cy.log(`Database '${databaseName}' does not exist, proceeding with creation`);
      return cy
        .fixture('resources/yaml/model_registry_database.yaml')
        .then((databaseYamlContent) => {
          const modifiedDatabaseYaml = replacePlaceholdersInYaml(
            databaseYamlContent,
            databaseReplacements,
          );
          // Write to temp file and apply
          const tempFile = `/tmp/db-${Date.now()}.yaml`;
          return cy
            .writeFile(tempFile, modifiedDatabaseYaml)
            .then(() => cy.exec(`oc apply -f ${tempFile}`, { failOnNonZeroExit: false }))
            .then((result) => {
              cy.exec(`rm -f ${tempFile}`, { failOnNonZeroExit: false });
              return result;
            });
        });
    })
    .then((result: CommandLineResult) => {
      return result;
    });
};

/**
 * Wait for the model registry database to be ready
 * @param databaseName Name of the database deployment (defaults to 'model-registry-db' for backwards compatibility)
 * @returns Cypress.Chainable<boolean> that resolves to true if the database is ready
 */
export const waitForModelRegistryDatabase = (
  databaseName = 'model-registry-db',
): Cypress.Chainable<boolean> => {
  const targetNamespace = getModelRegistryNamespace();
  const command = `oc wait --for=condition=Available deployment/${databaseName} -n ${targetNamespace} --timeout=600s`;

  cy.log(`Waiting for model registry database '${databaseName}' to be ready...`);
  return cy
    .exec(command, { failOnNonZeroExit: false, timeout: 600000 })
    .then((result: CommandLineResult) => {
      if (result.stdout) {
        cy.log(`Database wait result: ${result.stdout}`);
      }
      if (result.stderr) {
        cy.log(`Database wait stderr: ${result.stderr}`);
      }
      return cy.wrap(result.code === 0);
    });
};

/**
 * Create a SQL database for model registry and wait for it to be ready
 * @param databaseName Name of the database deployment (defaults to 'model-registry-db' for backwards compatibility)
 * @returns Cypress.Chainable<boolean> that resolves to true if the database is created and ready
 */
export const createAndVerifyDatabase = (
  databaseName = 'model-registry-db',
): Cypress.Chainable<boolean> => {
  cy.step(`Create SQL database '${databaseName}' for model registry`);
  return createModelRegistryDatabaseViaYAML(databaseName)
    .then(() => {
      cy.step(`Wait for model registry database '${databaseName}' to be ready`);
      return waitForModelRegistryDatabase(databaseName).should('be.true');
    })
    .then(() => {
      return cy.wrap(true);
    });
};

/**
 * Create a PostgreSQL database for model registry using YAML fixtures
 * @param databaseName Name of the database deployment
 * @returns Cypress.Chainable<CommandLineResult>
 */
export const createPostgresDatabaseViaYAML = (
  databaseName: string,
): Cypress.Chainable<CommandLineResult> => {
  const targetNamespace = getModelRegistryNamespace();

  const databaseReplacements = {
    NAMESPACE: targetNamespace,
    DATABASE_NAME: databaseName,
  };

  cy.log(
    `Creating PostgreSQL database '${databaseName}' for model registry in namespace ${targetNamespace}`,
  );

  // Check if database already exists and is ready
  return cy
    .exec(
      `oc get deployment ${databaseName} -n ${targetNamespace} -o jsonpath='{.status.readyReplicas}'`,
      { failOnNonZeroExit: false },
    )
    .then((checkResult: CommandLineResult) => {
      const readyReplicas = parseInt(checkResult.stdout.trim()) || 0;
      if (checkResult.code === 0 && readyReplicas > 0) {
        cy.log(
          `PostgreSQL database '${databaseName}' already exists and is ready, skipping creation`,
        );
        return cy.wrap(checkResult);
      }

      // Database doesn't exist, create it
      cy.log(`PostgreSQL database '${databaseName}' does not exist, proceeding with creation`);
      return cy
        .fixture('resources/yaml/model_registry_postgres_database.yaml')
        .then((databaseYamlContent) => {
          const modifiedDatabaseYaml = replacePlaceholdersInYaml(
            databaseYamlContent,
            databaseReplacements,
          );
          // Write to temp file and apply
          const tempFile = `/tmp/postgres-db-${Date.now()}.yaml`;
          return cy
            .writeFile(tempFile, modifiedDatabaseYaml)
            .then(() => cy.exec(`oc apply -f ${tempFile}`, { failOnNonZeroExit: false }))
            .then((result) => {
              cy.exec(`rm -f ${tempFile}`, { failOnNonZeroExit: false });
              return result;
            });
        });
    })
    .then((result: CommandLineResult) => {
      return result;
    });
};

/**
 * Wait for the PostgreSQL database to be ready
 * @param databaseName Name of the database deployment
 * @returns Cypress.Chainable<boolean> that resolves to true if the database is ready
 */
export const waitForPostgresDatabase = (databaseName: string): Cypress.Chainable<boolean> => {
  const targetNamespace = getModelRegistryNamespace();
  const command = `oc wait --for=condition=Available deployment/${databaseName} -n ${targetNamespace} --timeout=600s`;

  cy.log(`Waiting for PostgreSQL database '${databaseName}' to be ready...`);
  return cy
    .exec(command, { failOnNonZeroExit: false, timeout: 600000 })
    .then((result: CommandLineResult) => {
      if (result.stdout) {
        cy.log(`PostgreSQL database wait result: ${result.stdout}`);
      }
      if (result.stderr) {
        cy.log(`PostgreSQL database wait stderr: ${result.stderr}`);
      }
      return cy.wrap(result.code === 0);
    });
};

/**
 * Create a PostgreSQL database for model registry and wait for it to be ready
 * @param databaseName Name of the database deployment
 * @returns Cypress.Chainable<boolean> that resolves to true if the database is created and ready
 */
export const createAndVerifyPostgresDatabase = (
  databaseName: string,
): Cypress.Chainable<boolean> => {
  cy.step(`Create PostgreSQL database '${databaseName}' for model registry`);
  return createPostgresDatabaseViaYAML(databaseName)
    .then(() => {
      cy.step(`Wait for PostgreSQL database '${databaseName}' to be ready`);
      return waitForPostgresDatabase(databaseName).should('be.true');
    })
    .then(() => {
      return cy.wrap(true);
    });
};

/**
 * Delete the PostgreSQL database and wait until it's completely gone
 * @param databaseName Name of the database deployment
 * @returns Cypress.Chainable<boolean> that resolves to true when the database is gone
 */
export const deletePostgresDatabase = (databaseName: string): Cypress.Chainable<boolean> => {
  const targetNamespace = getModelRegistryNamespace();
  const deleteCommand = `oc delete service,pvc,deployment,secret -l app.kubernetes.io/name=${databaseName} -n ${targetNamespace} --ignore-not-found=true`;
  const maxAttempts = 48; // 8 minutes / 10 seconds = 48 attempts
  let attempts = 0;

  cy.log(`Deleting PostgreSQL database '${databaseName}' from namespace ${targetNamespace}`);

  // check if the database exists
  return cy
    .exec(`oc get deployment ${databaseName} -n ${targetNamespace}`, {
      failOnNonZeroExit: false,
    })
    .then((existsResult: CommandLineResult) => {
      if (existsResult.code !== 0) {
        cy.log(`PostgreSQL database '${databaseName}' does not exist, nothing to delete`);
        return cy.wrap(true);
      }

      cy.log(`PostgreSQL database '${databaseName}' exists, proceeding with deletion...`);

      // Issue the delete command
      return cy
        .exec(deleteCommand, { failOnNonZeroExit: false })
        .then((result: CommandLineResult) => {
          cy.log(`Delete command output: ${result.stdout || result.stderr}`);

          // poll until the database is gone
          const checkDeletionComplete = (): Cypress.Chainable<boolean> => {
            attempts++;

            return cy
              .exec(`oc get deployment ${databaseName} -n ${targetNamespace}`, {
                failOnNonZeroExit: false,
              })
              .then((checkResult: CommandLineResult) => {
                // Database is gone!
                if (checkResult.code !== 0) {
                  cy.log(
                    `PostgreSQL database '${databaseName}' successfully deleted after ${attempts} attempts`,
                  );
                  return cy.wrap(true);
                }

                // Check if we've exceeded max attempts
                if (attempts >= maxAttempts) {
                  cy.log(
                    `ERROR: PostgreSQL database '${databaseName}' still exists after ${maxAttempts} attempts (8 minutes)`,
                  );
                  // Log what's still there
                  return cy
                    .exec(
                      `oc get deployment,pod,pvc -l app.kubernetes.io/name=${databaseName} -n ${targetNamespace} -o wide`,
                      { failOnNonZeroExit: false },
                    )
                    .then((diagResult: CommandLineResult) => {
                      cy.log(`Stuck resources:\n${diagResult.stdout || 'No output'}`);
                      return cy.wrap(false);
                    });
                }

                // Still exists, wait and check again
                cy.log(
                  `Attempt ${attempts}/${maxAttempts}: PostgreSQL database '${databaseName}' still exists, waiting 10s...`,
                );
                // eslint-disable-next-line cypress/no-unnecessary-waiting
                return cy.wait(10000).then(() => checkDeletionComplete());
              });
          };

          return checkDeletionComplete();
        });
    });
};

/**
 * Delete the model registry database and wait until it's completely gone
 * @param databaseName Name of the database deployment (defaults to 'model-registry-db' for backwards compatibility)
 * @returns Cypress.Chainable<boolean> that resolves to true when the database is gone
 */
export const deleteModelRegistryDatabase = (
  databaseName = 'model-registry-db',
): Cypress.Chainable<boolean> => {
  const targetNamespace = getModelRegistryNamespace();
  const deleteCommand = `oc delete service,pvc,deployment,secret -l app.kubernetes.io/name=${databaseName} -n ${targetNamespace} --ignore-not-found=true`;
  const maxAttempts = 48; // 8 minutes / 10 seconds = 48 attempts
  let attempts = 0;

  cy.log(`Deleting model registry database '${databaseName}' from namespace ${targetNamespace}`);

  // check if the database exists
  return cy
    .exec(`oc get deployment ${databaseName} -n ${targetNamespace}`, {
      failOnNonZeroExit: false,
    })
    .then((existsResult: CommandLineResult) => {
      if (existsResult.code !== 0) {
        cy.log(`Model registry database '${databaseName}' does not exist, nothing to delete`);
        return cy.wrap(true);
      }

      cy.log(`Database '${databaseName}' exists, proceeding with deletion...`);

      // Issue the delete command
      return cy
        .exec(deleteCommand, { failOnNonZeroExit: false })
        .then((result: CommandLineResult) => {
          cy.log(`Delete command output: ${result.stdout || result.stderr}`);

          // poll until the database is gone
          const checkDeletionComplete = (): Cypress.Chainable<boolean> => {
            attempts++;

            return cy
              .exec(`oc get deployment ${databaseName} -n ${targetNamespace}`, {
                failOnNonZeroExit: false,
              })
              .then((checkResult: CommandLineResult) => {
                // Database is gone!
                if (checkResult.code !== 0) {
                  cy.log(
                    `Model registry database '${databaseName}' successfully deleted after ${attempts} attempts`,
                  );
                  return cy.wrap(true);
                }

                // Check if we've exceeded max attempts
                if (attempts >= maxAttempts) {
                  cy.log(
                    `ERROR: Database '${databaseName}' still exists after ${maxAttempts} attempts (8 minutes)`,
                  );
                  // Log what's still there
                  return cy
                    .exec(
                      `oc get deployment,pod,pvc -l app.kubernetes.io/name=${databaseName} -n ${targetNamespace} -o wide`,
                      { failOnNonZeroExit: false },
                    )
                    .then((diagResult: CommandLineResult) => {
                      cy.log(`Stuck resources:\n${diagResult.stdout || 'No output'}`);
                      return cy.wrap(false);
                    });
                }

                // Still exists, wait and check again
                cy.log(
                  `Attempt ${attempts}/${maxAttempts}: Database '${databaseName}' still exists, waiting 10s...`,
                );
                // eslint-disable-next-line cypress/no-unnecessary-waiting
                return cy.wait(10000).then(() => checkDeletionComplete());
              });
          };

          return checkDeletionComplete();
        });
    });
};

/**
 * Check if a model registry exists in any namespace
 * @param registryName Name of the model registry to check
 * @returns Cypress.Chainable<boolean> that resolves to true if the registry exists
 */
export const checkModelRegistry = (registryName: string): Cypress.Chainable<boolean> => {
  const command = `oc get modelregistry.modelregistry.opendatahub.io --all-namespaces | grep ${registryName}`;
  cy.log(`Running command: ${command}`);
  return cy.exec(command, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.stdout) {
      cy.log(`Command output: ${result.stdout}`);
    }
    return cy.wrap(result.code === 0);
  });
};

/**
 * Check if a model registry exists and is in Available state
 * @param registryName Name of the model registry to check
 * @returns Cypress.Chainable<boolean> that resolves to true if the registry exists and is available
 */
export const checkModelRegistryAvailable = (registryName: string): Cypress.Chainable<boolean> => {
  const targetNamespace = getModelRegistryNamespace();
  const command = `oc wait --for=condition=Available modelregistry.modelregistry.opendatahub.io/${registryName} -n ${targetNamespace} --timeout=480s`;
  cy.log(`Waiting for model registry ${registryName} to be available...`);
  return cy
    .exec(command, { failOnNonZeroExit: false, timeout: 480000 })
    .then((result: CommandLineResult) => {
      if (result.stdout) {
        cy.log(`Wait result: ${result.stdout}`);
      }
      if (result.stderr) {
        cy.log(`Wait stderr: ${result.stderr}`);
      }
      return cy.wrap(result.code === 0);
    })
    .then((isAvailable) => {
      if (isAvailable) {
        // Wait for mod arch UI pathway to fully initialize after backend is ready
        // TODO: Remove this once https://issues.redhat.com/browse/RHOAIENG-35821 is addressed
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(10000);
      }
      return cy.wrap(isAvailable);
    });
};

/**
 * Create a model registry using YAML fixtures
 * @param registryName Name of the model registry to create
 * @param databaseName Name of the database to connect to (defaults to 'model-registry-db' for backwards compatibility)
 * @returns Cypress.Chainable<CommandLineResult>
 */
export const createModelRegistryViaYAML = (
  registryName: string,
  databaseName = 'model-registry-db',
): Cypress.Chainable<CommandLineResult> => {
  const targetNamespace = getModelRegistryNamespace();

  const registryReplacements = {
    REGISTRY_NAME: registryName,
    NAMESPACE: targetNamespace,
    DATABASE_NAME: databaseName,
  };

  cy.log(
    `Creating model registry ${registryName} in namespace ${targetNamespace} using database '${databaseName}'`,
  );

  return cy
    .fixture('resources/yaml/model_registry.yaml')
    .then((registryYamlContent) => {
      const modifiedRegistryYaml = replacePlaceholdersInYaml(
        registryYamlContent,
        registryReplacements,
      );
      return applyOpenShiftYaml(modifiedRegistryYaml);
    })
    .then((result: CommandLineResult) => result);
};

/**
 * Create a model registry and verify it's ready for use
 * @param registryName Name of the model registry to create
 * @param databaseName Name of the database to connect to (defaults to 'model-registry-db' for backwards compatibility)
 * @returns Cypress.Chainable that resolves when the registry is created and available
 */
export const createAndVerifyModelRegistry = (
  registryName: string,
  databaseName = 'model-registry-db',
): Cypress.Chainable => {
  cy.step(`Create a model registry using YAML with database '${databaseName}'`);
  return createModelRegistryViaYAML(registryName, databaseName)
    .then(() => {
      cy.step('Verify model registry is created');
      return checkModelRegistry(registryName).should('be.true');
    })
    .then(() => {
      cy.step('Wait for model registry to be in Available state');
      return checkModelRegistryAvailable(registryName).should('be.true');
    });
};

/**
 * Get ModelRegistry CR database configuration from the cluster
 * @param registryName Name of the model registry
 * @param namespace Optional namespace (defaults to getModelRegistryNamespace())
 * @returns Cypress chainable with the database configuration
 */
export const getModelRegistryDatabaseConfig = (
  registryName: string,
  namespace?: string,
): Cypress.Chainable<{
  host: string;
  port: number;
  database: string;
  username: string;
  passwordSecret: {
    name: string;
    key: string;
  };
}> => {
  const targetNamespace = namespace || getModelRegistryNamespace();
  const command = `oc get modelregistry.modelregistry.opendatahub.io ${registryName} -n ${targetNamespace} -o json`;

  return cy.exec(command, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      cy.log(`Failed to get ModelRegistry CR: ${result.stderr}`);
      return cy.wrap({
        host: '',
        port: 0,
        database: '',
        username: '',
        passwordSecret: { name: '', key: '' },
      });
    }

    try {
      const registry = JSON.parse(result.stdout);
      // Prefer Postgres config (default), fall back to MySQL
      const dbConfig = registry.spec?.postgres || registry.spec?.mysql || {};

      cy.log('Retrieved ModelRegistry database configuration:', dbConfig);

      return cy.wrap({
        host: dbConfig.host || '',
        port: dbConfig.port || 0,
        database: dbConfig.database || '',
        username: dbConfig.username || '',
        passwordSecret: {
          name: dbConfig.passwordSecret?.name || '',
          key: dbConfig.passwordSecret?.key || '',
        },
      });
    } catch (error) {
      cy.log(`Failed to parse ModelRegistry CR JSON: ${String(error)}`);
      return cy.wrap({
        host: '',
        port: 0,
        database: '',
        username: '',
        passwordSecret: { name: '', key: '' },
      });
    }
  });
};

/**
 * Complete cleanup for model registry components
 * @param modelNames Array of model names to clean up from database
 * @param registryName Name of the model registry to delete
 * @param databaseName Name of the database deployment (defaults to 'model-registry-db' for backwards compatibility)
 * @returns Cypress.Chainable that resolves when cleanup is complete
 */
export const cleanupModelRegistryComponents = (
  modelNames: string[],
  registryName: string,
  databaseName = 'model-registry-db',
): Cypress.Chainable => {
  cy.step('Clean up registered models from database');
  return cleanupRegisteredModelsFromDatabase(modelNames, databaseName)
    .then(() => {
      cy.step('Delete the model registry');
      return deleteModelRegistry(registryName);
    })
    .then(() => {
      cy.step('Verify model registry is removed from the backend');
      return checkModelRegistry(registryName).should('be.false');
    });
};

/**
 * Delete a model registry
 * @param registryName Name of the model registry to delete
 * @returns Cypress.Chainable<CommandLineResult>
 */
export const deleteModelRegistry = (registryName: string): Cypress.Chainable<CommandLineResult> => {
  const targetNamespace = getModelRegistryNamespace();
  const registryCommand = `oc delete modelregistry.modelregistry.opendatahub.io ${registryName} -n ${targetNamespace} --timeout=240s`;

  cy.log(`Deleting model registry ${registryName} from namespace ${targetNamespace}`);

  return cy.exec(registryCommand, { failOnNonZeroExit: false, timeout: 240000 });
};

/**
 * Clean up registered models from the database
 * @param modelNames Array of model names to delete from the database
 * @param databaseName Name of the database deployment (defaults to 'model-registry-db' for backwards compatibility)
 * @returns Cypress.Chainable
 */
export const cleanupRegisteredModelsFromDatabase = (
  modelNames: string[],
  databaseName = 'model-registry-db',
): Cypress.Chainable => {
  const targetNamespace = getModelRegistryNamespace();

  // Find MySQL pod
  const findPodCommand = `oc get pods -n ${targetNamespace} -o name | grep ${databaseName} | head -1 | cut -d'/' -f2`;

  return cy
    .exec(findPodCommand, { failOnNonZeroExit: false })
    .then((podResult: CommandLineResult) => {
      if (podResult.code !== 0 || !podResult.stdout.trim()) {
        cy.log(`No MySQL pod found for database '${databaseName}', skipping database cleanup`);
        return;
      }

      const podName = podResult.stdout.trim();

      // SQL commands to clean up contexts for the specified registeredmodels
      const modelNamesStr = modelNames.map((name) => `'${name}'`).join(', ');
      const sqlCommands = [
        `DELETE cp FROM ContextProperty cp JOIN Context c ON cp.context_id = c.id WHERE c.name IN (${modelNamesStr});`,
        `DELETE pc FROM ParentContext pc JOIN Context c ON pc.context_id = c.id OR pc.parent_context_id = c.id WHERE c.name IN (${modelNamesStr});`,
        `DELETE a FROM Association a JOIN Context c ON a.context_id = c.id WHERE c.name IN (${modelNamesStr});`,
        `DELETE at FROM Attribution at JOIN Context c ON at.context_id = c.id WHERE c.name IN (${modelNamesStr});`,
        `DELETE FROM Context WHERE name IN (${modelNamesStr});`,
      ].join(' ');

      const cleanupCommand = `oc exec ${podName} -n ${targetNamespace} -- mysql -u mlmduser -pTheBlurstOfTimes --database="model-registry" -e "${sqlCommands}"`;

      cy.log(`Cleaning up registered models: ${modelNames.join(', ')}`);

      return cy
        .exec(cleanupCommand, { failOnNonZeroExit: false })
        .then((cleanupResult: CommandLineResult) => {
          if (cleanupResult.code === 0) {
            cy.log('Database cleanup completed successfully');
          } else {
            cy.log(`Database cleanup failed: ${cleanupResult.stderr}`);
          }
        });
    });
};

/**
 * Check if a registered model exists in the database
 * @param modelName Name of the model to check
 * @param databaseName Name of the database deployment (defaults to 'model-registry-db' for backwards compatibility)
 * @returns Cypress.Chainable<boolean> that resolves to true if the model exists
 */
export const checkModelExistsInDatabase = (
  modelName: string,
  databaseName = 'model-registry-db',
): Cypress.Chainable<boolean> => {
  const targetNamespace = getModelRegistryNamespace();
  const findPodCommand = `oc get pods -n ${targetNamespace} -o name | grep ${databaseName} | head -1 | cut -d'/' -f2`;

  return cy
    .exec(findPodCommand, { failOnNonZeroExit: false })
    .then((podResult: CommandLineResult) => {
      if (podResult.code !== 0 || !podResult.stdout.trim()) {
        cy.log(`No MySQL pod found for database '${databaseName}', cannot verify model existence`);
        return cy.wrap(false);
      }

      const podName = podResult.stdout.trim();
      const sqlQuery = `SELECT COUNT(*) FROM Context WHERE name = '${modelName.replace(
        /'/g,
        "''",
      )}';`;
      const verifyCommand = `oc exec ${podName} -n ${targetNamespace} -- mysql -u mlmduser -pTheBlurstOfTimes --database="model-registry" -e "${sqlQuery}" --skip-column-names`;

      cy.log(`Checking if model '${modelName}' exists in database '${databaseName}'`);

      return cy
        .exec(verifyCommand, { failOnNonZeroExit: false })
        .then((verifyResult: CommandLineResult) => {
          if (verifyResult.code === 0) {
            const count = parseInt(verifyResult.stdout.trim(), 10);
            const exists = count > 0;
            cy.log(`Model '${modelName}' exists in database: ${exists}`);
            return cy.wrap(exists);
          }
          cy.log(`Database verification failed: ${verifyResult.stderr}`);
          return cy.wrap(false);
        });
    });
};

/**
 * Check if the default database was created for a model registry
 * When using the "default" database option, the operator creates a database
 * with the same name as the registry
 * @param registryName Name of the model registry
 * @returns Cypress.Chainable<boolean> that resolves to true if the default database exists and is ready
 */
export const checkDefaultDatabaseExists = (registryName: string): Cypress.Chainable<boolean> => {
  const targetNamespace = getModelRegistryNamespace();
  const command = `oc get deployment ${registryName} -n ${targetNamespace} -o jsonpath='{.status.readyReplicas}'`;

  cy.log(`Checking if default database '${registryName}' exists for registry '${registryName}'`);

  return cy.exec(command, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      cy.log(`Default database '${registryName}' does not exist`);
      return cy.wrap(false);
    }

    const readyReplicas = parseInt(result.stdout.trim()) || 0;
    const isReady = readyReplicas > 0;
    cy.log(`Default database '${registryName}' exists and ready: ${isReady}`);
    return cy.wrap(isReady);
  });
};

/**
 * Wait for the default database to be ready
 * @param registryName Name of the model registry
 * @returns Cypress.Chainable<boolean> that resolves to true if the database becomes ready
 */
export const waitForDefaultDatabase = (registryName: string): Cypress.Chainable<boolean> => {
  const targetNamespace = getModelRegistryNamespace();
  const command = `oc wait --for=condition=Available deployment/${registryName} -n ${targetNamespace} --timeout=600s`;

  cy.log(`Waiting for default database '${registryName}' to be ready...`);
  return cy
    .exec(command, { failOnNonZeroExit: false, timeout: 600000 })
    .then((result: CommandLineResult) => {
      if (result.stdout) {
        cy.log(`Default database wait result: ${result.stdout}`);
      }
      if (result.stderr) {
        cy.log(`Default database wait stderr: ${result.stderr}`);
      }
      return cy.wrap(result.code === 0);
    });
};

/**
 * Delete the default database created by the model registry operator
 * @param registryName Name of the model registry
 * @returns Cypress.Chainable<boolean> that resolves to true when the database is deleted
 */
export const deleteDefaultDatabase = (registryName: string): Cypress.Chainable<boolean> => {
  const targetNamespace = getModelRegistryNamespace();
  const deleteCommand = `oc delete service,pvc,deployment,secret -l app=${registryName} -n ${targetNamespace} --ignore-not-found=true`;
  const maxAttempts = 48; // 8 minutes / 10 seconds = 48 attempts
  let attempts = 0;

  cy.log(`Deleting default database '${registryName}' from namespace ${targetNamespace}`);

  // check if the database exists
  return cy
    .exec(`oc get deployment ${registryName} -n ${targetNamespace}`, {
      failOnNonZeroExit: false,
    })
    .then((existsResult: CommandLineResult) => {
      if (existsResult.code !== 0) {
        cy.log(`Default database '${registryName}' does not exist, nothing to delete`);
        return cy.wrap(true);
      }

      cy.log(`Default database '${registryName}' exists, proceeding with deletion...`);

      // Issue the delete command
      return cy
        .exec(deleteCommand, { failOnNonZeroExit: false })
        .then((result: CommandLineResult) => {
          cy.log(`Delete command output: ${result.stdout || result.stderr}`);

          // poll until the database is gone
          const checkDeletionComplete = (): Cypress.Chainable<boolean> => {
            attempts++;

            return cy
              .exec(`oc get deployment ${registryName} -n ${targetNamespace}`, {
                failOnNonZeroExit: false,
              })
              .then((checkResult: CommandLineResult) => {
                // Database is gone!
                if (checkResult.code !== 0) {
                  cy.log(
                    `Default database '${registryName}' successfully deleted after ${attempts} attempts`,
                  );
                  return cy.wrap(true);
                }

                // Check if we've exceeded max attempts
                if (attempts >= maxAttempts) {
                  cy.log(
                    `ERROR: Default database '${registryName}' still exists after ${maxAttempts} attempts (8 minutes)`,
                  );
                  return cy.wrap(false);
                }

                // Still exists, wait and check again
                cy.log(
                  `Attempt ${attempts}/${maxAttempts}: Default database '${registryName}' still exists, waiting 10s...`,
                );
                // eslint-disable-next-line cypress/no-unnecessary-waiting
                return cy.wait(10000).then(() => checkDeletionComplete());
              });
          };

          return checkDeletionComplete();
        });
    });
};

/**
 * Check if a model version exists in the database
 * @param versionName Name of the version to check
 * @param databaseName Name of the database deployment (defaults to 'model-registry-db' for backwards compatibility)
 * @returns Cypress.Chainable<boolean> that resolves to true if the version exists
 */
export const checkModelVersionExistsInDatabase = (
  versionName: string,
  databaseName = 'model-registry-db',
): Cypress.Chainable<boolean> => {
  const targetNamespace = getModelRegistryNamespace();
  const findPodCommand = `oc get pods -n ${targetNamespace} -o name | grep ${databaseName} | head -1 | cut -d'/' -f2`;

  return cy
    .exec(findPodCommand, { failOnNonZeroExit: false })
    .then((podResult: CommandLineResult) => {
      if (podResult.code !== 0 || !podResult.stdout.trim()) {
        cy.log(
          `No MySQL pod found for database '${databaseName}', cannot verify version existence`,
        );
        return cy.wrap(false);
      }

      const podName = podResult.stdout.trim();
      const sqlQuery = `SELECT COUNT(*) FROM Context WHERE name LIKE '%${versionName.replace(
        /'/g,
        "''",
      )}%';`;
      const verifyCommand = `oc exec ${podName} -n ${targetNamespace} -- mysql -u mlmduser -pTheBlurstOfTimes --database="model-registry" -e "${sqlQuery}" --skip-column-names`;

      cy.log(`Checking if version '${versionName}' exists in database '${databaseName}'`);

      return cy
        .exec(verifyCommand, { failOnNonZeroExit: false })
        .then((verifyResult: CommandLineResult) => {
          if (verifyResult.code === 0) {
            const count = parseInt(verifyResult.stdout.trim(), 10);
            const exists = count > 0;
            cy.log(`Version '${versionName}' exists in database: ${exists}`);
            return cy.wrap(exists);
          }
          cy.log(`Database verification failed: ${verifyResult.stderr}`);
          return cy.wrap(false);
        });
    });
};
