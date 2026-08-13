import {
  deleteOpenShiftProject,
  addUserToProject,
  waitForUserProjectAccess,
} from '../../../../utils/oc_commands/project';
import { LDAP_ADMIN_USER } from '../../../../utils/e2eUsers';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { createCleanProject } from '../../../../utils/projectChecker';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { loadDSPFixture } from '../../../../utils/dataLoader';
import type { AcceleratorTestData, DataScienceProjectData } from '../../../../types';
import {
  cleanupLLMInferenceServiceConfig,
  checkLLMInferenceServiceConfigState,
} from '../../../../utils/oc_commands/llmInferenceServiceConfig';
import {
  llmAcceleratorConfigs,
  unsupportedStatusAcceptanceModal,
} from '../../../../pages/llmAcceleratorConfigs';
import { deleteModal } from '../../../../pages/components/DeleteModal';
import { projectDetails, projectListPage } from '../../../../pages/projects';
import { modelServingGlobal, modelServingWizard } from '../../../../pages/modelServing';
import { ModelLocationSelectOption, ModelTypeLabel } from '../../../../utils/modelServingConstants';
import { getClipboardContent, stubClipboard } from '../../../../utils/clipboardUtils';

let testData: AcceleratorTestData;
let projectName: string;
let modelURI: string;
let deploymentMethod: DataScienceProjectData['deploymentMethod'];
let acceleratorConfigName: string;
let duplicateAcceleratorConfigName: string;
let resourceName: string;
let duplicateResourceName: string;
let modelName: string;
const uuid = generateTestUUID();
const namespace = Cypress.env('APPLICATIONS_NAMESPACE');

