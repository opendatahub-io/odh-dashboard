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
  const command = `oc wait --for=condition=Available modelregistry.modelregistry.opendatahub.io/${registryName} -n ${targetNamespace} --timeout=120s`;
  cy.log(`Waiting for model registry ${registryName} to be available...`);
  return cy.exec(command, { failOnNonZeroExit: false }).then((result: CommandLineResult) => {
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
    .then((result: CommandLineResult) => {
      return result;
    });
};

/**
 * Delete a model registry
 * @param registryName Name of the model registry to delete
 * @returns Cypress.Chainable<CommandLineResult>
 */
export const deleteModelRegistry = (registryName: string): Cypress.Chainable<CommandLineResult> => {
  const targetNamespace = getModelRegistryNamespace();
  const registryCommand = `oc delete modelregistry.modelregistry.opendatahub.io ${registryName} -n ${targetNamespace}`;

  cy.log(`Deleting model registry ${registryName} from namespace ${targetNamespace}`);

  return cy.exec(registryCommand, { failOnNonZeroExit: false });
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
