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
  modelServingSection,
  modelServingWizard,
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

describe('Verify Model Creation and Validation using the UI', () => {
  retryableBefore(() =>
    // Setup: Load test data and ensure clean state
    loadDSPFixture('e2e/dataScienceProjects/testSingleModelContributorCreation.yaml').then(
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
    ),
  );
  after(() => {
    // Delete provisioned Project - wait for completion due to RHOAIENG-19969 to support test retries, 5 minute timeout
    // TODO: Review this timeout once RHOAIENG-19969 is resolved
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Verify that a Non Admin can Serve and Query a Model using the UI',
    {
      tags: ['@Smoke', '@SmokeSet3', '@ODS-2552', '@Dashboard', '@ModelServing', '@NonConcurrent'],
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
      // If we have only one serving model platform, then it is selected by default.
      // So we don't need to click the button.
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      // Launch a Single Serving Model and select the required entries
      cy.step('Launch a Single Serving Model using Generative AI model (Example, LLM)');
      // Step 1: Model Source
      modelServingWizard.findModelLocationSelectOption('Existing connection').click();
      modelServingWizard.findLocationPathInput().clear().type(modelFilePath);
      modelServingWizard.findModelTypeSelectOption('Generative AI model (Example, LLM)').click();
      modelServingWizard.findNextButton().click();
      // Step 2: Model Deployment
      modelServingWizard.findModelDeploymentNameInput().clear().type(modelName);
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
      modelServingWizard
        .findGlobalScopedTemplateOption('vLLM Intel Gaudi Accelerator ServingRuntime for KServe')
        .should('exist')
        .click();
      modelServingWizard.findNextButton().click();
      //Step 3: Advanced Options
      modelServingWizard.findSubmitButton().click();
      modelServingSection.findModelServerDeployedName(testData.singleModelName);

      //Verify the model created
      cy.step('Verify that the Model is created Successfully on the backend and frontend');
      // For KServe Raw deployments, we only need to check Ready condition
      // LatestDeploymentReady is specific to Serverless deployments
      checkInferenceServiceState(
        testData.singleModelName,
        projectName,
        {
          checkReady: true,
        },
        'RawDeployment',
      );
      cy.reload();
      modelServingSection.findModelMetricsLink(testData.singleModelName);
      // Note reload is required as status tooltip was not found due to a stale element
      attemptToClickTooltip();
    },
  );
});
