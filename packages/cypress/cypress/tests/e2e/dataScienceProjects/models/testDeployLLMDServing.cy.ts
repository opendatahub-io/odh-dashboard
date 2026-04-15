import {
  ModelLocationSelectOption,
  ModelStateLabel,
  ModelTypeLabel,
  YAMLViewerToggleOption,
} from '@odh-dashboard/model-serving/types/form-data';
import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { projectDetails, projectListPage } from '../../../../pages/projects';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { createCleanProject } from '../../../../utils/projectChecker';
import {
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
  deleteModelServingModal,
  inferenceServiceActions,
} from '../../../../pages/modelServing';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import type { DataScienceProjectData } from '../../../../types';
import { loadDSPFixture } from '../../../../utils/dataLoader';
import {
  createCleanHardwareProfile,
  cleanupHardwareProfiles,
} from '../../../../utils/oc_commands/hardwareProfiles';
import { checkLLMInferenceServiceState } from '../../../../utils/oc_commands/modelServing';
import { stubClipboard, getClipboardContent } from '../../../../utils/clipboardUtils';

let testData: DataScienceProjectData;
let projectName: string;
let resourceName: string;
let modelName: string;
const uuid = generateTestUUID();
let hardwareProfileResourceName: string;
let hardwareProfileYamlPath: string;
let modelURI: string;
let servingRuntime: string;
let existingImage: string;
let replaceImage: string;
let yamlEditorModelName: string;
let yamlEditorModelPath: string;

