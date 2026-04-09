import {
  ModelLocationSelectOption,
  ModelTypeLabel,
  ModelStateLabel,
  // TODO: Uncomment once Facebook model startup bug is resolved.
  // ModelStateToggleLabel,
} from '@odh-dashboard/model-serving/types/form-data';
import type { DataScienceProjectData } from '../../../../types';
import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { loadDSPFixture } from '../../../../utils/dataLoader';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { projectListPage, projectDetails } from '../../../../pages/projects';
import {
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
  modelServingWizardEdit,
  inferenceServiceActions,
} from '../../../../pages/modelServing';
import {
  checkInferenceServiceState,
  provisionProjectForModelServing,
  // TODO: Uncomment once RHOAIENG-56694 is resolved.
  // modelExternalTester,
} from '../../../../utils/oc_commands/modelServing';
import {
  createCleanHardwareProfile,
  cleanupHardwareProfiles,
} from '../../../../utils/oc_commands/hardwareProfiles';
import { retryableBefore } from '../../../../utils/retryableHooks';
// TODO: Uncomment once RHOAIENG-56694 is resolved.
// import { attemptToClickTooltip } from '../../../../utils/models';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { MODEL_STATUS_TIMEOUT } from '../../../../support/timeouts';

// Local copy of the key used by the stop modal preference (avoid restricted import from internal)
const STOP_MODAL_PREFERENCE_KEY = 'odh.dashboard.modelServing.stop.modal.preference';

let testData: DataScienceProjectData;
let projectName: string;
let resourceName: string;
let modelName: string;
let modelURI: string;
let servingRuntime: string;
let hardwareProfileResourceName: string;
const awsBucket = 'BUCKET_1' as const;
const uuid = generateTestUUID();