describe('Unsupported accelerator configs: CRUD + wizard gating', () => {
  retryableBefore(() => {
    cy.log('Loading test data');
    return loadDSPFixture(
      'e2e/settings/llmAcceleratorConfigs/testLlmAcceleratorConfigsUnsupported.yaml',
    )
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData as AcceleratorTestData;
        projectName = `${testData.projectResourceName}-${uuid}`;
        modelName = `${testData.singleModelAdminName}-${uuid}`;
        modelURI = testData.modelLocationURI;
        deploymentMethod = testData.deploymentMethod;
        acceleratorConfigName = `${testData.acceleratorConfigName}-${uuid}`;
        duplicateAcceleratorConfigName = `${acceleratorConfigName}-dup`;

        // Ensure a clean start if a previous run left a template behind
        cleanupLLMInferenceServiceConfig(acceleratorConfigName);
        cleanupLLMInferenceServiceConfig(duplicateAcceleratorConfigName);
        createCleanProject(projectName);
      })
      .then(() => {
        cy.log('Granting contributor access to the project');
        addUserToProject(projectName, LDAP_ADMIN_USER.USERNAME, 'admin');
        return waitForUserProjectAccess(projectName, LDAP_ADMIN_USER.USERNAME);
      });
  });

  after(() => {
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
    cleanupLLMInferenceServiceConfig(acceleratorConfigName);
    cleanupLLMInferenceServiceConfig(duplicateAcceleratorConfigName);
  });

  const openDeployWizardToDeploymentStep = () => {
    projectListPage.navigate();
    projectListPage.filterProjectByName(projectName);
    projectListPage.findProjectLink(projectName).click();

    projectDetails.findSectionTab('model-server').click();
    modelServingGlobal.selectSingleServingModelButtonIfExists();
    modelServingGlobal.findDeployModelButton().click();

    modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
    modelServingWizard.findUrilocationInput().clear().type(modelURI);
    modelServingWizard.findSaveConnectionCheckbox().uncheck();
    modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
    modelServingWizard.findNextButton().should('be.enabled').click();

    modelServingWizard.findModelDeploymentNameInput().clear().type(modelName);
    modelServingWizard.selectDeploymentMethodByKey(deploymentMethod);
  };

  it(
    'Create accelerator config from UI, duplicate/edit/delete duplicate',
    { tags: ['@Dashboard', '@Featureflagged', '@ModelServing', '@ModelServingCI'] },
    () => {
      cy.step('Log into the application as admin');
      cy.visitWithLogin(
        '/?devFeatureFlags=modelDeploymentSettings=true,vLLMDeploymentOnMaaS=true',
        LDAP_ADMIN_USER,
      );

      cy.step('Create unsupported accelerator config from UI');
      llmAcceleratorConfigs.navigate();
      llmAcceleratorConfigs.findAddButton().should('exist').click();
      llmAcceleratorConfigs.findNameInput().clear().type(acceleratorConfigName);
      llmAcceleratorConfigs.findEditResourceNameLink().click();
      llmAcceleratorConfigs
        .findResourceNameInput()
        .should('be.visible')
        .invoke('val')
        .then((val) => {
          resourceName = val as string;
        });

      llmAcceleratorConfigs.findVersionInput().clear().type(testData.version);
      cy.fixture(testData.unsupportedAcceleratorConfigFixturePath).then((yamlContent) => {
        llmAcceleratorConfigs.findYAMLCodeEditor().findStartFromScratchButton().click();
        llmAcceleratorConfigs.findYAMLCodeEditor().setValue(yamlContent);
      });
      llmAcceleratorConfigs.findSubmitButton().should('be.enabled').click();

      cy.step('Duplicate it and create the duplicate');
      cy.then(() => {
        const acceleratorConfigRow = llmAcceleratorConfigs.getRowByName(resourceName);
        acceleratorConfigRow.find().should('exist');
        acceleratorConfigRow.shouldHaveUnsupportedLabel(true);
        acceleratorConfigRow.shouldBeEnabled(false);
        acceleratorConfigRow.findKebabToggle().click();
        acceleratorConfigRow.findDuplicateAction().click();

        llmAcceleratorConfigs.findNameInput().clear().type(duplicateAcceleratorConfigName);
        llmAcceleratorConfigs.findEditResourceNameLink().click();
        llmAcceleratorConfigs
          .findResourceNameInput()
          .should('be.visible')
          .invoke('val')
          .then((val) => {
            duplicateResourceName = val as string;
          });
        llmAcceleratorConfigs.findVersionInput().should('have.value', testData.version);
        stubClipboard('copiedYAML');
        llmAcceleratorConfigs.findYAMLCodeEditor().copyToClipboard().click();
        getClipboardContent('copiedYAML').then((copied) => {
          expect(copied).to.have.length.at.least(1);
          const yamlContent = copied[0];
          expect(yamlContent).to.include(testData.resourceApiVersion);
          expect(yamlContent).to.include(testData.resourceType);
        });
        llmAcceleratorConfigs.findSubmitButton().should('be.enabled').click();
      });

      cy.step('Edit the duplicate accelerator config: mark accepted and enabled');
      cy.then(() => {
        const dupRow = llmAcceleratorConfigs.getRowByName(duplicateResourceName);
        dupRow.find().should('exist');
        dupRow.shouldHaveUnsupportedLabel(true);
        dupRow.shouldBeEnabled(false);

        checkLLMInferenceServiceConfigState(duplicateResourceName, namespace);

        dupRow.findKebabToggle().click();
        dupRow.findEditButton().click();
        // update the unsupported accelerator config to supported
        llmAcceleratorConfigs
          .findYAMLCodeEditor()
          .replaceInEditor(testData.replaceSourceString, testData.replaceTargetString);
        llmAcceleratorConfigs.findSubmitButton().should('be.enabled').click();
        llmAcceleratorConfigs
          .getRowByName(duplicateResourceName)
          .shouldHaveUnsupportedLabel(false)
          .shouldBeEnabled(true);
      });

      cy.step('Delete the duplicate config');
      cy.then(() => {
        const dupRow = llmAcceleratorConfigs.getRowByName(duplicateResourceName);
        dupRow.findKebabToggle().click();
        dupRow.findDeleteButton().click();
        deleteModal.find().should('exist');
        deleteModal.findInput().clear().type(duplicateAcceleratorConfigName);
        deleteModal.findSubmitButton().should('be.enabled').click();
        llmAcceleratorConfigs.getRowByName(duplicateResourceName).find().should('not.exist');
      });

      cy.step('Verify the LLMInferenceServiceConfig for the original config exists');
      cy.then(() => {
        checkLLMInferenceServiceConfigState(resourceName, namespace);
      });

      cy.step(' Verify the unsupported accelerator config is hidden in the wizard');
      cy.then(() => {
        llmAcceleratorConfigs.getRowByName(resourceName).shouldBeEnabled(false);
      });
      openDeployWizardToDeploymentStep();
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
      modelServingWizard.findGlobalScopedTemplateOption(acceleratorConfigName).should('not.exist');

      cy.step('Enable the accelerator config');
      llmAcceleratorConfigs.visit();
      cy.then(() => {
        llmAcceleratorConfigs.getRowByName(resourceName).findEnabledToggle().click();
      });
      unsupportedStatusAcceptanceModal.shouldBeOpen();
      unsupportedStatusAcceptanceModal.findAcceptButton().should('be.disabled');
      unsupportedStatusAcceptanceModal.findAcceptanceCheckbox().click();
      unsupportedStatusAcceptanceModal.findAcceptButton().click();
      cy.then(() => {
        llmAcceleratorConfigs.getRowByName(resourceName).shouldBeEnabled(true);
      });
      cy.step('Verify the accelerator config is visible in the wizard');
      openDeployWizardToDeploymentStep();
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
      modelServingWizard
        .findGlobalScopedTemplateOption(acceleratorConfigName)
        .should('exist')
        .click();
    },
  );
});
