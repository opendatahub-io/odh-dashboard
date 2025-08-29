/**
 * Utility functions for Model Registry OC commands
 */

import type { CommandLineResult } from '#~/__tests__/cypress/cypress/types';
import { applyOpenShiftYaml } from '#~/__tests__/cypress/cypress/utils/oc_commands/baseCommands';
import { replacePlaceholdersInYaml } from '#~/__tests__/cypress/cypress/utils/yaml_files';

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
 * @returns Cypress.Chainable<boolean> that resolves to true if operator is properly configured
 */
export const ensureOperatorMemoryLimit = (): Cypress.Chainable<boolean> => {
  const operatorNamespace = Cypress.env('APPLICATIONS_NAMESPACE');
  const deploymentName = 'model-registry-operator-controller-manager';

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
 * @returns Cypress.Chainable<CommandLineResult>
 */
export const createModelRegistryDatabaseViaYAML = (): Cypress.Chainable<CommandLineResult> => {
  const targetNamespace = getModelRegistryNamespace();

  const databaseReplacements = {
    NAMESPACE: targetNamespace,
  };

  cy.log(`Creating SQL database for model registry in namespace ${targetNamespace}`);

  // Check if database already exists and is ready
  return cy
    .exec(
      `oc get deployment model-registry-db -n ${targetNamespace} -o jsonpath='{.status.readyReplicas}'`,
      { failOnNonZeroExit: false },
    )
    .then((checkResult: CommandLineResult) => {
      const readyReplicas = parseInt(checkResult.stdout.trim()) || 0;
      if (checkResult.code === 0 && readyReplicas > 0) {
        cy.log('Model registry database already exists and is ready, skipping creation');
        return cy.wrap(checkResult);
      }

      // Database doesn't exist, create it
      cy.log('Database does not exist, proceeding with creation');
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
 * @returns Cypress.Chainable<boolean> that resolves to true if the database is ready
 */
export const waitForModelRegistryDatabase = (): Cypress.Chainable<boolean> => {
  const targetNamespace = getModelRegistryNamespace();
  const command = `oc wait --for=condition=Available deployment/model-registry-db -n ${targetNamespace} --timeout=300s`;

  cy.log('Waiting for model registry database to be ready...');
  return cy
    .exec(command, { failOnNonZeroExit: false, timeout: 300000 })
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
 * @returns Cypress.Chainable<boolean> that resolves to true if the database is created and ready
 */
export const createAndVerifyDatabase = (): Cypress.Chainable<boolean> => {
  cy.step('Create SQL database for model registry');
  return createModelRegistryDatabaseViaYAML()
    .then(() => {
      cy.step('Wait for model registry database to be ready');
      return waitForModelRegistryDatabase().should('be.true');
    })
    .then(() => {
      return cy.wrap(true);
    });
};

/**
 * Delete the model registry database
 * @returns Cypress.Chainable<CommandLineResult>
 */
export const deleteModelRegistryDatabase = (): Cypress.Chainable<CommandLineResult> => {
  const targetNamespace = getModelRegistryNamespace();
  const deleteCommand = `oc delete service,pvc,deployment,secret -l app.kubernetes.io/name=model-registry-db -n ${targetNamespace}`;

  cy.log(`Deleting model registry database from namespace ${targetNamespace}`);

  return cy.exec(deleteCommand, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
    if (result.code !== 0) {
      cy.log(`Delete command failed: ${result.stderr || result.stdout}`);
      return cy.wrap(result);
    }

    // Wait for the db to be deleted
    const waitCommand = `oc wait --for=delete deployment/model-registry-db -n ${targetNamespace} --timeout=60s`;
    cy.log('Waiting for model registry database deployment to be deleted...');

    return cy
      .exec(waitCommand, { failOnNonZeroExit: false, timeout: 60000 })
      .then((waitResult: CommandLineResult) => {
        if (waitResult.code === 0) {
          cy.log('Model registry database deletion confirmed - deployment successfully deleted');
        } else {
          cy.log(
            `Warning: Failed to confirm database deletion within timeout: ${
              waitResult.stderr || waitResult.stdout
            }`,
          );
          // final validation
          return cy
            .exec(`oc get deployment model-registry-db -n ${targetNamespace}`, {
              failOnNonZeroExit: false,
            })
            .then((checkResult: CommandLineResult) => {
              if (checkResult.code !== 0) {
                cy.log(
                  'Model registry database deployment not found - deletion appears successful',
                );
              } else {
                cy.log(
                  'Warning: Model registry database deployment still exists after deletion attempt',
                );
              }
            });
        }
        return cy.wrap(result);
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
  const command = `oc wait --for=condition=Available modelregistry.modelregistry.opendatahub.io/${registryName} -n ${targetNamespace} --timeout=240s`;
  cy.log(`Waiting for model registry ${registryName} to be available...`);
  return cy
    .exec(command, { failOnNonZeroExit: false, timeout: 240000 })
    .then((result: CommandLineResult) => {
      if (result.stdout) {
        cy.log(`Wait result: ${result.stdout}`);
      }
      if (result.stderr) {
        cy.log(`Wait stderr: ${result.stderr}`);
      }
      return cy.wrap(result.code === 0);
    });
};

/**
 * Create a model registry using YAML fixtures
 * @param registryName Name of the model registry to create
 * @returns Cypress.Chainable<CommandLineResult>
 */
export const createModelRegistryViaYAML = (
  registryName: string,
): Cypress.Chainable<CommandLineResult> => {
  const targetNamespace = getModelRegistryNamespace();

  const registryReplacements = {
    REGISTRY_NAME: registryName,
    NAMESPACE: targetNamespace,
  };

  cy.log(
    `Creating model registry ${registryName} in namespace ${targetNamespace} using existing secret model-registry-db`,
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
 * @returns Cypress.Chainable that resolves when the registry is created and available
 */
export const createAndVerifyModelRegistry = (registryName: string): Cypress.Chainable => {
  cy.step('Create a model registry using YAML');
  return createModelRegistryViaYAML(registryName)
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
 * Complete cleanup for model registry components
 * @param modelNames Array of model names to clean up from database
 * @param registryName Name of the model registry to delete
 * @returns Cypress.Chainable that resolves when cleanup is complete
 */
export const cleanupModelRegistryComponents = (
  modelNames: string[],
  registryName: string,
): Cypress.Chainable => {
  cy.step('Clean up registered models from database');
  return cleanupRegisteredModelsFromDatabase(modelNames)
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
 * @returns Cypress.Chainable
 */
export const cleanupRegisteredModelsFromDatabase = (modelNames: string[]): Cypress.Chainable => {
  const targetNamespace = getModelRegistryNamespace();

  // Find MySQL pod
  const findPodCommand = `oc get pods -n ${targetNamespace} -o name | grep model-registry-db | head -1 | cut -d'/' -f2`;

  return cy
    .exec(findPodCommand, { failOnNonZeroExit: false })
    .then((podResult: CommandLineResult) => {
      if (podResult.code !== 0 || !podResult.stdout.trim()) {
        cy.log('No MySQL pod found, skipping database cleanup');
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

      const cleanupCommand = `oc exec ${podName} -n ${targetNamespace} -- mysql -u mlmduser -pTheBlurstOfTimes model_registry -e "${sqlCommands}"`;

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
 * @returns Cypress.Chainable<boolean> that resolves to true if the model exists
 */
export const checkModelExistsInDatabase = (modelName: string): Cypress.Chainable<boolean> => {
  const targetNamespace = getModelRegistryNamespace();
  const findPodCommand = `oc get pods -n ${targetNamespace} -o name | grep model-registry-db | head -1 | cut -d'/' -f2`;

  return cy
    .exec(findPodCommand, { failOnNonZeroExit: false })
    .then((podResult: CommandLineResult) => {
      if (podResult.code !== 0 || !podResult.stdout.trim()) {
        cy.log('No MySQL pod found, cannot verify model existence');
        return cy.wrap(false);
      }

      const podName = podResult.stdout.trim();
      const sqlQuery = `SELECT COUNT(*) FROM Context WHERE name = '${modelName.replace(
        /'/g,
        "''",
      )}';`;
      const verifyCommand = `oc exec ${podName} -n ${targetNamespace} -- mysql -u mlmduser -pTheBlurstOfTimes model_registry -e "${sqlQuery}" --skip-column-names`;

      cy.log(`Checking if model '${modelName}' exists in database`);

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
 * Check if a model version exists in the database
 * @param versionName Name of the version to check
 * @returns Cypress.Chainable<boolean> that resolves to true if the version exists
 */
export const checkModelVersionExistsInDatabase = (
  versionName: string,
): Cypress.Chainable<boolean> => {
  const targetNamespace = getModelRegistryNamespace();
  const findPodCommand = `oc get pods -n ${targetNamespace} -o name | grep model-registry-db | head -1 | cut -d'/' -f2`;

  return cy
    .exec(findPodCommand, { failOnNonZeroExit: false })
    .then((podResult: CommandLineResult) => {
      if (podResult.code !== 0 || !podResult.stdout.trim()) {
        cy.log('No MySQL pod found, cannot verify version existence');
        return cy.wrap(false);
      }

      const podName = podResult.stdout.trim();
      const sqlQuery = `SELECT COUNT(*) FROM Context WHERE name LIKE '%${versionName.replace(
        /'/g,
        "''",
      )}%';`;
      const verifyCommand = `oc exec ${podName} -n ${targetNamespace} -- mysql -u mlmduser -pTheBlurstOfTimes model_registry -e "${sqlQuery}" --skip-column-names`;

      cy.log(`Checking if version '${versionName}' exists in database`);

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
