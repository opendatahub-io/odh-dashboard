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
): Cypress.Chainable<boolean> => {
  return execWithOutput(
    `oc get ${resourceType} ${resourceName} -n ${namespace} --no-headers`,
    30,
  ).then(({ code, stdout }) => {
    const exists = code === 0 && stdout.trim() !== '';
    cy.log(
      `Resource ${resourceType}/${resourceName} exists check: code=${code}, stdout='${stdout.trim()}', exists=${exists}`,
    );
    return cy.wrap(exists);
  });
};

const checkInferenceServiceExists = (
  modelName: string,
  namespace: string,
): Cypress.Chainable<boolean> => {
  return checkResourceExists('inferenceservice', modelName, namespace).then((exists) => {
    cy.log(`InferenceService ${modelName} exists check result: ${exists}`);
    return cy.wrap(exists);
  });
};

const checkServingRuntimeExists = (namespace: string): Cypress.Chainable<boolean> => {
  return execWithOutput(`oc get servingruntime -n ${namespace} --no-headers | wc -l`, 30).then(
    ({ code, stdout }) => {
      const exists = code === 0 && parseInt(stdout.trim()) > 0;
      cy.log(`ServingRuntime exists check result: ${exists} (count: ${stdout.trim()})`);
      return cy.wrap(exists);
    },
  );
};