describe('Verify Admin Single Model Creation and Validation using the UI', () => {
  retryableBefore(() =>
    // Setup: Load test data and ensure clean state
    loadDSPFixture('e2e/dataScienceProjects/testSingleModelAdminCreation.yaml')
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectSingleModelAdminResourceName}-${uuid}`;
        modelName = testData.singleModelAdminName;
        if (
          !testData.legacyModelLocationURI ||
          !testData.legacyServingRuntime ||
          !testData.legacyHardwareProfileName
        ) {
          throw new Error(
            'Legacy fields (legacyModelLocationURI, legacyServingRuntime, legacyHardwareProfileName) are required in the fixture',
          );
        }
        modelURI = testData.legacyModelLocationURI;
        servingRuntime = testData.legacyServingRuntime;
        hardwareProfileResourceName = testData.legacyHardwareProfileName;

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
      })
      .then(() => {
        cy.log(`Load Hardware Profile Name: ${hardwareProfileResourceName}`);
        createCleanHardwareProfile('resources/yaml/llmd-hardware-profile.yaml');
      }),
  );
  after(() => {
    cy.log(`Cleaning up Hardware Profile: ${hardwareProfileResourceName}`);
    cleanupHardwareProfiles(hardwareProfileResourceName);
    // Delete provisioned Project - wait for completion due to RHOAIENG-19969 to support test retries, 5 minute timeout
    // TODO: Review this timeout once RHOAIENG-19969 is resolved
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Verify that an Admin can Serve, Query a Single Model using both the UI and External links, and Stop/Start the Model',
    {
      tags: [
        '@Smoke',
        '@SmokeSet3',
        '@ODS-2626',
        '@Dashboard',
        '@ModelServing',
        '@ModelServingCI',
        '@NonConcurrent',
      ],
    },
    () => {
      cy.log('Model Name:', modelName);
      // Authentication and navigation
      cy.step('Log into the application as admin');
      cy.visitWithLogin('/?devFeatureFlags=vLLMDeploymentOnMaaS=true', HTPASSWD_CLUSTER_ADMIN_USER);

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

      cy.step('Step 1: Model details');
      modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
      modelServingWizard.findUrilocationInput().clear().type(modelURI);
      modelServingWizard.findSaveConnectionCheckbox().should('be.checked');
      modelServingWizard.findSaveConnectionInput().clear().type(`${modelName}-connection`);
      modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
      modelServingWizard.findLegacyModeCheckbox().should('exist').should('not.be.checked');
      modelServingWizard.findLegacyModeCheckbox().check();
      modelServingWizard.findLegacyModeCheckbox().should('be.checked');
      modelServingWizard.findNextButton().click();

      cy.step('Step 2: Model deployment');
      modelServingWizard.findModelDeploymentNameInput().clear().type(modelName);
      modelServingWizard.findResourceNameButton().click();
      modelServingWizard
        .findResourceNameInput()
        .should('be.visible')
        .invoke('val')
        .as('resourceName');
      modelServingWizard.selectPotentiallyDisabledProfile(hardwareProfileResourceName);
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
      modelServingWizard.findGlobalScopedTemplateOption(servingRuntime).should('exist').click();
      modelServingWizard.findNextButton().click();

      cy.step('Step 3: Advanced settings');
      // Enable Model access through an external route
      cy.step('Allow Model to be accessed from an External route without Authentication');
      modelServingWizard.findExternalRouteCheckbox().click();
      modelServingWizard.findTokenAuthenticationCheckbox().click();
      modelServingWizard.findTokenAuthenticationCheckbox().should('not.be.checked');
      modelServingWizard.findNextButton().click();

      cy.step('Step 4: Review');
      modelServingWizard.findSubmitButton().click();
      modelServingSection.findModelServerDeployedName(modelName);

      // TODO: Uncomment once RHOAIENG-56694 is resolved.
      // The model fails to become ready, so readiness checks, external access tests,
      // and stop/start cycle are temporarily skipped.

      // //Verify the model created
      // cy.step('Verify that the Model is created Successfully on the backend and frontend');
      // // Verify model deployment is ready
      // cy.get<string>('@resourceName').then((resourceName) => {
      //   checkInferenceServiceState(resourceName, projectName, { checkReady: true });
      // });
      // // Note reload is required as status tooltip was not found due to a stale element
      // cy.reload();
      // modelServingSection.findModelMetricsLink(modelName);
      // attemptToClickTooltip();

      // //Verify the Model is accessible externally
      // cy.step('Verify the model is accessible externally');
      // modelExternalTester(modelName, projectName).then(({ url, response }) => {
      //   expect(response.status).to.equal(200);
      //
      //   //verify the External URL Matches the Backend
      //   modelServingSection.findInternalExternalServiceButton().click();
      //   modelServingSection.findExternalServicePopoverTable().should('contain', url);
      // });

      // Test stop/start functionality
      const kServeRow = modelServingSection.getKServeRow(modelName);

      //Stop the model with the modal
      cy.step('Stop the model');
      //Ensure the modal is shown
      cy.window().then((win) => win.localStorage.setItem(STOP_MODAL_PREFERENCE_KEY, 'false'));

      // TODO: Uncomment toggle text assertion once RHOAIENG-56694is resolved.
      // kServeRow.findStateActionToggle().should('have.text', ModelStateToggleLabel.STOP).click();
      kServeRow.findStateActionToggle().click();
      kServeRow.findConfirmStopModal().should('exist');
      kServeRow.findConfirmStopModalCheckbox().should('exist');
      kServeRow.findConfirmStopModalCheckbox().should('not.be.checked');
      kServeRow.findConfirmStopModalCheckbox().click();
      kServeRow.findConfirmStopModalCheckbox().should('be.checked');
      kServeRow.findConfirmStopModalButton().click();
      kServeRow
        .findStatusLabel()
        .invoke('text')
        .should('match', new RegExp(`${ModelStateLabel.STOPPING}|${ModelStateLabel.STOPPED}`));

      //Verify the model is stopped
      cy.step('Verify the model is stopped');
      checkInferenceServiceState(resourceName, projectName, {
        checkReady: false,
        checkStopped: true,
        requireLoadedState: false,
      });
      kServeRow.findStatusLabel(ModelStateLabel.STOPPED, MODEL_STATUS_TIMEOUT).should('exist');

      //Restart the model
      cy.step('Restart the model');
      // TODO: Uncomment toggle text assertion once RHOAIENG-56694 is resolved.
      // kServeRow.findStateActionToggle().should('have.text', ModelStateToggleLabel.START).click();
      kServeRow.findStateActionToggle().click();
      kServeRow.findStatusLabel(ModelStateLabel.STARTING, MODEL_STATUS_TIMEOUT).should('exist');

      // TODO: Uncomment once RHOAIENG-56694 is resolved (model never reaches ready/started).
      // //Verify the model is running again
      // cy.step('Verify the model is running again');
      // cy.get<string>('@resourceName').then((resourceName) => {
      //   checkInferenceServiceState(resourceName, projectName, { checkReady: true });
      // });
      // kServeRow
      //   .findStatusLabel()
      //   .invoke('text')
      //   .should('match', new RegExp(`${ModelStateLabel.STARTING}|${ModelStateLabel.STARTED}`));

      // //Verify external access still works after restart
      // cy.step('Verify the model is still accessible externally after restart');
      // modelExternalTester(modelName, projectName).then(({ response }) => {
      //   expect(response.status).to.equal(200);
      // });

      cy.step('Stop the model before editing');
      kServeRow.findStateActionToggle().click();
      cy.get<string>('@resourceName').then((resourceName) => {
        checkInferenceServiceState(resourceName, projectName, {
          checkReady: false,
          checkStopped: true,
          requireLoadedState: false,
        });
      });
      kServeRow.findStatusLabel(ModelStateLabel.STOPPED, MODEL_STATUS_TIMEOUT).should('exist');

      // Verify legacy fields are locked in the edit form
      cy.step('Edit the deployment and verify legacy fields are locked');
      const deploymentRow = modelServingGlobal.getDeploymentRow(modelName);
      deploymentRow.findKebab().click();
      inferenceServiceActions.findEditInferenceServiceAction().click();

      modelServingWizardEdit
        .findModelTypeSelect()
        .should('have.text', ModelTypeLabel.GENERATIVE)
        .should('be.disabled');
      modelServingWizardEdit.findLegacyModeCheckbox().should('be.checked').should('be.disabled');
      modelServingWizardEdit.findCancelButton().click();
      cy.findByRole('button', { name: 'Discard' }).click();
    },
  );
});
