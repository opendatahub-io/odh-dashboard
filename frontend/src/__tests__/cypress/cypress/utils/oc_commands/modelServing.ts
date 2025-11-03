/* eslint-disable cypress/no-unnecessary-waiting */
import { createDataConnection } from '#~/__tests__/cypress/cypress/utils/oc_commands/dataConnection';
import { AWS_BUCKETS } from '#~/__tests__/cypress/cypress/utils/s3Buckets';
import type { DataConnectionReplacements } from '#~/__tests__/cypress/cypress/types';
import { createCleanProject } from '#~/__tests__/cypress/cypress/utils/projectChecker';

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
 * Type for InferenceService Condition
 */
type InferenceServiceCondition = {
  type: string;
  status: string;
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
  severity?: string;
};

/**
 * Type for InferenceService State
 */
type InferenceServiceState = {
  status?: {
    conditions?: InferenceServiceCondition[];
    modelStatus?: {
      states?: {
        activeModelState?: string;
      };
    };
    deploymentMode?: string;
  };
};

/**
 * Type for Condition Check
 */
type ConditionCheck = {
  type: string;
  expectedStatus: string;
  check: (condition: InferenceServiceCondition) => boolean;
  name: string;
};

/**
 * Type for Condition Check Options
 */
type ConditionCheckOptions = {
  checkLatestDeploymentReady?: boolean;
  checkReady?: boolean;
  checkStopped?: boolean;
  requireLoadedState?: boolean;
};

/**
 * Safely get a string value, defaulting to an empty string
 */
const safeString = (value: string | undefined | null): string => value ?? '';

/**
 * Check InferenceService active model state and additional conditions
 *
 * @param serviceName InferenceService name
 * @param namespace The namespace where the InferenceService is deployed
 * @param options Optional configuration for condition checks
 * @returns Result Object of the operation
 */