const checkStorageDeploymentExists = (
  deploymentName: string,
  namespace: string,
): Cypress.Chainable<boolean> => {
  return checkResourceExists('deployment', deploymentName, namespace);
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

    // Check and deploy storage resources
    cy.log(`Checking storage resources from ${modelTestConfig.storageYaml}`);
    checkStorageDeploymentExists(modelTestConfig.storageDeploymentName, testProjectName).then(
      (storageExists) => {
        if (storageExists) {
          cy.log(
            `Storage deployment ${modelTestConfig.storageDeploymentName} already exists, skipping storage deployment`,
          );
        } else {
          cy.log(`Deploying storage resources from ${modelTestConfig.storageYaml}`);
          cy.fixture(modelTestConfig.storageYaml).then((yamlContent) => {
            // Extract port from YAML content (default to 9000 if not found)
            const portMatch = yamlContent.match(/port:\s*(\d+)/);
            const port = portMatch ? portMatch[1] : '9000';

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

            // Log the endpoint for debugging
            cy.log(`Using storage endpoint: ${storageEndpoint} (encoded: ${encodedEndpoint})`);
            cy.log(`Using deployment name: ${modelTestConfig.storageDeploymentName}`);
            cy.log(`Using secret name: ${modelTestConfig.storageSecretName}`);
            cy.log(`Using port: ${port}`);

            // Apply the storage resources using the utility function
            applyOpenShiftYaml(updatedYamlContent, testProjectName).then(() => {
              // Debug: Check if storage was deployed successfully
              execWithOutput(
                `oc get deployment/${modelTestConfig.storageDeploymentName} -n ${testProjectName}`,
                30, // 30s timeout for status check
              ).then(({ code: storageCode, stdout: storageStdout, stderr: storageStderr }) => {
                cy.log('Storage deployment status:', `${storageStdout}\n${storageStderr}`);
                expect(storageCode).to.equal(0);
              });
            });
          });
        }
      },
    );

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

      // Check if ServingRuntime and InferenceService already exist
      cy.wrap(null)
        .then(() => {
          return checkServingRuntimeExists(testProjectName);
        })
        .then((servingRuntimeExists) => {
          return checkInferenceServiceExists(modelName, testProjectName).then(
            (inferenceServiceExists) => {
              return { servingRuntimeExists, inferenceServiceExists };
            },
          );
        })
        .then(({ servingRuntimeExists, inferenceServiceExists }) => {
          cy.log(
            `ServingRuntime exists: ${servingRuntimeExists}, InferenceService exists: ${inferenceServiceExists}`,
          );

          if (servingRuntimeExists && inferenceServiceExists) {
            cy.log(
              `ServingRuntime and InferenceService ${modelName} already exist, skipping deployment`,
            );

            // Still wait for the InferenceService to be ready
            execWithOutput(
              `set +e; RC=0;
            oc wait inferenceservice/${modelName} -n ${testProjectName} --for=condition=Ready=True --timeout=${timeoutSeconds}s || RC=$?;
            oc describe inferenceservice/${modelName} -n ${testProjectName};
            exit $RC`,
              timeoutSeconds + 3,
            ).then(({ code: waitCode, stdout: waitStdout, stderr: waitStderr }) => {
              cy.log(`InferenceService wait and describe result: ${waitStdout}\n${waitStderr}`);
              // Don't fail if InferenceService wait fails - namespace might not be ready yet
              if (waitCode !== 0) {
                cy.log(
                  `Warning: InferenceService ${modelName} wait failed with code ${waitCode}, but continuing...`,
                );
              }
            });
          } else {
            // Apply the ServingRuntime if it doesn't exist
            if (!servingRuntimeExists) {
              cy.log('Applying ServingRuntime');
              applyOpenShiftYaml(servingRuntimeYaml, testProjectName).then(
                ({
                  code: servingRuntimeCode,
                  stdout: servingRuntimeStdout,
                  stderr: servingRuntimeStderr,
                }) => {
                  cy.log(
                    `ServingRuntime apply result: ${servingRuntimeStdout}\n${servingRuntimeStderr}`,
                  );

                  // Don't fail if ServingRuntime apply fails - namespace might not be ready yet
                  if (servingRuntimeCode !== 0) {
                    cy.log(
                      `Warning: ServingRuntime apply failed with code ${servingRuntimeCode}, but continuing...`,
                    );
                    cy.log(
                      `ServingRuntime apply result: ${servingRuntimeStdout}\n${servingRuntimeStderr}`,
                    );
                  }
                },
              );
            }

            // Apply the InferenceService if it doesn't exist
            if (!inferenceServiceExists) {
              cy.log('Applying InferenceService');
              applyOpenShiftYaml(inferenceServiceYaml, testProjectName).then(
                ({
                  code: inferenceServiceCode,
                  stdout: inferenceServiceStdout,
                  stderr: inferenceServiceStderr,
                }) => {
                  cy.log(
                    `InferenceService apply result: ${inferenceServiceStdout}\n${inferenceServiceStderr}`,
                  );

                  // Don't fail if InferenceService apply fails - namespace might not be ready yet
                  if (inferenceServiceCode !== 0) {
                    cy.log(
                      `Warning: InferenceService apply failed with code ${inferenceServiceCode}, but continuing...`,
                    );
                    cy.log(
                      `InferenceService apply result: ${inferenceServiceStdout}\n${inferenceServiceStderr}`,
                    );
                  }
                },
              );
            }

            // Wait for the InferenceService to be ready - use dynamic timeout
            execWithOutput(
              `set +e; RC=0;
            oc wait inferenceservice/${modelName} -n ${testProjectName} --for=condition=Ready=True --timeout=${timeoutSeconds}s || RC=$?;
            oc describe inferenceservice/${modelName} -n ${testProjectName};
            exit $RC`,
              timeoutSeconds + 3,
            ).then(({ code: waitCode, stdout: waitStdout, stderr: waitStderr }) => {
              cy.log(`InferenceService wait and describe result: ${waitStdout}\n${waitStderr}`);
              // Don't fail if InferenceService wait fails - namespace might not be ready yet
              if (waitCode !== 0) {
                cy.log(
                  `Warning: InferenceService ${modelName} wait failed with code ${waitCode}, but continuing...`,
                );
              }
            });
          }
        });
    });
  };

  // Cleanup function that will be called in after
  const cleanupTest = () => {
    // We have the model name from the test config, so we can proceed directly with cleanup
    performCleanup(modelName);
  };

  // Helper function to perform the actual cleanup
  const performCleanup = (modelNameToClean: string) => {
    // Delete InferenceService - modelName is always defined in this context
    execWithOutput(
      `oc delete inferenceservice ${modelNameToClean} -n ${testProjectName} --ignore-not-found`,
      60, // 60s timeout for cleanup operations
    ).then(() => {
      cy.log(`Deleted InferenceService ${modelNameToClean}`);
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
    cy.log('Loaded test config file as string');

    // Parse the YAML string into an object
    const configFile = yaml.load(yamlString) as TestConfigFile;
    cy.log('Parsed config file structure:', JSON.stringify(configFile, null, 2));

    // Validate the config file structure using assertion
    cy.wrap(configFile)
      .should('have.property', 'testSetups')
      .then(() => {
        cy.log(`Looking for setup: ${setupName}`);
        cy.log(`Available setups: ${Object.keys(configFile.testSetups).join(', ')}`);

        // Get configuration from the YAML file
        const modelTestConfig = configFile.testSetups[setupName];

        // Validate the model test config using assertion
        cy.wrap(modelTestConfig)
          .should('exist')
          .then(() => {
            cy.log(`Found test config: ${modelTestConfig.name}`);

            // Return the test config through a Cypress command to avoid async/sync mixing
            return cy.wrap(modelTestConfig);
          });
      });
  });
