import type { DataScienceProjectData } from '#~/__tests__/cypress/cypress/types';
import {
  addUserToProject,
  deleteOpenShiftProject,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { loadDSPFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { LDAP_CONTRIBUTOR_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectListPage, projectDetails } from '#~/__tests__/cypress/cypress/pages/projects';
import {
  modelServingGlobal,
  inferenceServiceModal,
  modelServingSection,
} from '#~/__tests__/cypress/cypress/pages/modelServing';
import {
  checkInferenceServiceState,
  provisionProjectForModelServing,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { attemptToClickTooltip } from '#~/__tests__/cypress/cypress/utils/models';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';

let testData: DataScienceProjectData;
let projectName: string;
let contributor: string;
let modelName: string;
let modelFilePath: string;
const awsBucket = 'BUCKET_3' as const;
const uuid = generateTestUUID();

describe('[Product Bug: RHOAIENG-29340] Verify Model Creation and Validation using the UI', () => {
  retryableBefore(() => {
    Cypress.on('uncaught:exception', (err) => {
      if (err.message.includes('Error: secrets "ds-pipeline-config" already exists')) {
        return false;
      }
      return true;
    });
    // Setup: Load test data and ensure clean state
    return loadDSPFixture('e2e/dataScienceProjects/testSingleModelContributorCreation.yaml').then(
      (fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectSingleModelResourceName}-${uuid}`;
        contributor = LDAP_CONTRIBUTOR_USER.USERNAME;
        modelName = testData.singleModelName;
        modelFilePath = testData.modelFilePath;

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
        addUserToProject(projectName, contributor, 'edit');
      },
    );
  });
  after(() => {
    // Delete provisioned Project
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Verify that a Non Admin can Serve and Query a Model using the UI',
    {
      tags: [
        '@Smoke',
        '@SmokeSet3',
        '@ODS-2552',
        '@Dashboard',
        '@Modelserving',
        '@NonConcurrent',
        '@Bug',
      ],
    },
    () => {
      cy.log('Model Name:', modelName);
      // Authentication and navigation
      cy.step(`Log into the application with ${LDAP_CONTRIBUTOR_USER.USERNAME}`);
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      // Project navigation, add user and provide contributor permissions
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
      cy.step('Launch a Single Serving Model using Caikit TGIS ServingRuntime for KServe');
      inferenceServiceModal.findModelNameInput().type(testData.singleModelName);
      inferenceServiceModal.findServingRuntimeTemplateSearchSelector().click();
      inferenceServiceModal
        .findGlobalScopedTemplateOption('Caikit TGIS ServingRuntime for KServe')
        .click();

      inferenceServiceModal.findLocationPathInput().type(modelFilePath);
      inferenceServiceModal.findSubmitButton().click();
      inferenceServiceModal.shouldBeOpen(false);
      modelServingSection.findModelServerName(testData.singleModelName);

      //Verify the model created
      cy.step('Verify that the Model is created Successfully on the backend and frontend');
      checkInferenceServiceState(testData.singleModelName, projectName, {
        checkReady: true,
        checkLatestDeploymentReady: true,
      });
      modelServingSection.findModelServerName(testData.singleModelName);
      // Note reload is required as status tooltip was not found due to a stale element
      cy.reload();
      attemptToClickTooltip();
    },
  );
});