export const checkInferenceServiceState = (
  serviceName: string,
  namespace: string,
  options: ConditionCheckOptions = {},
): Cypress.Chainable<Cypress.Exec> => {
  const ocCommand = `oc get inferenceService ${serviceName} -n ${namespace} -o json`;
  const maxAttempts = 96; // 8 minutes / 5 seconds = 96 attempts
  let attempts = 0;

  const checkState = (): Cypress.Chainable<Cypress.Exec> =>
    cy.exec(ocCommand, { failOnNonZeroExit: false }).then((result) => {
      attempts++;

      // Log raw command output for debugging
      cy.log(`Raw command output (attempt ${attempts}):
        Exit code: ${result.code}
        Stdout length: ${result.stdout.length}
        Stderr: ${result.stderr || 'none'}`);

      // Check if the command failed
      if (result.code !== 0) {
        const errorMsg = `Command failed with exit code ${result.code}: ${result.stderr}`;
        cy.log(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // Check if stdout is empty
      if (!result.stdout.trim()) {
        const errorMsg = 'Command succeeded but returned empty output';
        cy.log(`❌ ${errorMsg}`);
        throw new Error(errorMsg);
      }

      let serviceState: InferenceServiceState;
      try {
        // Log the first 100 characters of stdout for debugging
        cy.log(`Attempting to parse JSON (first 100 chars): ${result.stdout.substring(0, 100)}...`);
        serviceState = JSON.parse(result.stdout) as InferenceServiceState;
      } catch (error) {
        const errorMsg = `Failed to parse InferenceService JSON: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`;
        cy.log(`❌ ${errorMsg}`);
        cy.log(`Raw stdout: ${result.stdout}`);
        throw new Error(errorMsg);
      }

      // Check active model state
      const activeModelState =
        serviceState.status?.modelStatus?.states?.activeModelState || 'EMPTY';
      const conditions = serviceState.status?.conditions || [];

      // Check deployment mode
      const actualDeploymentMode = serviceState.status?.deploymentMode || 'EMPTY';

      // Detailed initial logging
      cy.log(`🧐 Attempt ${attempts}: Checking InferenceService state
        Service Name: ${serviceName}
        Active Model State: ${activeModelState}
        Deployment Mode: ${actualDeploymentMode}
        Total Conditions: ${conditions.length}`);

      // Prepare condition checks with logging
      const conditionChecks: ConditionCheck[] = [];

      // Only add condition checks that are explicitly enabled
      if (options.checkLatestDeploymentReady) {
        conditionChecks.push({
          type: 'LatestDeploymentReady',
          expectedStatus: 'True',
          check: (condition) =>
            condition.type === 'LatestDeploymentReady' && condition.status === 'True',
          name: 'Latest Deployment Ready',
        });
      }

      if (options.checkReady) {
        conditionChecks.push({
          type: 'Ready',
          expectedStatus: 'True',
          check: (condition) => condition.type === 'Ready' && condition.status === 'True',
          name: 'Service Ready',
        });
      }

      if (options.checkStopped) {
        conditionChecks.push({
          type: 'Stopped',
          expectedStatus: 'True',
          check: (condition) => condition.type === 'Stopped' && condition.status === 'True',
          name: 'Service Stopped',
        });
      }

      // If no condition checks are specified, skip condition validation
      const shouldValidateConditions = conditionChecks.length > 0;

      // Perform condition checks with detailed logging
      const checkedConditions = conditionChecks.map((condCheck) => {
        const foundCondition = conditions.find((condition) => condition.type === condCheck.type);

        const isPassed = foundCondition ? condCheck.check(foundCondition) : false;

        // Detailed condition logging
        cy.log(`🔍 Condition Check: ${condCheck.name}
          Type: ${condCheck.type}
          Expected Status: ${condCheck.expectedStatus}
          Found Condition: ${foundCondition ? 'Yes' : 'No'}
          Status: ${safeString(foundCondition?.status)}
          Reason: ${safeString(foundCondition?.reason)}
          Passed: ${isPassed ? '✅' : '❌'}`);

        return {
          ...condCheck,
          foundCondition,
          isPassed,
        };
      });

      // Check if active model state is "Loaded"
      const isModelLoaded = activeModelState === 'Loaded';
      cy.log(`Active Model State Check: ${isModelLoaded ? '✅ Loaded' : '❌ Not Loaded'}`);

      // Always RawDeployment (no validation needed)
      cy.log(`📋 InferenceService ${serviceName} deployment mode: ${actualDeploymentMode}`);
      // Determine overall success
      // If no condition checks were specified, only check model state
      const allConditionsPassed =
        !shouldValidateConditions || checkedConditions.every((check) => check.isPassed);
      // If the user does not want to check the loaded state, then we can return if all conditions are met
      const requireLoaded = options.requireLoadedState !== false;

      if ((!requireLoaded || isModelLoaded) && allConditionsPassed) {
        cy.log(
          `✅ InferenceService ${serviceName} meets all conditions after ${attempts} attempts`,
        );
        return cy.wrap(result);
      }

      if (attempts >= maxAttempts) {
        // Prepare detailed error message with full condition details
        const conditionDetails = conditions
          .map(
            (condition) =>
              `Type: ${safeString(condition.type)}, Status: ${safeString(
                condition.status,
              )}, Reason: ${safeString(condition.reason)}, Message: ${safeString(
                condition.message,
              )}`,
          )
          .join('\n');

        const errorMessage = `❌ InferenceService ${serviceName} did not meet all conditions within 8 minutes
          Active Model State: ${activeModelState}
          Condition Checks:
          ${checkedConditions
            .map(
              (check) =>
                `${check.name}: ${check.isPassed ? '✅' : '❌'} (Status: ${safeString(
                  check.foundCondition?.status,
                )})`,
            )
            .join('\n')}
          
          Full Condition Details:
          ${conditionDetails}`;

        cy.log(errorMessage);
        throw new Error(errorMessage);
      } else {
        return cy.wait(5000).then(() => checkState());
      }
    });

  return checkState();
};

/**
 * Extracts the external URL of a model from its InferenceService and performs a test request.
 * Retries the request every 5 seconds for up to 30 seconds if the initial request fails.
 *
 * @param modelName - The name of the InferenceService/model to test.
 * @param namespace - The namespace where the InferenceService is deployed.
 */
export const modelExternalTester = (
  modelName: string,
  namespace: string,
  token?: string,
): Cypress.Chainable<{ url: string; response: Cypress.Response<unknown> }> =>
  cy.exec(`oc get inferenceService ${modelName} -n ${namespace} -o json`).then((result) => {
    const inferenceService = JSON.parse(result.stdout);
    const { url } = inferenceService.status;

    if (!url) {
      throw new Error('External URL not found in InferenceService');
    }

    const makeRequest = (
      attemptNumber = 1,
      maxAttempts = 7, // Initial attempt + 6 retries = 30 seconds total
      waitTime = 5000, // 5 seconds
    ): Cypress.Chainable<{ url: string; response: Cypress.Response<unknown> }> => {
      cy.log(`Request attempt ${attemptNumber} of ${maxAttempts}`);
      cy.log(`Request URL: ${url}/v2/models/${modelName}/infer`);
      cy.log(`Request method: POST`);
      cy.log(
        `Request headers: ${JSON.stringify({
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        })}`,
      );
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
            ...(token && { Authorization: `Bearer ${token}` }),
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

          // If the request is successful (200 status), return the result
          if (response.status === 200) {
            return cy.wrap({ url, response });
          }

          // If we've reached the maximum number of attempts, return the last response
          if (attemptNumber >= maxAttempts) {
            cy.log(`Maximum retry attempts (${maxAttempts}) reached, returning last response`);
            return cy.wrap({ url, response });
          }

          // Otherwise, wait and retry
          cy.log(
            `Request failed with status ${response.status}, retrying in ${
              waitTime / 1000
            } seconds...`,
          );

          // Use Cypress's wait command before making the next attempt
          return cy
            .wait(waitTime)
            .then(() => makeRequest(attemptNumber + 1, maxAttempts, waitTime));
        });
    };

    // Start the request chain with the first attempt
    return makeRequest();
  });

