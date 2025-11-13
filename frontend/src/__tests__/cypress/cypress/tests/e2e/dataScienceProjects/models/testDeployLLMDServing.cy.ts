import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { patchOpenShiftResource } from '#~/__tests__/cypress/cypress/utils/oc_commands/baseCommands';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { projectDetails, projectListPage } from '#~/__tests__/cypress/cypress/pages/projects';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { createCleanProject } from '#~/__tests__/cypress/cypress/utils/projectChecker';
import {
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
} from '#~/__tests__/cypress/cypress/pages/modelServing';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';
import { checkLLMInferenceServiceState } from '#~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import {
  createCleanHardwareProfile,
  cleanupHardwareProfiles,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/hardwareProfiles';
import type { DataScienceProjectData } from '#~/__tests__/cypress/cypress/types';
import { loadDSPFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';

let testData: DataScienceProjectData;
let projectName: string;
let modelName: string;
const uuid = generateTestUUID();
let hardwareProfileResourceName: string;
let hardwareProfileYamlPath: string;
let modelURI: string;

describe('A user can deploy an LLMD model', () => {
  retryableBefore(() => {
    cy.log('Loading test data');
    return loadDSPFixture('e2e/dataScienceProjects/testDeployLLMDServing.yaml')
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectResourceName}-${uuid}`;
        modelName = testData.singleModelName;
        modelURI = testData.modelURI;
        hardwareProfileResourceName = `${testData.hardwareProfileName}`;
        hardwareProfileYamlPath = `resources/yaml/llmd-hardware-profile.yaml`;

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
      cy.step(`Log into the application with ${HTPASSWD_CLUSTER_ADMIN_USER.USERNAME}`);
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

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
      modelServingWizard.findModelLocationSelectOption('URI').click();
      modelServingWizard.findUrilocationInput().clear().type(modelURI);
      modelServingWizard.findSaveConnectionCheckbox().should('be.checked');
      modelServingWizard.findSaveConnectionNameInput().clear().type(`${modelName}-connection`);
      modelServingWizard.findModelTypeSelectOption('Generative AI model (Example, LLM)').click();
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Select Model deployment');
      modelServingWizard.findModelDeploymentNameInput().clear().type(modelName);
      modelServingWizard.selectPotentiallyDisabledProfile(hardwareProfileResourceName);
      // Only interact with serving runtime template selector if it's not disabled
      // (it may be disabled when only one option is available)
      modelServingWizard.findServingRuntimeTemplateSearchSelector().then(($selector) => {
        if (!$selector.is(':disabled')) {
          cy.wrap($selector).click();
          modelServingWizard
            .findGlobalScopedTemplateOption('Distributed Inference Server with llm-d')
            .should('exist')
            .click();
        }
      });
      // Verify replica settings are available for LLMD
      modelServingWizard.findNumReplicasInputField().should('exist').should('have.value', '1');
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Select Advanced settings');
      // LLMD models support token authentication and it is checked by default
      modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked');
      modelServingWizard.findNextButton().click();
      // Step 4: Summary
      modelServingWizard.findSubmitButton().click();

      cy.step('Verify the model is available in UI');
      modelServingSection.findModelServerDeployedName(modelName);

      cy.step('Patch the LLM Inference Service to set image to VLLM CPU');
      // Patch the LLM Inference Service to set image to VLLM CPU
      // workaround for model to be deployed without GPUs.
      patchOpenShiftResource(
        'LLMInferenceService',
        modelName,
        '{"spec":{"template":{"containers":[{"name":"main","image":"quay.io/pierdipi/vllm-cpu:latest"}]}}}',
      );
      cy.step('Verify that the Model is ready');
      checkLLMInferenceServiceState(modelName, projectName, { checkReady: true });

      cy.step('Verify the model Row');
      // Reload the page to verify the model Row is updated.
      cy.reload();
      const llmdRow = modelServingSection.getKServeRow(modelName);

      llmdRow
        .findStatusLabel()
        .invoke('text')
        .should('match', /Starting|Started/);
      // Verify external service is available
      llmdRow.findExternalServiceButton().click();
      llmdRow.findExternalServicePopover().should('exist');
      // Expand row to verify deployment details
      llmdRow.shouldHaveServingRuntime('Distributed Inference Server with llm-d');
    },
  );
});
