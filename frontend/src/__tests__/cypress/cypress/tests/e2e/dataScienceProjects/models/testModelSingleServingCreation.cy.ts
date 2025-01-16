import type { DataScienceProjectData } from '~/__tests__/cypress/cypress/types';
import { provisionProjectForPipelines } from '~/__tests__/cypress/cypress/utils/pipelines';
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
  createServingRuntimeModal
} from '~/__tests__/cypress/cypress/pages/modelServing';
import { checkInferenceServiceState } from '~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import { ServingRuntimeModel } from '~/api';

let testData: DataScienceProjectData;
let projectName: string;
let contributor: string;
let modelName: string;
const dspaSecretName = 'dashboard-dspa-secret';
const awsBucket = 'BUCKET_3' as const;

describe('Verify Model Creation and Validation using the UI', () => {
  before(() => {
    Cypress.on('uncaught:exception', (err) => {
      if (err.message.includes('Error: secrets')) { 
        return false;
      }
      return true;
    });
    // Setup: Load test data and ensure clean state
    return loadDSPFixture('e2e/dataScienceProjects/testModelSingleServingCreation.yaml').then(
      (fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = testData.projectSingleModelResourceName;
        contributor = LDAP_CONTRIBUTOR_USER.USERNAME;
        modelName = testData.singleModelName;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        // Create a Project for pipelines
        provisionProjectForPipelines(
          projectName,
          dspaSecretName,
          awsBucket,
          'resources/yaml/data_connection_model_serving.yaml',
        );
        addUserToProject(projectName, contributor, 'edit');
      },
    );
  });
  // after(() => {
  //   // Delete provisioned Project
  //   deleteOpenShiftProject(projectName);
  // });

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

      // Launch a Single Serving Model
      cy.step('Launch a Single Serving Model using Caikit TGIS ServingRuntime for KServe');
      inferenceServiceModal.findModelNameInput().type(testData.singleModelName);
      inferenceServiceModal.findServingRuntimeTemplate().click();
      inferenceServiceModal.findCalkitTGISServingRuntime().click();

      inferenceServiceModal.findLocationPathInput().type('flan-t5-small/flan-t5-small-caikit');
      inferenceServiceModal.findSubmitButton().click();

      //Verify the model created
      cy.step('Verify that the Model is created Successfully');
      //inferenceServiceModal.findCreatedModel(testData.singleModelName).should('be.visible');
      checkInferenceServiceState(testData.singleModelName);

      //cy.findByTestId('status-tooltip').click();
      cy.get('div > .pf-v6-c-icon .pf-v6-svg').click();
      cy.contains('Loaded', { timeout: 120000 }).should('be.visible');
      //modelServingGlobal.findStatusTooltip().click();
      //cy.contains('Loaded', { timeout: 120000 }).should('be.visible');

      // status-tooltip 
    },
  );
});
