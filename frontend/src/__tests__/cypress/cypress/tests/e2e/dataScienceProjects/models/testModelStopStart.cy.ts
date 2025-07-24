import {
  modelServingGlobal,
  modelServingSection,
  inferenceServiceModal,
} from '#~/__tests__/cypress/cypress/pages/modelServing.ts';
import { projectDetails, projectListPage } from '#~/__tests__/cypress/cypress/pages/projects';
import type { DataScienceProjectData } from '#~/__tests__/cypress/cypress/types';
import { loadDSPFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  checkInferenceServiceState,
  provisionProjectForModelServing,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';
import { STOP_MODAL_PREFERENCE_KEY } from '#~/pages/modelServing/useStopModalPreference';

let testData: DataScienceProjectData;
let projectName: string;
let modelName: string;
let modelFilePath: string;
const awsBucket = 'BUCKET_1' as const;
const uuid = generateTestUUID();

describe('[Product Bug: RHOAIENG-30376] A model can be stopped and started', () => {
  retryableBefore(() => {
    cy.log('Loading test data');
    return loadDSPFixture('e2e/dataScienceProjects/testModelStopStart.yaml').then(
      (fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectResourceName}-${uuid}`;
        modelName = testData.singleModelName;
        modelFilePath = testData.modelOpenVinoExamplePath;

        if (!projectName) {
          throw new Error('Project name is undefined or empty in the loaded fixture');
        }
        cy.log(`Loaded project name: ${projectName}`);
        // Create a Project
        provisionProjectForModelServing(
          projectName,
          awsBucket,
          'resources/yaml/data_connection_model_serving.yaml',
        );
      },
    );
  });

  after(() => {
    // Delete provisioned Project - wait for completion due to RHOAIENG-19969 to support test retries, 5 minute timeout
    // TODO: Review this timeout once RHOAIENG-19969 is resolved
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Verify that a model can be stopped and started',
    {
      tags: ['@Smoke', '@SmokeSet3', '@Dashboard', '@Modelserving', '@NonConcurrent', '@Bug'],
    },
    () => {
      cy.log('Model Name:', modelName);
      cy.step(`Log into the application with ${HTPASSWD_CLUSTER_ADMIN_USER.USERNAME}`);
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Project navigation
      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      // Navigate to Model Serving section and Deploy a Model
      cy.step('Navigate to Model Serving and deploy a Model');
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.findSingleServingModelButton().click();
      modelServingGlobal.findDeployModelButton().click();

      // Deploy a Model
      cy.step('Deploy a Model');
      inferenceServiceModal.findModelNameInput().type(testData.singleModelName);
      inferenceServiceModal.findServingRuntimeTemplateSearchSelector().click();
      inferenceServiceModal.findGlobalScopedTemplateOption('OpenVINO Model Server').click();
      inferenceServiceModal.findModelFrameworkSelect().click();
      inferenceServiceModal.findOpenVinoIROpSet13().click();
      inferenceServiceModal.findLocationPathInput().type(modelFilePath);
      inferenceServiceModal.findSubmitButton().click();
      inferenceServiceModal.shouldBeOpen(false);
      modelServingSection.findModelServerDeployedName(testData.singleModelName);
      const kServeRow = modelServingSection.getKServeRow(testData.singleModelName);

      //Verify the model created and is running
      cy.step('Verify that the Model is running');
      checkInferenceServiceState(testData.singleModelName, projectName, {
        checkReady: true,
        checkLatestDeploymentReady: true,
      });

      //Stop the model with the modal
      cy.step('Stop the model');
      //Ensure the modal is shown
      cy.window().then((win) => win.localStorage.setItem(STOP_MODAL_PREFERENCE_KEY, 'false'));

      kServeRow.findStateActionToggle().should('have.text', 'Stop').click();
      kServeRow.findConfirmStopModal().should('exist');
      kServeRow.findConfirmStopModalCheckbox().should('exist');
      kServeRow.findConfirmStopModalCheckbox().should('not.be.checked');
      kServeRow.findConfirmStopModalCheckbox().click();
      kServeRow.findConfirmStopModalCheckbox().should('be.checked');
      kServeRow.findConfirmStopModalButton().click();

      kServeRow
        .findStatusLabel()
        .invoke('text')
        .should('match', /Stopping|Stopped/);

      //Verify the model is stopped
      checkInferenceServiceState(testData.singleModelName, projectName, {
        checkReady: false,
        checkLatestDeploymentReady: false,
        checkStopped: true,
        requireLoadedState: false,
      });
      kServeRow.findStatusLabel('Stopped').should('exist');

      //Restart the model
      cy.step('Restart the model');
      kServeRow.findStateActionToggle().should('have.text', 'Start').click();
      kServeRow.findStatusLabel('Starting').should('exist');

      //Verify the model is running again
      checkInferenceServiceState(testData.singleModelName, projectName, {
        checkReady: true,
        checkLatestDeploymentReady: true,
      });
      kServeRow
        .findStatusLabel()
        .invoke('text')
        .should('match', /Starting|Started/);
    },
  );
});
