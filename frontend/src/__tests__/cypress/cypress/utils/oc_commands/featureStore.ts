import type { CommandLineResult } from '#~/__tests__/cypress/cypress/types';
import { replacePlaceholdersInYaml } from '#~/__tests__/cypress/cypress/utils/yaml_files';
import { AWS_BUCKETS } from '#~/__tests__/cypress/cypress/utils/s3Buckets';
import { waitForPodReady, applyOpenShiftYaml } from './baseCommands';

/**
 * Delete FeatureStore resources by name.
 *
 * @param featureStoreNames Array of FeatureStore resource names to delete
 * @param namespace The namespace containing the resources
 * @param options Configuration options for the deletion operation
 * @returns A Cypress chainable that executes the deletion commands
 */
export const deleteFeatureStoreResources = (
  featureStoreNames: string[],
  namespace: string,
  options: { timeout?: number; wait?: boolean; ignoreNotFound?: boolean } = {},
): Cypress.Chainable<CommandLineResult> => {
  const { timeout, wait = true, ignoreNotFound = true } = options;

  cy.step(
    `Delete FeatureStore resources: ${featureStoreNames.join(', ')} from namespace ${namespace}`,
  );

  const deleteCommands = featureStoreNames
    .map(
      (name) =>
        `oc delete FeatureStore ${name} -n ${namespace} ${
          ignoreNotFound ? '--ignore-not-found' : ''
        }`,
    )
    .join(' && ');

  // Also delete the secret
  const fullCommand = `${deleteCommands} && oc delete secret workbench-s3-credentials -n ${namespace} --ignore-not-found`;

  const execOptions = {
    failOnNonZeroExit: false,
    ...(wait && timeout && { timeout }),
  };

  return cy.exec(fullCommand, execOptions).then((result) => {
    if (result.code !== 0 && !ignoreNotFound) {
      cy.log(`Error deleting FeatureStore resources: ${result.stderr}`);
      throw new Error(`Failed to delete FeatureStore resources: ${result.stderr}`);
    }
    return result;
  });
};

/**
 * Create FeatureStore deployment via YAML with automatic namespace handling
 * @returns Cypress.Chainable<boolean> that resolves to true if deployment is successful
 */
export const createFeatureStoreDeploymentViaYAML = (): Cypress.Chainable<boolean> => {
  const targetNamespace = 'default';

  cy.log(`Creating FeatureStore deployment in namespace ${targetNamespace}`);

  // Use AWS_BUCKETS.BUCKET_2 credentials from test-variables.yml (has write permissions)
  const s3Config = AWS_BUCKETS.BUCKET_2;
  const awsAccessKey = AWS_BUCKETS.AWS_ACCESS_KEY_ID;
  const awsSecretKey = AWS_BUCKETS.AWS_SECRET_ACCESS_KEY;
  const awsDefaultRegion = s3Config.REGION;

  const featureStoreReplacements = {
    NAMESPACE: targetNamespace,
    AWS_ACCESS_KEY_ID: awsAccessKey,
    AWS_SECRET_ACCESS_KEY: awsSecretKey,
    AWS_DEFAULT_REGION: awsDefaultRegion,
    BUCKET_NAME: s3Config.NAME,
  };

  return cy
    .fixture('e2e/featureStore/testFeatureStoreDeployment.yaml')
    .then((featureStoreYamlContent) => {
      const modifiedFeatureStoreYaml = replacePlaceholdersInYaml(
        featureStoreYamlContent,
        featureStoreReplacements,
      );
      // Apply the processed YAML using applyOpenShiftYaml
      return applyOpenShiftYaml(modifiedFeatureStoreYaml).then((result) => {
        if (result.code !== 0) {
          cy.log(`Error applying FeatureStore resources: ${result.stderr}`);
          throw new Error(`Failed to apply FeatureStore resources: ${result.stderr}`);
        }

        cy.log('FeatureStore resources applied successfully, waiting for readiness');
        // Wait for feast-related pods to be ready with 10 minute timeout
        return cy.wrap(null).then(() => {
          waitForPodReady('feast', '600s', targetNamespace);
          return cy.wrap(true);
        });
      });
    });
};
