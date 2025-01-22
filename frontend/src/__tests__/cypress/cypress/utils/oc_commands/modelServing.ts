/* eslint-disable cypress/no-unnecessary-waiting */
import { createDataConnection } from '~/__tests__/cypress/cypress/utils/oc_commands/dataConnection';
import { AWS_BUCKETS } from '~/__tests__/cypress/cypress/utils/s3Buckets';
import type { DataConnectionReplacements } from '~/__tests__/cypress/cypress/types';
import { createCleanProject } from '~/__tests__/cypress/cypress/utils/projectChecker';

/**
 * Provision (using oc) a Project in order to make it usable with model seving
 * (creates a Data Connection also)
 *
 * @param projectName Project Name
 * @param bucketKey AWS Bucket
 * @param customDataConnectionYamlPath DC Yaml Value
 */
export const provisionProjectForModelServing = (
  projectName: string,
  bucketKey: 'BUCKET_1' | 'BUCKET_3',
  customDataConnectionYamlPath?: string,
): void => {
  cy.log(`Provisioning project with bucket key: ${bucketKey}`);

  const bucketConfig = AWS_BUCKETS[bucketKey];

  // Provision a Project
  createCleanProject(projectName);

  // Create a pipeline-compatible Data Connection
  const dataConnectionReplacements: DataConnectionReplacements = {
    NAMESPACE: projectName,
    AWS_ACCESS_KEY_ID: Buffer.from(AWS_BUCKETS.AWS_ACCESS_KEY_ID).toString('base64'),
    AWS_DEFAULT_REGION: Buffer.from(bucketConfig.REGION).toString('base64'),
    AWS_S3_BUCKET: Buffer.from(bucketConfig.NAME).toString('base64'),
    AWS_S3_ENDPOINT: Buffer.from(bucketConfig.ENDPOINT).toString('base64'),
    AWS_SECRET_ACCESS_KEY: Buffer.from(AWS_BUCKETS.AWS_SECRET_ACCESS_KEY).toString('base64'),
  };
  createDataConnection(dataConnectionReplacements, customDataConnectionYamlPath);
};

/**
 * Check InferenceService active model state
 *
 *
 * @param serviceName InferenceService name
 * @returns Result Object of the operation
 */
export const checkInferenceServiceState = (
  serviceName: string,
): Cypress.Chainable<Cypress.Exec> => {
  const ocCommand = `oc get inferenceService ${serviceName} -o json | grep activeModelState`;
  const maxAttempts = 60; // 5 minutes / 5 seconds = 60 attempts
  let attempts = 0;

  const checkState = (): Cypress.Chainable<Cypress.Exec> => {
    return cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
      attempts++;

      // Use cy.log for both Cypress logging and console output
      cy.log(`🧐 Attempt ${attempts}: Checking InferenceService state
          Command: ${ocCommand}
          Output: ${result.stdout}`);

      if (result.stdout.includes('"activeModelState": "Loaded"')) {
        cy.log(
          `✅ InferenceService ${serviceName} is in "Loaded" state after ${attempts} attempts`,
        );
        return cy.wrap(result);
      }
      if (attempts >= maxAttempts) {
        const errorMessage = `❌ InferenceService ${serviceName} did not reach "Loaded" state within 5 minutes`;
        cy.log(errorMessage);
        throw new Error(errorMessage);
      } else {
        return cy.wait(5000).then(() => checkState());
      }
    });
  };

  return checkState();
};

/**
 * Extracts the external URL of a model from its InferenceService and performs a test request.
 *
 * @param modelName - The name of the InferenceService/model to test.
 */
export const modelExternalURLOpenVinoTester = (
  modelName: string,
): Cypress.Chainable<{ url: string; response: Cypress.Response<unknown> }> => {
  return cy.exec(`oc get inferenceService ${modelName} -o json`).then((result) => {
    const inferenceService = JSON.parse(result.stdout);
    const { url } = inferenceService.status;

    if (!url) {
      throw new Error('External URL not found in InferenceService');
    }

    cy.log(`Request URL: ${url}/v2/models/${modelName}/infer`);
    cy.log(`Request method: POST`);
    cy.log(`Request headers: ${JSON.stringify({ 'Content-Type': 'application/json' })}`);
    cy.log(
      `Request body: ${JSON.stringify({
        inputs: [
          {
            name: 'Func/StatefulPartitionedCall/input/_0:0',
            shape: [1, 30],
            datatype: 'FP32',
            data: Array.from({ length: 30 }, (_, i) => i + 1),
          },
        ],
      })}`,
    );

    return cy
      .request({
        method: 'POST',
        url: `${url}/v2/models/${modelName}/infer`,
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          inputs: [
            {
              name: 'Func/StatefulPartitionedCall/input/_0:0',
              shape: [1, 30],
              datatype: 'FP32',
              data: Array.from({ length: 30 }, (_, i) => i + 1),
            },
          ],
        },
        failOnStatusCode: false,
      })
      .then((response) => {
        cy.log(`Response status: ${response.status}`);
        cy.log(`Response body: ${JSON.stringify(response.body)}`);

        // Return a Cypress chain instead of a plain object
        return cy.wrap({ url, response });
      });
  });
};
