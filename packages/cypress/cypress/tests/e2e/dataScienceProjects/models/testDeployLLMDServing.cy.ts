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
} from '../../../../pages/modelServing';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import type { DataScienceProjectData } from '../../../../types';
import { loadDSPFixture } from '../../../../utils/dataLoader';
import {
  createCleanHardwareProfile,
  cleanupHardwareProfiles,
} from '../../../../utils/oc_commands/hardwareProfiles';
import { patchOpenShiftResource } from '../../../../utils/oc_commands/baseCommands';
import { checkLLMInferenceServiceState } from '../../../../utils/oc_commands/modelServing';

let testData: DataScienceProjectData;
let projectName: string;
let modelName: string;
const uuid = generateTestUUID();
let hardwareProfileResourceName: string;
let hardwareProfileYamlPath: string;
let modelURI: string;
let servingRuntime: string;
let resourceType: string;
let Image: string;
let scaleDown: string;
let scaleUp: string;
let yamlEditorModelName: string;

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
        resourceType = testData.resourceType;
        Image = testData.Image;
        scaleDown = testData.scaleDown;
        scaleUp = testData.scaleUp;
        yamlEditorModelName = testData.yamlEditorModelName;

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
        .as('resourceName');
      modelServingWizard.selectPotentiallyDisabledProfile(hardwareProfileResourceName);

      cy.step('Verify YAML Viewer');
      // Stub clipboard API AFTER page load (window changes on navigation)
      cy.window().then((win) => {
        const copied: string[] = [];
        cy.wrap(copied).as('copiedYAML');
        cy.stub(win.navigator.clipboard, 'writeText').callsFake((text: string) => {
          copied.push(text);
          return Promise.resolve();
        });
      });
      modelServingWizard.findYAMLViewerToggle(YAMLViewerToggleOption.YAML).should('exist').click();
      modelServingWizard.findYAMLEditorEmptyState().should('be.visible');
      modelServingWizard.findYAMLViewerToggle(YAMLViewerToggleOption.FORM).should('exist').click();
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
      modelServingWizard.findGlobalScopedTemplateOption(servingRuntime).should('exist').click();
      modelServingWizard.findYAMLViewerToggle(YAMLViewerToggleOption.YAML).should('exist').click();
      modelServingWizard.findYAMLCodeEditor().waitForReady();
      modelServingWizard.findYAMLCodeEditor().copyToClipboard().click();
      cy.get<string[]>('@copiedYAML')
        .should('have.length.at.least', 1)
        .then((copiedYAML) => {
          expect(copiedYAML).to.have.length.greaterThan(0);
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

      cy.step('Patch the LLM Inference Service to set image to VLLM CPU');
      // Patch the LLM Inference Service to set image to VLLM CPU
      // workaround for model to be deployed without GPUs.
      cy.get<string>('@resourceName').then((resourceName) => {
        patchOpenShiftResource(resourceType, resourceName, Image, projectName);
        // Scale down to 0 and back to 1 to force pod recreation with new CPU image
        patchOpenShiftResource(resourceType, resourceName, scaleDown, projectName);
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(5000); // Wait for pods to terminate
        patchOpenShiftResource(resourceType, resourceName, scaleUp, projectName);
        cy.step('Verify that the Model is ready');
        checkLLMInferenceServiceState(resourceName, projectName, { checkReady: true });
      });

      cy.step('Verify the model Row');
      const llmdRow = modelServingGlobal.getDeploymentRow(modelName);
      llmdRow.findStatusLabel(ModelStateLabel.STARTED).should('exist');
      llmdRow.findServingRuntime().should('have.text', servingRuntime);
      modelServingSection.getKServeRow(modelName).find().findKebabAction('Delete').click();
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
      // If we have only one serving model platform, then it is selected by default.
      // So we don't need to click the button.
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      cy.step('Enter Manual YAML editor Mode');
      modelServingWizard.findYAMLViewerToggle(YAMLViewerToggleOption.YAML).should('exist').click();
      modelServingWizard.findManualEditModeButton().click();
      modelServingWizard.findSwitchToYAMLEditorConfirmButton().click();
      modelServingWizard.findSubmitButton().should('be.disabled');

      cy.step('Load YAML content from fixture and deploy');
      cy.fixture('resources/yaml/yaml_editor_model_serving.yaml', 'utf8').then(
        (yamlContent: string) => {
          const yamlEditor = modelServingWizard.findYAMLCodeEditor();
          yamlEditor.findStartFromScratchButton().click();
          yamlEditor.setValue(yamlContent);
          modelServingWizard.findYAMLCodeEditor().waitForReady();
          modelServingWizard.findSubmitButton().should('be.enabled').click();
          modelName = yamlContent;
        },
      );
      const llmdRow = modelServingGlobal.getDeploymentRow(yamlEditorModelName);
      checkLLMInferenceServiceState(yamlEditorModelName, projectName, { checkReady: true });

      cy.step('Verify the model Row');
      llmdRow.findStatusLabel(ModelStateLabel.STARTED).should('exist');
      modelServingSection.getKServeRow(yamlEditorModelName).find().findKebabAction('Edit').click();
      modelServingWizard.findYAMLEditFallbackAlert().should('exist');
      modelServingWizard.findYAMLCodeEditor().findInput().should('not.be.empty');
      modelServingWizard.findSubmitButton().should('be.enabled').click();
    },
  );
});
