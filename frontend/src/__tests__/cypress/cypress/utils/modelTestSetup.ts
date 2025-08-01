import yaml from 'js-yaml';
import { execWithOutput, applyOpenShiftYaml } from './oc_commands/baseCommands';
import { deleteOpenShiftProject } from './oc_commands/project';
import { generateTestUUID } from './uuidGenerator';
import { createCleanProject } from './projectChecker';
import { replacePlaceholdersInYaml } from './yaml_files';

// Utility functions to check if resources already exist
const checkResourceExists = (
  resourceType: string,
  resourceName: string,
  namespace: string,
): Cypress.Chainable<boolean> =>
  execWithOutput(`oc get ${resourceType} ${resourceName} -n ${namespace} --no-headers`, 30).then(
    ({ code, stdout }) => {
      const exists = code === 0 && stdout.trim() !== '';
      cy.log(
        `Resource ${resourceType}/${resourceName} exists check: code=${code}, stdout='${stdout.trim()}', exists=${exists}`,
      );
      return cy.wrap(exists);
    },
  );

const checkInferenceServiceExists = (
  modelName: string,
  namespace: string,
): Cypress.Chainable<boolean> =>
  checkResourceExists('inferenceservice', modelName, namespace).then((exists) => {
    cy.log(`InferenceService ${modelName} exists check result: ${exists}`);
    return cy.wrap(exists);
  });

const checkServingRuntimeExists = (namespace: string): Cypress.Chainable<boolean> =>
  execWithOutput(`oc get servingruntime -n ${namespace} --no-headers | wc -l`, 30).then(
    ({ code, stdout }) => {
      const exists = code === 0 && parseInt(stdout.trim()) > 0;
      cy.log(`ServingRuntime exists check result: ${exists} (count: ${stdout.trim()})`);
      return cy.wrap(exists);
    },
  );

const checkStorageDeploymentExists = (
  deploymentName: string,
  namespace: string,
): Cypress.Chainable<boolean> => checkResourceExists('deployment', deploymentName, namespace);

// Robust port extraction function
const extractPortFromYaml = (yamlContent: string): string => {
  try {
    // Handle multiple YAML documents by using loadAll
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsedYamls = yaml.loadAll(yamlContent) as any[];

    // Search through all documents for port information
    for (const parsedYaml of parsedYamls) {
      // Try multiple possible paths for port extraction
      const port =
        parsedYaml?.spec?.ports?.[0]?.port ||
        parsedYaml?.spec?.template?.spec?.containers?.[0]?.ports?.[0]?.containerPort ||
        parsedYaml?.spec?.template?.spec?.containers?.[0]?.ports?.[0]?.port;

      if (port) {
        return port.toString();
      }
    }

    // Fallback to regex if YAML parsing doesn't find the port
    const portMatch = yamlContent.match(/port:\s*(\d+)/);
    return portMatch ? portMatch[1] : '9000';
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    cy.log(`Warning: Failed to parse YAML for port extraction: ${error}`);
    // Fallback to regex
    const portMatch = yamlContent.match(/port:\s*(\d+)/);
    return portMatch ? portMatch[1] : '9000';
  }
};

