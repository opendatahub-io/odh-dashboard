import {
  ModelLocationSelectOption,
  ModelStateLabel,
  ModelTypeLabel,
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
import {
  createCleanLLMInferenceServiceConfig,
  cleanupLLMInferenceServiceConfig,
  checkLLMInferenceServiceConfigState,
} from '../../../../utils/oc_commands/llmInferenceServiceConfig';
import { checkLLMInferenceServiceState } from '../../../../utils/oc_commands/modelServing';
import { MODEL_STATUS_TIMEOUT } from '../../../../support/timeouts';

let testData: DataScienceProjectData;
let projectName: string;
let resourceName: string;
let modelName: string;
const uuid = generateTestUUID();
let hardwareProfileResourceName: string;
let modelURI: string;
const llmInferenceServiceConfigName = 'kserve-config-llm-template-cpu';
const llmInferenceServiceConfigDisplayName = 'vLLM CPU LLMInferenceServiceConfig';
const llmInferenceServiceConfigYamlPath =
  'resources/modelServing/llmd-inference-service-config.yaml';

describe('A user can deploy a model via vLLM on MaaS (LLMInferenceServiceConfig)', () => {
  retryableBefore(() => {
    cy.log('Loading test data');
    return loadDSPFixture('e2e/dataScienceProjects/testDeployLLMDServing.yaml')
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectResourceName}-maas-${uuid}`;
        modelName = `${testData.singleModelName}-maas`;
        modelURI = testData.modelLocationURI;
        hardwareProfileResourceName = `${testData.hardwareProfileName}`;

        cy.log(`Loaded project name: ${projectName}`);
        createCleanProject(projectName);
      })
      .then(() => {
        cy.log(`Load Hardware Profile Name: ${hardwareProfileResourceName}`);
        createCleanHardwareProfile('resources/yaml/llmd-hardware-profile.yaml');
      })
      .then(() => {
        cy.log(`Load LLMInferenceServiceConfig: ${llmInferenceServiceConfigName}`);
        createCleanLLMInferenceServiceConfig(
          llmInferenceServiceConfigName,
          llmInferenceServiceConfigYamlPath,
        );
      });
  });

  after(() => {
    cy.log(`Cleaning up Hardware Profile: ${hardwareProfileResourceName}`);
    cleanupHardwareProfiles(hardwareProfileResourceName);
    cy.log(`Cleaning up LLMInferenceServiceConfig: ${llmInferenceServiceConfigName}`);
    cleanupLLMInferenceServiceConfig(llmInferenceServiceConfigName);
    // Delete provisioned Project - wait for completion due to RHOAIENG-19969 to support test retries, 5 minute timeout
    // TODO: Review this timeout once RHOAIENG-19969 is resolved
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Verify User can deploy a model by selecting an LLMInferenceServiceConfig',
    {
      tags: ['@Smoke', '@SmokeSet3', '@Dashboard', '@ModelServing', '@NonConcurrent'],
    },
    () => {
      cy.step('Log into the application as admin');
      cy.visitWithLogin('/?devFeatureFlags=vLLMDeploymentOnMaaS=true', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step(`Navigate to the Project list tab and search for ${projectName}`);
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      cy.step('Open the deploy model wizard');
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      cy.step('Step 1: Model details - select Generative type');
      modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
      modelServingWizard.findUrilocationInput().clear().type(modelURI);
      modelServingWizard.findSaveConnectionCheckbox().should('be.checked');
      modelServingWizard
        .findSaveConnectionInput()
        .clear()
        .type(`${modelName}${testData.connectionNameSuffix}`);
      modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();

      cy.step('Verify legacy checkbox is unchecked (non-legacy MaaS path)');
      modelServingWizard.findLegacyModeCheckbox().should('exist').should('not.be.checked');
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Step 2: Model deployment - select vLLM CPU LLMInferenceServiceConfig');
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
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
      modelServingWizard
        .findGlobalScopedTemplateOption(llmInferenceServiceConfigDisplayName)
        .should('exist')
        .click();
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Step 3: Advanced settings');
      modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked');
      modelServingWizard.findNextButton().click();

      cy.step('Step 4: Review and submit');
      modelServingWizard.findSubmitButton().click();

      cy.step('Verify the model is available in UI');
      modelServingSection.findModelServerDeployedName(modelName);

      cy.step('Verify LLMInferenceService exists in the project namespace');
      cy.then(() => {
        checkLLMInferenceServiceState(resourceName, projectName, { checkReady: true });
      });

      cy.step('Verify LLMInferenceServiceConfig was copied to the project namespace');
      cy.then(() => {
        checkLLMInferenceServiceConfigState(resourceName, projectName, {
          containerImage: 'quay.io/pierdipi/vllm-cpu:latest',
        });
      });

      cy.step('Stop the model before deleting');
      const kServeRow = modelServingSection.getKServeRow(modelName);
      kServeRow.findStateActionToggle().click();
      kServeRow.findConfirmStopModal().then(($modal) => {
        if ($modal.length) {
          kServeRow.findConfirmStopModalButton().click();
        }
      });
      cy.then(() => {
        checkLLMInferenceServiceState(resourceName, projectName, {
          checkReady: false,
          checkStopped: true,
          requireLoadedState: false,
        });
      });
      kServeRow.findStatusLabel(ModelStateLabel.STOPPED, MODEL_STATUS_TIMEOUT).should('exist');

      cy.step('Delete the deployed model');
      const deploymentRow = modelServingGlobal.getDeploymentRow(modelName);
      deploymentRow.findKebab().click();
      inferenceServiceActions.findDeleteInferenceServiceAction().click();
      deleteModelServingModal.findInput().clear().type(modelName);
      deleteModelServingModal.findSubmitButton().should('be.enabled').click();
    },
  );
});
