import type { DataScienceProjectData } from '#~/__tests__/cypress/cypress/types';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { loadDSPFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectDetails, projectListPage } from '#~/__tests__/cypress/cypress/pages/projects';
import {
  modelServingGlobal,
  inferenceServiceModal,
  modelServingSection,
  createServingRuntimeModal,
} from '#~/__tests__/cypress/cypress/pages/modelServing';
import {
  checkInferenceServiceState,
  provisionProjectForModelServing,
  modelExternalTester,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { attemptToClickTooltip } from '#~/__tests__/cypress/cypress/utils/models';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';

let testData: DataScienceProjectData;
let projectName: string;
let modelName: string;
let modelFilePath: string;
const awsBucket = 'BUCKET_1' as const;
const uuid = generateTestUUID();

describe('Verify Admin Multi Model Creation and Validation using the UI', () => {
  retryableBefore(() => {
    Cypress.on('uncaught:exception', (err) => {
      if (err.message.includes('Error: secrets "ds-pipeline-config" already exists')) {
        return false;
      }
      return true;
    });
    // Setup: Load test data and ensure clean state
    return loadDSPFixture('e2e/dataScienceProjects/testMultiModelAdminCreation.yaml').then(
      (fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectMultiModelAdminResourceName}-${uuid}`;
        modelName = testData.multiModelAdminName;
        modelFilePath = testData.modelOpenVinoExamplePath;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        // Create a Project for pipelines
        provisionProjectForModelServing(
          projectName,
          awsBucket,
          'resources/yaml/data_connection_model_serving.yaml',
        );
      },
    );
  });
  after(() => {
    // Delete provisioned Project- set to True due to RHOAIENG-19969
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true });
  });

  it(
    'Verify that an Admin can Serve, Query a Multi Model using both the UI and External links',
    {
      tags: [
        '@Smoke',
        '@SmokeSet3',
        '@ODS-2053',
        '@ODS-2054',
        '@Dashboard',
        '@Modelserving',
        '@NonConcurrent',
      ],
    },
    () => {
      cy.log('Model Name:', modelName);
      // Authentication and navigation
      cy.step(`Log into the application with ${HTPASSWD_CLUSTER_ADMIN_USER.USERNAME}`);
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation
      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      // Navigate to Model Serving tab and Deploy a Multi Model
      cy.step('Navigate to Model Serving and click to Deploy a Model Server');
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.findMultiModelButton().click();
      modelServingSection.findAddModelServerButton().click();
      createServingRuntimeModal.findModelServerName().type(testData.multiModelAdminName);
      // Select the OpenVino serving runtime template
      createServingRuntimeModal.findServingRuntimeTemplateSearchSelector().click();
      createServingRuntimeModal.findGlobalScopedTemplateOption('OpenVINO Model Server').click();

      // Click the deployed model route checkbox and confirm it's checked
      cy.step('Allow Model to be accessed from an External route without Authentication');
      createServingRuntimeModal.findDeployedModelRouteCheckbox().click();
      createServingRuntimeModal.findDeployedModelRouteCheckbox().should('be.checked');
      // Uncheck the token authentication checkbox and confirm it's unchecked
      createServingRuntimeModal.findTokenAuthenticationCheckbox().click();
      createServingRuntimeModal.findTokenAuthenticationCheckbox().should('not.be.checked');
      createServingRuntimeModal.findSubmitButton().click();

      // Verify the Model Server was created successfully
      cy.step('Verify the Model Server created Successfully');
      const modelMeshRow = modelServingSection.getModelMeshRow(testData.multiModelAdminName);
      modelMeshRow.findDeployModelButton().click();

      // Launch a Multi Model and select the required entries
      cy.step('Launch a Multi Model using Openvino IR');
      inferenceServiceModal.findModelNameInput().type(testData.multiModelAdminName);
      inferenceServiceModal.findModelFrameworkSelect().click();
      inferenceServiceModal.findOpenVinoIROpSet1().click();
      inferenceServiceModal.findLocationPathInput().type(modelFilePath);
      inferenceServiceModal.findSubmitButton().click();
      inferenceServiceModal.shouldBeOpen(false);

      //Verify the Model was created successfully
      cy.step('Verify that the Model is created Successfully on the backend and frontend');
      checkInferenceServiceState(testData.multiModelAdminName, projectName);
      // Check only LatestDeploymentReady
      checkInferenceServiceState(testData.multiModelAdminName, projectName, {
        checkReady: true,
        checkLatestDeploymentReady: false,
      });
      // Usually it takes a little longer to load the status tooltip, so it's faster to Reload the page
      cy.reload();
      modelMeshRow.findDeployedModelExpansionButton().click();
      // Click the status tooltip
      attemptToClickTooltip();

      //Verify the Model is accessible externally
      cy.step('Verify the model is accessible externally');
      modelExternalTester(modelName, projectName).then(({ url, response }) => {
        expect(response.status).to.equal(200);

        //verify the External URL Matches the Backend
        modelServingSection.findInternalExternalServiceButton().click();
        modelServingSection.findExternalServicePopoverTable().should('contain', url);
      });
    },
  );
});
