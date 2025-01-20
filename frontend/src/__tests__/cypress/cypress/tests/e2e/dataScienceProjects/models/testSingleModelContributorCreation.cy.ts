import type { DataScienceProjectData } from '~/__tests__/cypress/cypress/types';
import {
  addUserToProject,
  deleteOpenShiftProject,
} from '~/__tests__/cypress/cypress/utils/oc_commands/project';
import { loadDSPFixture } from '~/__tests__/cypress/cypress/utils/dataLoader';
import { LDAP_CONTRIBUTOR_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectListPage, projectDetails } from '~/__tests__/cypress/cypress/pages/projects';
import {
  modelServingGlobal,
  inferenceServiceModal,
  modelServingSection,
} from '~/__tests__/cypress/cypress/pages/modelServing';
import {
  checkInferenceServiceState,
  provisionProjectForModelServing,
} from '~/__tests__/cypress/cypress/utils/oc_commands/modelServing';

let testData: DataScienceProjectData;
let projectName: string;
let contributor: string;
let modelName: string;
let modelFilePath: string;
const awsBucket = 'BUCKET_3' as const;

describe('Verify Model Creation and Validation using the UI', () => {
  before(() => {
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
        projectName = testData.projectSingleModelResourceName;
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
    // Delete provisioned Project - 5 min timeout to accomadate increased time to delete a project with a model
    deleteOpenShiftProject(projectName, { timeout: 300000 });
  });

  it(
    'Verify that a Non Admin can Serve and Query a Model using the UI',
    { tags: ['@Smoke', '@SmokeSet2', '@ODS-2552', '@Dashboard'] },
    () => {
      cy.log('Model Name:', modelName);
      // Authentication and navigation
      cy.step(`Log into the application with ${LDAP_CONTRIBUTOR_USER.USERNAME}`);
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      // Project navigation, add user and provide contributor permissions
      cy.step(
        `Navigate to the Project list tab and search for ${testData.projectSingleModelResourceName}`,
      );
      projectListPage.navigate();
      projectListPage.filterProjectByName(testData.projectSingleModelResourceName);
      projectListPage.findProjectLink(testData.projectSingleModelResourceName).click();

      // Navigate to Model Serving tab and Deploy a Single Model
      cy.step('Navigate to Model Serving and click to Deploy a Single Model');
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.findSingleServingModelButton().click();
      modelServingGlobal.findDeployModelButton().click();

      // Launch a Single Serving Model and select the required entries
      cy.step('Launch a Single Serving Model using Caikit TGIS ServingRuntime for KServe');
      inferenceServiceModal.findModelNameInput().type(testData.singleModelName);
      inferenceServiceModal.findServingRuntimeTemplate().click();
      inferenceServiceModal.findCalkitTGISServingRuntime().click();

      inferenceServiceModal.findLocationPathInput().type(modelFilePath);
      inferenceServiceModal.findSubmitButton().click();

      //Verify the model created
      cy.step('Verify that the Model is created Successfully on the backend and frontend');
      checkInferenceServiceState(testData.singleModelName);
      modelServingSection.findModelServerName(testData.singleModelName);
      // Note reload is required as status tooltip was not found due to a stale element
      cy.reload();
      modelServingSection.findStatusTooltip().click({ force: true });
      cy.contains('Loaded', { timeout: 120000 }).should('be.visible');
    },
  );
});
