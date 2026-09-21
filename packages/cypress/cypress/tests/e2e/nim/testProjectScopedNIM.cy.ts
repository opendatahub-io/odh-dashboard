import { STOP_MODAL_PREFERENCE_KEY } from '@odh-dashboard/model-serving/concepts/useStopModalPreference';
import type { NIMProjectScopedTestData } from '../../../types';
import {
  ModelLocationSelectOption,
  ModelStateLabel,
  ModelStateToggleLabel,
} from '../../../utils/modelServingConstants';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { projectDetails, projectDetailsSettingsTab } from '../../../pages/projects';
import { clusterStorage } from '../../../pages/clusterStorage';
import {
  deleteModelServingModal,
  inferenceServiceActions,
  modelServingGlobal,
  modelServingSection,
  modelServingWizard,
} from '../../../pages/modelServing';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { retryableBefore } from '../../../utils/retryableHooks';
import { addUserToProject, deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { createCleanProject } from '../../../utils/projectChecker';
import { loadNIMProjectScopedFixture } from '../../../utils/dataLoader';
import { MODEL_STATUS_TIMEOUT } from '../../../support/timeouts';
import {
  checkInferenceServiceState,
  getInferenceServiceServingRuntimeName,
} from '../../../utils/oc_commands/modelServing';
import { createCustomResource } from '../../../utils/oc_commands/customResources';
import { cleanupHardwareProfiles } from '../../../utils/oc_commands/hardwareProfiles';
import { ensureAdminOcSession, hasNvidiaGpus } from '../../../utils/oc_commands/baseCommands';
import {
  curlNIMChatCompletions,
  verifyNIMDeploymentResources,
  waitForNIMAccountValidation,
  waitForNIMDeploymentResourceDeletion,
} from '../../../utils/oc_commands/nimCommands';

const uuid = generateTestUUID();

let testData: NIMProjectScopedTestData;
let projectName: string;
let modelName: string;
let resourceName: string;
let nimPVCName: string;
let nimServingRuntimeName: string;
let hardwareProfileName: string;
let isThereGpus = false;

describe('A user can deploy a project-scoped NIM', () => {
  retryableBefore(() =>
    loadNIMProjectScopedFixture('e2e/nim/testProjectScopedNIM.yaml')
      .then((fixtureData: NIMProjectScopedTestData) => {
        testData = fixtureData;
        projectName = `${testData.projectNamePrefix}-${uuid}`;
        modelName = `${testData.modelNamePrefix}-${uuid}`;
        nimPVCName = `${testData.pvcNamePrefix}-${uuid}`;
        hardwareProfileName = `${testData.hardwareProfileName}-${uuid}`;
      })
      .then(() => {
        cy.step('Use an administrator OC session for cluster setup');
        return ensureAdminOcSession();
      })
      .then(() => {
        cy.step('Determine whether NVIDIA GPUs are allocatable in the cluster');
        return hasNvidiaGpus().then((hasGpus) => {
          isThereGpus = hasGpus;
        });
      })
      .then(() => {
        cy.step('Create the project and grant the odh-admin test user access');
        return createCleanProject(projectName).then(() =>
          addUserToProject(projectName, LDAP_ADMIN_USER.USERNAME, 'admin'),
        );
      })
      .then(() => {
        cy.step('Create the NVIDIA GPU hardware profile');
        return cleanupHardwareProfiles(hardwareProfileName)
          .then(() =>
            createCustomResource(
              Cypress.env('APPLICATIONS_NAMESPACE'),
              testData.hardwareProfileYamlPath,
              hardwareProfileName,
            ),
          )
          .then((result) => {
            if (result.exitCode !== 0) {
              throw new Error(
                `Failed to create NVIDIA GPU hardware profile: ${result.stderr || result.stdout}`,
              );
            }
          });
      }),
  );

  after(() => {
    if (!projectName || !hardwareProfileName) {
      return;
    }

    return ensureAdminOcSession()
      .then(() => cleanupHardwareProfiles(hardwareProfileName))
      .then(() =>
        // Deleting the project also removes the NIM account created during the test.
        deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true, timeout: 300000 }),
      );
  });

  it(
    'Enable NIM from Settings, then deploy a NIM model from the Models tab',
    {
      tags: ['@Dashboard', '@ModelServing', '@NIM', '@NIMServingCI', '@Featureflagged'],
    },
    () => {
      cy.step('Log in as odh-admin and open the project Settings tab');
      cy.visitWithLogin(
        `/projects/${projectName}?section=settings&devFeatureFlags=nimWizard=true`,
        LDAP_ADMIN_USER,
      );

      cy.step('Verify the NIM settings card offers to add a personal API key');
      projectDetailsSettingsTab.findNIMEnableButton().should('be.visible').click();

      cy.step('Enter the NIM API key and submit');
      projectDetailsSettingsTab.findNIMApiKeyModal().should('be.visible');
      projectDetailsSettingsTab
        .findNIMApiKeyInput()
        .clear()
        .type(Cypress.env('NGC_API_KEY'), { log: false });
      projectDetailsSettingsTab.findNIMApiKeySubmitButton().should('be.enabled').click();

      cy.step('Wait for NIM account validation on the project namespace (up to 7 minutes)');
      waitForNIMAccountValidation(projectName);

      cy.step('Verify the key was validated and close the modal');
      projectDetailsSettingsTab.findNIMApiKeyCloseButton().should('be.visible').click();

      cy.step('Verify the card now shows the enabled management actions');
      projectDetailsSettingsTab.findNIMRemoveButton().should('exist');
      projectDetailsSettingsTab.findNIMReplaceKeyButton().should('exist');

      cy.step('Open the deployment wizard from the project Models tab');
      projectDetails.findModelServingTab().click();
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      cy.step('Step 1: Select the NIM model image');
      modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.NIM).click();
      modelServingWizard.nim.findImageSelect().should('be.visible');
      // If we have no GPUs, use smallest NIM to run the test faster
      const nimImageName = isThereGpus
        ? testData.nimImageNameWithGpu
        : testData.nimImageNameWithoutGpu;
      modelServingWizard.nim.selectImage(nimImageName);
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Step 2: Configure the NIM deployment, GPU hardware profile, and cache PVC');
      modelServingWizard.findModelDeploymentNameInput().clear().type(modelName);
      modelServingWizard
        .findModelDeploymentDescriptionInput()
        .clear()
        .type(testData.modelDescription);
      modelServingWizard.findResourceNameButton().click();
      modelServingWizard.getGeneratedResourceName().then((generatedResourceName) => {
        resourceName = generatedResourceName;
      });
      modelServingWizard.selectPotentiallyDisabledProfile(hardwareProfileName, hardwareProfileName);
      modelServingWizard.findHardProfileSelection().should('contain.text', hardwareProfileName);
      modelServingWizard.nim.findStorageModeSelect().should('be.visible');
      modelServingWizard.nim
        .findPVCNameInput()
        .clear()
        .type(nimPVCName)
        .should('have.value', nimPVCName);
      modelServingWizard.nim.setStorageSizeGi(testData.pvcSizeGi);
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Step 3: Enable authenticated access through an external route');
      modelServingWizard.findAuthenticationSection().should('be.visible');
      modelServingWizard.findExternalRouteCheckbox().should('not.be.checked').click();
      modelServingWizard.findTokenAuthenticationCheckbox().should('be.checked');
      modelServingWizard.findServiceAccountNameInput().clear().type(testData.tokenDisplayName);
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Step 4: Review and deploy the NIM model');
      modelServingWizard.findSubmitButton().should('be.enabled').click();
      modelServingSection.findModelServerDeployedName(modelName).should('exist');

      if (isThereGpus) {
        cy.step('Wait for the GPU-backed NIM model to become healthy');
        cy.then(() => checkInferenceServiceState(resourceName, projectName, { checkReady: true }));

        cy.step(
          'Verify an unauthenticated chat-completions request through the external route is rejected',
        );
        cy.then(() =>
          curlNIMChatCompletions(
            resourceName,
            projectName,
            testData.tokenDisplayName,
            testData.nimModelId,
            { authenticate: false },
          ),
        );

        cy.step('Send an authenticated chat-completions request through the external route');
        cy.then(() =>
          curlNIMChatCompletions(
            resourceName,
            projectName,
            testData.tokenDisplayName,
            testData.nimModelId,
          ),
        );
      } else {
        cy.step('Skip readiness and endpoint checks because no allocatable NVIDIA GPUs were found');
      }

      cy.step('Stop the NIM model immediately after deployment checks');
      const kServeRow = modelServingSection.getKServeRow(modelName);
      cy.window().then((win) => win.localStorage.setItem(STOP_MODAL_PREFERENCE_KEY, 'false'));
      kServeRow.findStateActionToggle().should('have.text', ModelStateToggleLabel.STOP).click();
      kServeRow.findConfirmStopModal().should('be.visible');
      kServeRow.findConfirmStopModalCheckbox().should('not.be.checked').click();
      kServeRow.findConfirmStopModalButton().should('be.enabled').click();
      kServeRow
        .findStatusLabel()
        .invoke('text')
        .should('match', new RegExp(`${ModelStateLabel.STOPPING}|${ModelStateLabel.STOPPED}`));
      kServeRow.findStatusLabel(ModelStateLabel.STOPPED, MODEL_STATUS_TIMEOUT).should('exist');

      cy.step(
        'Verify the NIM deployment resources and token-authentication resources in Kubernetes',
      );
      cy.then(() =>
        verifyNIMDeploymentResources(
          resourceName,
          projectName,
          nimPVCName,
          testData.tokenDisplayName,
        ),
      );

      cy.step('Get the project-scoped ServingRuntime name for deletion verification');
      cy.then(() => getInferenceServiceServingRuntimeName(resourceName, projectName)).then(
        (servingRuntimeName) => {
          nimServingRuntimeName = servingRuntimeName;
        },
      );

      cy.step('Verify the NIM cache PVC appears in Cluster storage');
      projectDetails.findClusterStorageTab().click();
      clusterStorage.getClusterStorageRow(nimPVCName).find().should('exist');

      cy.step('Delete the NIM model and verify the associated PVC can also be deleted');
      projectDetails.findModelServingTab().click();
      modelServingSection.getDeploymentRow(modelName).findKebab().click();
      inferenceServiceActions.findDeleteInferenceServiceAction().click();
      deleteModelServingModal
        .findPVCCheckbox()
        .should('be.visible')
        .and('not.be.checked')
        .check()
        .should('be.checked');
      deleteModelServingModal.findInput().clear().type(modelName);
      deleteModelServingModal.findSubmitButton().should('be.enabled').click();

      cy.step('Wait for the InferenceService, ServingRuntime, and cache PVC to be deleted');
      cy.then(() =>
        waitForNIMDeploymentResourceDeletion(
          resourceName,
          nimServingRuntimeName,
          nimPVCName,
          projectName,
        ),
      );
    },
  );
});