// Function to deploy storage if needed
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/restrict-template-expressions */
const deployStorageIfNeeded = (
  modelTestConfig: ModelTestConfig,
  testProjectName: string,
): Cypress.Chainable<any> =>
  checkStorageDeploymentExists(modelTestConfig.storageDeploymentName, testProjectName).then(
    (storageExists) => {
      if (storageExists) {
        cy.log(
          `Storage deployment ${modelTestConfig.storageDeploymentName} already exists, skipping storage deployment`,
        );
        return cy.wrap(undefined);
      }
      cy.log(`Deploying storage resources from ${modelTestConfig.storageYaml}`);
      return cy.fixture(modelTestConfig.storageYaml).then((yamlContent) => {
        try {
          // Use robust port extraction
          const port = extractPortFromYaml(yamlContent);

          // Construct the storage endpoint automatically from deployment name and namespace
          const storageEndpoint = `http://${modelTestConfig.storageDeploymentName}.${testProjectName}.svc:${port}`;
          const encodedEndpoint = Buffer.from(storageEndpoint).toString('base64');

          // Define template variable replacements for storage YAML
          const storageReplacements = {
            DEPLOYMENT_NAME: modelTestConfig.storageDeploymentName,
            STORAGE_SECRET_NAME: modelTestConfig.storageSecretName,
            STORAGE_ENDPOINT: encodedEndpoint,
          };

          // Replace template variables
          const updatedYamlContent = replacePlaceholdersInYaml(yamlContent, storageReplacements);

          // Apply the storage resources using the utility function
          return applyOpenShiftYaml(updatedYamlContent, testProjectName).then(() =>
            // Check if storage was deployed successfully
            execWithOutput(
              `oc get deployment/${modelTestConfig.storageDeploymentName} -n ${testProjectName}`,
              30, // 30s timeout for status check
            ).then(({ code: storageCode }) => {
              expect(storageCode).to.equal(0);
            }),
          );
        } catch (error) {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          cy.log(`Error during storage deployment setup: ${error}`);
          throw error;
        }
      });
    },
  );

// Function to deploy ServingRuntime if needed
const deployServingRuntimeIfNeeded = (
  servingRuntimeYaml: string,
  testProjectName: string,
): Cypress.Chainable<any> =>
  checkServingRuntimeExists(testProjectName).then((servingRuntimeExists) => {
    if (servingRuntimeExists) {
      cy.log('ServingRuntime already exists, skipping deployment');
      return cy.wrap(undefined);
    }
    cy.log('Applying ServingRuntime');
    return applyOpenShiftYaml(servingRuntimeYaml, testProjectName).then(
      ({ code: servingRuntimeCode }) => {
        // Don't fail if ServingRuntime apply fails - namespace might not be ready yet
        if (servingRuntimeCode !== 0) {
          cy.log(
            `Warning: ServingRuntime apply failed with code ${servingRuntimeCode}, but continuing...`,
          );
        }
      },
    );
  });

// Function to deploy InferenceService if needed
const deployInferenceServiceIfNeeded = (
  inferenceServiceYaml: string,
  modelName: string,
  testProjectName: string,
): Cypress.Chainable<any> =>
  checkInferenceServiceExists(modelName, testProjectName).then((inferenceServiceExists) => {
    if (inferenceServiceExists) {
      cy.log(`InferenceService ${modelName} already exists, skipping deployment`);
      return cy.wrap(undefined);
    }
    cy.log(`Deploying Model '${modelName}' in project '${testProjectName}'`);
    return applyOpenShiftYaml(inferenceServiceYaml, testProjectName).then(
      ({ code: inferenceServiceCode }) => {
        // Don't fail if InferenceService apply fails - namespace might not be ready yet
        if (inferenceServiceCode !== 0) {
          cy.log(
            `Warning: InferenceService apply failed with code ${inferenceServiceCode}, but continuing...`,
          );
        }
      },
    );
  });

// Function to wait for model to be ready
const waitForModelReady = (
  modelName: string,
  testProjectName: string,
  timeoutSeconds: number,
): Cypress.Chainable<any> => {
  cy.log(
    `Waiting for Model '${modelName}' to be ready in project '${testProjectName}' up to ${timeoutSeconds} seconds`,
  );
  return execWithOutput(
    `set +e; RC=0;
  oc wait inferenceservice/${modelName} -n ${testProjectName} --for=condition=Ready=True --timeout=${timeoutSeconds}s || RC=$?;
  oc describe inferenceservice/${modelName} -n ${testProjectName};
  exit $RC`,
    timeoutSeconds + 3,
  ).then(({ code: waitCode }) => {
    // Don't fail if InferenceService wait fails - namespace might not be ready yet
    if (waitCode !== 0) {
      cy.log(
        `Warning: InferenceService ${modelName} wait failed with code ${waitCode}, but continuing...`,
      );
    }
  });
};

