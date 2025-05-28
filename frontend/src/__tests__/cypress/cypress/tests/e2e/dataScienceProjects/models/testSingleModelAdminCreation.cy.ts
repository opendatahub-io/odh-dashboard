import type { DataScienceProjectData } from '~/__tests__/cypress/cypress/types';
import { deleteOpenShiftProject } from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { loadDSPFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectListPage, projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import {
  modelServingGlobal,
  inferenceServiceModal,
  modelServingSection,
} from '~/__tests__/cypress/cypress/pages/modelServing';
import {
  checkInferenceServiceState,
  provisionProjectForModelServing,
  modelExternalTester,
} from '~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import { retryableBefore } from '~/__tests__/cypress/cypress/utils/retryableHooks';
import { attemptToClickTooltip } from '~/__tests__/cypress/cypress/utils/models';
import { generateTestUUID } from '~/__tests__/cypress/cypress/utils/uuidGenerator';

let testData: DataScienceProjectData;
let projectName: string;
let modelName: string;
let modelFilePath: string;
const awsBucket = 'BUCKET_1' as const;
const uuid = generateTestUUID();

describe('Verify Admin Single Model Creation and Validation using the UI', () => {
  retryableBefore(() => {
    Cypress.on('uncaught:exception', (err) => {
      if (err.message.includes('Error: secrets "ds-pipeline-config" already exists')) {
        return false;
      }
      return true;
    });
    // Setup: Load test data and ensure clean state
    return loadDSPFixture('e2e/dataScienceProjects/testSingleModelAdminCreation.yaml').then(
      (fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectSingleModelAdminResourceName}-${uuid}`;
        modelName = testData.singleModelAdminName;
        modelFilePath = testData.modelOpenVinoPath;

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
    // Delete provisioned Project
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Verify that an Admin can Serve, Query a Single Model using both the UI and External links',
    {
      tags: ['@Smoke', '@SmokeSet3', '@ODS-2626', '@Dashboard', '@Modelserving', '@NonConcurrent'],
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

      // Navigate to Model Serving tab and Deploy a Single Model
      cy.step('Navigate to Model Serving and click to Deploy a Single Model');
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.findSingleServingModelButton().click();
      modelServingGlobal.findDeployModelButton().click();

      // Launch a Single Serving Model and select the required entries
      cy.step('Launch a Single Serving Model using Openvino');
      inferenceServiceModal.findModelNameInput().type(testData.singleModelAdminName);
      inferenceServiceModal.findServingRuntimeTemplate().click();
      inferenceServiceModal.findOpenVinoServingRuntime().click();
      inferenceServiceModal.findModelFrameworkSelect().click();
      inferenceServiceModal.findOpenVinoIROpSet13().click();

      // Enable Model access through an external route
      cy.step('Allow Model to be accessed from an External route without Authentication');
      inferenceServiceModal.findDeployedModelRouteCheckbox().click();
      inferenceServiceModal.findDeployedModelRouteCheckbox().should('be.checked');
      inferenceServiceModal.findTokenAuthenticationCheckbox().click();
      inferenceServiceModal.findTokenAuthenticationCheckbox().should('not.be.checked');
      inferenceServiceModal.findLocationPathInput().type(modelFilePath);
      inferenceServiceModal.findSubmitButton().click();
      modelServingSection.findModelServerName(testData.singleModelAdminName);

      //Verify the model created
      cy.step('Verify that the Model is created Successfully on the backend and frontend');
      checkInferenceServiceState(testData.singleModelAdminName, {
        checkReady: true,
        checkLatestDeploymentReady: true,
      });
      modelServingSection.findModelServerName(testData.singleModelAdminName);
      // Note reload is required as status tooltip was not found due to a stale element
      cy.reload();
      attemptToClickTooltip();

      //Verify the Model is accessible externally
      cy.step('Verify the model is accessible externally');
      modelExternalTester(modelName).then(({ url, response }) => {
        expect(response.status).to.equal(200);

        //verify the External URL Matches the Backend
        modelServingSection.findInternalExternalServiceButton().click();
        modelServingSection.findExternalServicePopoverTable().should('contain', url);
      });
    },
  );
});