/**
 * Validates tolerations in a workbench pod
 *
 * @param namespace The namespace where the workbench pod is running
 * @param modelName The prefix or partial name of the Model pod
 * @param expectedToleration The toleration to check for, or null if no toleration is expected
 * @param expectPodRunning Whether the pod is expected to be running
 * @returns Cypress.Chainable<string> that resolves to the result of the validation or pod name
 */
/**
 * Validates tolerations in an InferenceService resource.
 *
 * @param namespace The namespace where the InferenceService is deployed.
 * @param inferenceServiceName The name of the InferenceService resource.
 * @param expectedToleration The toleration object to check for, or null if no toleration is expected.
 * @returns Cypress.Chainable<void> that resolves after validation.
 */
export const validateInferenceServiceTolerations = (
  namespace: string,
  inferenceServiceName: string,
  expectedToleration: { key: string; operator: string; effect: string } | null,
): Cypress.Chainable<Cypress.Exec> => {
  // Construct the `oc` command to retrieve the InferenceService JSON
  const getInferenceServiceCmd = `oc get inferenceService ${inferenceServiceName} -n ${namespace} -o json`;

  // Log the command being executed for debugging purposes
  cy.log(`Executing command: ${getInferenceServiceCmd}`);

  return cy.exec(getInferenceServiceCmd, { failOnNonZeroExit: false }).then((result) => {
    // Handle command failure
    if (result.code !== 0) {
      const errorMsg = result.stderr.includes('NotFound')
        ? `InferenceService "${inferenceServiceName}" not found in namespace "${namespace}".`
        : `Command failed: ${result.stderr}`;
      cy.log(`❌ Error executing command:\n${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Parse JSON output to extract tolerations
    const inferenceService = JSON.parse(result.stdout);
    const tolerations = inferenceService.spec.predictor.tolerations || [];
    cy.log(`Found tolerations: ${JSON.stringify(tolerations)}`);

    if (expectedToleration) {
      // Validate that the expected toleration exists in the list
      const exists = tolerations.some(
        (t: { key: string; operator: string; effect: string }) =>
          t.key === expectedToleration.key &&
          t.operator === expectedToleration.operator &&
          t.effect === expectedToleration.effect,
      );

      if (!exists) {
        throw new Error(
          `Expected toleration ${JSON.stringify(
            expectedToleration,
          )} not found in InferenceService "${inferenceServiceName}".\n` +
            `Found tolerations: ${JSON.stringify(tolerations)}`,
        );
      }

      cy.log(
        `✅ Verified expected toleration exists in InferenceService "${inferenceServiceName}".`,
      );
    } else {
      // Validate that no tolerations exist
      if (tolerations.length > 0) {
        throw new Error(
          `Unexpected tolerations found in InferenceService "${inferenceServiceName}":\n${JSON.stringify(
            tolerations,
          )}`,
        );
      }

      cy.log(`✅ No tolerations found as expected in InferenceService "${inferenceServiceName}".`);
    }
  });
};

export const verifyS3CopyCompleted = (
  podName: string,
  namespace: string,
): Cypress.Chainable<Cypress.Exec> =>
  cy.exec(`oc logs ${podName} -n ${namespace}`, { failOnNonZeroExit: false }).then((result) => {
    if (!result.stdout.includes('S3 copy completed successfully')) {
      throw new Error('S3 copy did not complete successfully');
    }
  });

/**
 * Retrieve the token for a given service account and model
 *
 * @param namespace The namespace where the InferenceService is deployed.
 * @param serviceAccountName The name of the service account to get the token for.
 * @param modelName The name of the model to get the token for.
 * @returns Cypress.Chainable<string> that resolves after validation.
 */
export const getModelExternalToken = (
  namespace: string,
  serviceAccountName: string,
  modelName: string,
): Cypress.Chainable<string> =>
  cy
    .exec(
      `oc get secret ${serviceAccountName}-${modelName}-sa -n ${namespace} -o jsonpath='{.data.token}' | base64 -d`,
    )
    .then((result) => result.stdout);

/**
 * Verify the model is accessible with a token
 *
 * @param modelName The name of the model to test.
 * @param namespace The namespace where the model is deployed.
 * @param token The (optional) token to use for the request.
 * @returns Cypress.Chainable<Cypress.Response<unknown>> that resolves after validation.
 */
export const verifyModelExternalToken = (
  modelName: string,
  namespace: string,
  token?: string,
): Cypress.Chainable<Cypress.Response<unknown>> =>
  cy.exec(`oc get inferenceService ${modelName} -n ${namespace} -o json`).then((result) => {
    const inferenceService = JSON.parse(result.stdout);
    const { url } = inferenceService.status;

    if (!url) {
      throw new Error('External URL not found in InferenceService');
    }

    return cy
      .request({
        method: 'GET',
        url: `${url}/v2/models/${modelName}`,
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })
      .then((response) => {
        cy.log('Model metadata:', JSON.stringify(response.body));
        return cy.wrap(response);
      });
  });