export interface ModelTestSetup {
  testProjectName: string;
  modelName: string;
  setupName: string;
  setupTest: () => void;
  cleanupTest: () => void;
}

export interface ModelTestConfig {
  name: string;
  description: string;
  storageYaml: string;
  modelServiceYaml: string;
  modelName: string;
  storageEndpoint?: string; // Optional since it's now constructed automatically
  storageDeploymentName: string;
  storageSecretName: string;
  tokenizerUrl?: string; // Optional tokenizer URL for LM evaluation
  modelTimeoutSeconds?: number; // Optional timeout parameter in seconds
  projectName?: string; // Optional project name, falls back to random if not defined
  lmEval?: {
    numConcurrent: number;
    maxRetries: number;
    lmEvalTimeoutSeconds: number;
    limit: number;
    maxSamples: number;
    numFewshot: number;
    requestInterval: number;
    modelPath: string;
    servicePort: number;
    evaluationName?: string;
    taskName: string;
  };
}

export interface TestConfigFile {
  testSetups: Record<string, ModelTestConfig>;
  defaultSetup: string;
}

export const createModelTestSetup = (modelTestConfig: ModelTestConfig): ModelTestSetup => {
  // Use project name from config if defined, otherwise generate random name
  const testProjectName = modelTestConfig.projectName || `test-project-${generateTestUUID()}`;
  const { modelName } = modelTestConfig;
  // Use the timeout from config or default to 300 if not provided
  const timeoutSeconds = modelTestConfig.modelTimeoutSeconds || 300;

  // Setup function that will be called in beforeEach
  const setupTest = () => {
    cy.log(`Using test setup: ${modelTestConfig.name}`);
    cy.log(`Description: ${modelTestConfig.description}`);
    cy.log(`Model name: ${modelName}`);
    cy.log(`Using timeout: ${timeoutSeconds}`);

    // Check if namespace already exists
    execWithOutput(`oc get namespace ${testProjectName} --no-headers`).then(({ code }) => {
      if (code === 0) {
        cy.log(`Namespace ${testProjectName} already exists, skipping project creation`);
      } else {
        cy.log(`Creating new project: ${testProjectName}`);
        createCleanProject(testProjectName);
      }
    });

    // Deploy storage if needed
    deployStorageIfNeeded(modelTestConfig, testProjectName);

    // Check and deploy ServingRuntime and InferenceService
    cy.fixture(modelTestConfig.modelServiceYaml).then((yamlContent) => {
      // Define template variable replacements for model service YAML
      const modelServiceReplacements = {
        STORAGE_SECRET_NAME: modelTestConfig.storageSecretName,
      };

      // Replace template variables in the model service YAML
      const updatedModelServiceYaml = replacePlaceholdersInYaml(
        yamlContent,
        modelServiceReplacements,
      );

      const servingRuntimeYaml = updatedModelServiceYaml.split('---')[0];
      const inferenceServiceYaml = updatedModelServiceYaml.split('---')[1];

      // Check if both resources already exist
      cy.wrap(null)
        .then(() => checkServingRuntimeExists(testProjectName))
        .then((servingRuntimeExists) =>
          checkInferenceServiceExists(modelName, testProjectName).then(
            (inferenceServiceExists) => ({ servingRuntimeExists, inferenceServiceExists }),
          ),
        )
        .then(({ servingRuntimeExists, inferenceServiceExists }) => {
          cy.log(
            `ServingRuntime exists: ${servingRuntimeExists}, InferenceService exists: ${inferenceServiceExists}`,
          );

          if (servingRuntimeExists && inferenceServiceExists) {
            cy.log(
              `ServingRuntime and InferenceService ${modelName} already exist, skipping deployment`,
            );
            // Still wait for the InferenceService to be ready
            waitForModelReady(modelName, testProjectName, timeoutSeconds);
          } else {
            // Deploy ServingRuntime if needed
            deployServingRuntimeIfNeeded(servingRuntimeYaml, testProjectName);

            // Deploy InferenceService if needed
            deployInferenceServiceIfNeeded(inferenceServiceYaml, modelName, testProjectName);

            // Wait for the InferenceService to be ready
            waitForModelReady(modelName, testProjectName, timeoutSeconds);
          }
        });
    });
  };

  // Cleanup function that will be called in after
  const cleanupTest = () => {
    // Delete InferenceService - modelName is always defined in this context
    execWithOutput(
      `oc delete inferenceservice ${modelName} -n ${testProjectName} --ignore-not-found`,
      60, // 60s timeout for cleanup operations
    ).then(() => {
      cy.log(`Deleted InferenceService ${modelName}`);
    });

    // Delete ServingRuntime
    execWithOutput(
      `oc delete servingruntime -n ${testProjectName} --all --ignore-not-found`,
      60, // 60s timeout for cleanup operations
    ).then(() => {
      cy.log('Deleted all ServingRuntimes');
    });

    // Delete storage deployment using the configured deployment name
    execWithOutput(
      `oc delete deployment ${modelTestConfig.storageDeploymentName} -n ${testProjectName} --ignore-not-found`,
      60, // 60s timeout for cleanup operations
    ).then(() => {
      cy.log(`Deleted storage deployment: ${modelTestConfig.storageDeploymentName}`);
    });

    // Delete storage service using the configured deployment name
    execWithOutput(
      `oc delete service ${modelTestConfig.storageDeploymentName} -n ${testProjectName} --ignore-not-found`,
      60, // 60s timeout for cleanup operations
    ).then(() => {
      cy.log(`Deleted storage service: ${modelTestConfig.storageDeploymentName}`);
    });

    // Delete secrets - use the configured secret name
    execWithOutput(
      `oc delete secret ${modelTestConfig.storageSecretName} -n ${testProjectName} --ignore-not-found`,
      60, // 60s timeout for cleanup operations
    ).then(() => {
      cy.log(`Deleted configured storage secret: ${modelTestConfig.storageSecretName}`);
    });

    // Clean up all created resources and the project itself
    deleteOpenShiftProject(testProjectName, { wait: false, ignoreNotFound: true });
  };

  return {
    testProjectName,
    modelName,
    setupName: modelTestConfig.name,
    setupTest,
    cleanupTest,
  };
};

