import type { DataScienceProjectData } from '#~/__tests__/cypress/cypress/types';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { loadDSPFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectListPage, projectDetails } from '#~/__tests__/cypress/cypress/pages/projects';
import {
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
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

describe('[Automation Bug: RHOAIENG-32898] Verify Admin Single Model Creation and Validation using the UI', () => {
  retryableBefore(() =>
    // Setup: Load test data and ensure clean state
    loadDSPFixture('e2e/dataScienceProjects/testSingleModelAdminCreation.yaml').then(
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
    ),
  );
  after(() => {
    // Delete provisioned Project - wait for completion due to RHOAIENG-19969 to support test retries, 5 minute timeout
    // TODO: Review this timeout once RHOAIENG-19969 is resolved
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Verify that an Admin can Serve, Query a Single Model using both the UI and External links',
    {
      tags: [
        '@Smoke',
        '@SmokeSet3',
        '@ODS-2626',
        '@Dashboard',
        '@ModelServing',
        '@NonConcurrent',
        '@Maintain',
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

      // Navigate to Model Serving tab and Deploy a Single Model
      cy.step('Navigate to Model Serving and click to Deploy a Single Model');
      projectDetails.findSectionTab('model-server').click();
      // If we have only one serving model platform, then it is selected by default.
      // So we don't need to click the button.
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      // Launch a Single Serving Model and select the required entries
      cy.step('Launch a Single Serving Model using Openvino');
      // Step 1: Model Source
      modelServingWizard.findModelLocationSelectOption('Existing connection').click();
      modelServingWizard.findLocationPathInput().clear().type(modelFilePath);
      modelServingWizard.findModelTypeSelectOption('Predictive model').click();
      modelServingWizard.findNextButton().click();
      // Step 2: Model Deployment
      modelServingWizard.findModelDeploymentNameInput().clear().type(modelName);
      modelServingWizard.findModelFormatSelectOption('openvino_ir - opset13').click();
      // Only interact with serving runtime template selector if it's not disabled
      // (it may be disabled when only one option is available)
      modelServingWizard.findServingRuntimeTemplateSearchSelector().then(($selector) => {
        if (!$selector.is(':disabled')) {
          cy.wrap($selector).click();
          modelServingWizard
            .findGlobalScopedTemplateOption('OpenVINO Model Server')
            .should('exist')
            .click();
        }
      });
      modelServingWizard.findNextButton().click();
      //Step 3: Advanced Options
      // Enable Model access through an external route
      cy.step('Allow Model to be accessed from an External route without Authentication');
      modelServingWizard.findExternalRouteCheckbox().click();
      modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked');
      modelServingWizard.findServiceAccountByIndex(0).clear().type('secret');
      modelServingWizard.findAddServiceAccountButton().click();
      modelServingWizard.findServiceAccountByIndex(1).clear().type('secret2');
      modelServingWizard.findNextButton().click();
      //Step 4: Review
      modelServingWizard.findSubmitButton().click();
      modelServingSection.findModelServerDeployedName(testData.singleModelAdminName);

      //Verify the model created
      cy.step('Verify that the Model is created Successfully on the backend and frontend');
      // Verify model deployment is ready
      checkInferenceServiceState(testData.singleModelAdminName, projectName, { checkReady: true });
      // Note reload is required as status tooltip was not found due to a stale element
      cy.reload();
      modelServingSection.findModelMetricsLink(testData.singleModelAdminName);
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
