import type { DataScienceProjectData } from '#~/__tests__/cypress/cypress/types';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { loadDSPFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectDetails } from '#~/__tests__/cypress/cypress/pages/projects';
import {
  modelServingGlobal,
  inferenceServiceModal,
  modelServingSection,
} from '#~/__tests__/cypress/cypress/pages/modelServing';
import {
  provisionProjectForModelServing,
  validateInferenceServiceTolerations,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import {
  cleanupAcceleratorProfiles,
  createCleanAcceleratorProfile,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/acceleratorProfiles';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';

let testData: DataScienceProjectData;
let projectName: string;
let modelName: string;
let modelFilePath: string;
let acceleratorProfileResourceName: string;
const awsBucket = 'BUCKET_3';
const uuid = generateTestUUID();

describe('[E2E] Verify Model Serving Creation using Accelerator Profiles and applying Tolerations', () => {
  // Bug test: RHOAIENG-33131
  retryableBefore(() =>
    // Setup: Load test data and ensure clean state
    loadDSPFixture('e2e/dataScienceProjects/testSingleModelContributorCreation.yaml').then(
      (fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectSingleModelResourceName}-${uuid}`;
        modelName = testData.singleModelName;
        modelFilePath = testData.modelFilePath;
        acceleratorProfileResourceName = `cypress-accelerator-profile-model-${uuid}`;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);

        // Create a Project for model serving
        provisionProjectForModelServing(
          projectName,
          awsBucket,
          'resources/yaml/data_connection_model_serving.yaml',
        );
      },
    ),
  );

  after(() => {
    // Clean up accelerator profile and project
    cleanupAcceleratorProfiles(acceleratorProfileResourceName);
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Verify that a Model can be deployed with Accelerator Profile tolerations',
    {
      tags: [
        '@Smoke',
        '@SmokeSet3',
        '@Dashboard',
        '@ModelServing',
        '@AcceleratorProfiles',
        '@NonConcurrent',
      ],
    },
    () => {
      cy.log('Model Name:', modelName);

      // Create accelerator profile for testing
      cy.step('Create accelerator profile for testing');
      cy.log(`Creating Accelerator Profile: ${acceleratorProfileResourceName}`);
      createCleanAcceleratorProfile('resources/acceleratorProfile/model_tolerations.yaml');

      // Authentication and navigation
      cy.step(`Log into the application with ${HTPASSWD_CLUSTER_ADMIN_USER.USERNAME}`);
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation - direct navigation to avoid project list sync issues
      cy.step(`Navigate directly to project ${projectName}`);
      cy.visit(`/projects/${projectName}?devFeatureFlags=disableHardwareProfiles%3Dtrue`);

      // Navigate to Model Serving tab and Deploy a Single Model
      cy.step('Navigate to Model Serving and click to Deploy a Single Model');
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.findSingleServingModelButton().click();
      modelServingGlobal.findDeployModelButton().click();

      // Launch a Single Serving Model and select the required entries
      cy.step(
        'Launch a Single Serving Model using Caikit TGIS ServingRuntime for KServe and by selecting the Accelerator Profile',
      );
      inferenceServiceModal.findModelNameInput().type(modelName);
      inferenceServiceModal.findServingRuntimeTemplateSearchSelector().click();
      inferenceServiceModal
        .findGlobalScopedTemplateOption('Caikit TGIS ServingRuntime for KServe')
        .click();

      // Select the accelerator profile
      cy.step('Select the accelerator profile with tolerations');
      cy.findByTestId('accelerator-profile-select').click();

      // Select our test accelerator profile
      cy.contains('cypress-accelerator-profile-model').click();

      // Verify the accelerator profile is selected
      cy.findByTestId('accelerator-profile-select').should(
        'contain',
        'cypress-accelerator-profile-model',
      );

      // Set the model file path
      inferenceServiceModal.findLocationPathInput().type(modelFilePath);

      // Submit the form
      inferenceServiceModal.findSubmitButton().should('be.enabled').click();

      inferenceServiceModal.shouldBeOpen(false);
      modelServingSection.findModelServerDeployedName(modelName);

      // Validate that the toleration applied from the accelerator profile displays in the inference service
      cy.step(
        'Validate the Tolerations for the InferenceService include the accelerator profile toleration',
      );
      validateInferenceServiceTolerations(projectName, modelName, {
        key: 'nvidia.com/gpu',
        operator: 'Equal',
        effect: 'NoSchedule',
      }).then(() => {
        cy.log('Accelerator profile toleration displays in the InferenceService as expected');
      });
    },
  );
});