// Helper function to load test configuration from YAML file
export const loadTestConfig = (
  setupName: string,
  configPath = 'e2e/lmEval/test-config.yaml',
): Cypress.Chainable<ModelTestConfig> =>
  cy.fixture(configPath).then((yamlString: string) => {
    try {
      // Parse the YAML string into an object
      const configFile = yaml.load(yamlString) as TestConfigFile;

      // Validate the config file structure using assertion
      cy.wrap(configFile)
        .should('have.property', 'testSetups')
        .then(() => {
          // Get configuration from the YAML file
          const modelTestConfig = configFile.testSetups[setupName];

          // Validate the model test config using assertion
          cy.wrap(modelTestConfig)
            .should('exist')
            .then(() => {
              // Validate required fields
              cy.wrap(modelTestConfig).should('have.property', 'name');
              cy.wrap(modelTestConfig).should('have.property', 'description');
              cy.wrap(modelTestConfig).should('have.property', 'storageYaml');
              cy.wrap(modelTestConfig).should('have.property', 'modelServiceYaml');
              cy.wrap(modelTestConfig).should('have.property', 'modelName');
              cy.wrap(modelTestConfig).should('have.property', 'storageDeploymentName');
              cy.wrap(modelTestConfig).should('have.property', 'storageSecretName');

              // Return the test config through a Cypress command to avoid async/sync mixing
              return cy.wrap(modelTestConfig);
            });
        });
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      cy.log(`Error parsing YAML config file: ${error}`);
      throw error;
    }
  });