describe('A user can deploy an LLMD model', () => {
  retryableBefore(() => {
    cy.log('Loading test data');
    return loadDSPFixture('e2e/dataScienceProjects/testDeployLLMDServing.yaml')
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectResourceName}-${uuid}`;
        modelName = testData.singleModelName;
        modelURI = testData.modelLocationURI;
        servingRuntime = testData.servingRuntime;
        hardwareProfileResourceName = `${testData.hardwareProfileName}`;
        hardwareProfileYamlPath = `resources/yaml/llmd-hardware-profile.yaml`;
        existingImage = testData.existingImage;
        replaceImage = testData.replaceImage;
        yamlEditorModelName = testData.yamlEditorModelName;
        yamlEditorModelPath = 'cypress/fixtures/resources/yaml/yaml_editor_model_serving.yaml';

        cy.log(`Loaded project name: ${projectName}`);
        createCleanProject(projectName);
      })
      .then(() => {
        // Load Hardware Profile
        cy.log(`Load Hardware Profile Name: ${hardwareProfileResourceName}`);
        // Cleanup Hardware Profile if it already exists
        createCleanHardwareProfile(hardwareProfileYamlPath);
      });
  });

  after(() => {
    // Use the actual hardware profile name from the YAML, not the variable with UUID
    cy.log(`Cleaning up Hardware Profile: ${testData.hardwareProfileName}`);
    // Call cleanupHardwareProfiles with the actual name from the YAML file
    cleanupHardwareProfiles(hardwareProfileResourceName);
    // Delete provisioned Project - wait for completion due to RHOAIENG-19969 to support test retries, 5 minute timeout
    // TODO: Review this timeout once RHOAIENG-19969 is resolved
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Verify User Can Deploy an LLMD Model in Deployments',
    {
      tags: ['@Smoke', '@SmokeSet3', '@Dashboard', '@ModelServing', '@NonConcurrent'],
    },
    () => {
      cy.step('Log into the application as admin');
      cy.visitWithLogin(
        '/?devFeatureFlags=deploymentWizardYAMLViewer=true',
        HTPASSWD_CLUSTER_ADMIN_USER,
      );

      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      cy.step('Deploy LLMD Model');
      projectDetails.findSectionTab('model-server').click();
      // If we have only one serving model platform, then it is selected by default.
      // So we don't need to click the button.
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      cy.step('Select Model details');
      modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
      modelServingWizard.findUrilocationInput().clear().type(modelURI);
      modelServingWizard.findSaveConnectionCheckbox().should('be.checked');
      modelServingWizard
        .findSaveConnectionInput()
        .clear()
        .type(`${modelName}${testData.connectionNameSuffix}`);
      modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Select Model deployment');
      modelServingWizard.findModelDeploymentNameInput().clear().type(modelName);
      modelServingWizard.findResourceNameButton().click();
      modelServingWizard
        .findResourceNameInput()
        .should('be.visible')
        .invoke('val')
        .then((val) => {
          resourceName = val as string;
        });
      modelServingWizard.selectPotentiallyDisabledProfile(hardwareProfileResourceName);

      cy.step('Verify YAML Viewer');
      // Stub clipboard API AFTER page load (window changes on navigation)
      stubClipboard('copiedYAML');
      modelServingWizard.findYAMLViewerToggle(YAMLViewerToggleOption.YAML).should('exist').click();
      modelServingWizard.findYAMLEditorEmptyState().should('be.visible');
      modelServingWizard.findYAMLViewerToggle(YAMLViewerToggleOption.FORM).should('exist').click();
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
      modelServingWizard.findGlobalScopedTemplateOption(servingRuntime).should('exist').click();
      modelServingWizard.findYAMLViewerToggle(YAMLViewerToggleOption.YAML).should('exist').click();
      modelServingWizard.findYAMLCodeEditor().waitForReady();

      cy.step('Patch YAML to use CPU image (workaround for non-GPU cluster)');
      // Add the CPU image to the containers spec so deployment works without GPU
      modelServingWizard.findYAMLCodeEditor().replaceInEditor(existingImage, replaceImage);
      modelServingWizard.findYAMLCodeEditor().copyToClipboard().click();
      // Verify the actual copied YAML content
      getClipboardContent('copiedYAML').then((copied) => {
        expect(copied).to.have.length.at.least(1);
        const yamlContent = copied[0];
        expect(yamlContent).to.include('apiVersion: serving.kserve.io/v1alpha1');
        expect(yamlContent).to.include('kind: LLMInferenceService');
        expect(yamlContent).to.include(`name: ${modelName}`);
        expect(yamlContent).to.include(replaceImage);
      });
      modelServingWizard.findYAMLCodeEditor().download().should('exist').click();
      // Back to Form view
      modelServingWizard.findYAMLViewerToggle(YAMLViewerToggleOption.FORM).should('exist').click();
      // Verify replica settings are available for LLMD
      modelServingWizard.findNumReplicasInputField().should('exist').should('have.value', '1');
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Select Advanced settings');
      // LLMD models support token authentication and it is checked by default
      modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked');
      modelServingWizard.findNextButton().click();

      cy.step('Review');
      modelServingWizard.findSubmitButton().click();

      cy.step('Verify the model is available in UI');
      modelServingSection.findModelServerDeployedName(modelName);

      cy.step('Verify that the Model is ready');
      // Image was patched in YAML editor before submit, so no post-deployment patching needed
      checkLLMInferenceServiceState(resourceName, projectName, { checkReady: true });

      cy.step('Verify the model Row');
      const llmdRow = modelServingGlobal.getDeploymentRow(modelName);
      llmdRow.findStatusLabel(ModelStateLabel.READY).should('exist');
      llmdRow.findServingRuntime().should('have.text', servingRuntime);
      llmdRow.findKebab().click();
      inferenceServiceActions.findDeleteInferenceServiceAction().click();
      deleteModelServingModal.findInput().clear().type(modelName);
      deleteModelServingModal.findSubmitButton().should('be.enabled').click();
    },
  );
  it(
    'Verify User can deploy an LLmd Model from Manual YAML editor',
    {
      tags: ['@Smoke', '@SmokeSet3', '@Dashboard', '@ModelServing', '@NonConcurrent'],
    },
    () => {
      cy.step('Log into the application as admin with YAML viewer feature flag enabled');
      cy.visitWithLogin(
        '/?devFeatureFlags=deploymentWizardYAMLViewer=true',
        HTPASSWD_CLUSTER_ADMIN_USER,
      );

      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      cy.step('Deploy LLMD Model From YAML Editor');
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      cy.step('Enter Manual YAML editor Mode');
      modelServingWizard.findYAMLViewerToggle(YAMLViewerToggleOption.YAML).should('exist').click();
      modelServingWizard.findManualEditModeButton().click();
      modelServingWizard.findSwitchToYAMLEditorConfirmButton().click();
      modelServingWizard.findSubmitButton().should('be.disabled');

      cy.step('Load YAML content from fixture and deploy');
      const yamlEditor = modelServingWizard.findYAMLCodeEditor();
      yamlEditor.findStartFromScratchButton().click();
      yamlEditor.findUpload().selectFile(yamlEditorModelPath, {
        force: true,
      });
      modelServingWizard.findYAMLCodeEditor().waitForReady();
      modelServingWizard.findSubmitButton().should('be.enabled').click();
      const llmdRow = modelServingGlobal.getDeploymentRow(yamlEditorModelName);
      checkLLMInferenceServiceState(yamlEditorModelName, projectName, { checkReady: true });

      cy.step('Verify the model Row');
      llmdRow.findStatusLabel(ModelStateLabel.READY).should('exist');
      llmdRow.findKebab().click();
      inferenceServiceActions.findEditInferenceServiceAction().click();
      modelServingWizard.findYAMLEditFallbackAlert().should('exist');
      modelServingWizard.findYAMLCodeEditor().findInput().should('not.be.empty');
      modelServingWizard.findSubmitButton().should('be.enabled').click();
    },
  );
});
