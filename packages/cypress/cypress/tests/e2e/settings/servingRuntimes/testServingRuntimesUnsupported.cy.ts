import { retryableBefore } from '../../../../utils/retryableHooks';
import { LDAP_ADMIN_USER } from '../../../../utils/e2eUsers';
import { servingRuntimes } from '../../../../pages/servingRuntimes';
import { loadDSPFixture } from '../../../../utils/dataLoader';
import { createCleanProject } from '../../../../utils/projectChecker';
import {
  addUserToProject,
  waitForUserProjectAccess,
  deleteOpenShiftProject,
} from '../../../../utils/oc_commands/project';
import {
  cleanupTemplates,
  renderYamlFileWithReplacements,
  waitForTemplateByServingRuntimeName,
} from '../../../../utils/oc_commands/templates';
import { getFixturePath } from '../../../../utils/fileImportUtils';
import { projectDetails, projectListPage } from '../../../../pages/projects';
import { modelServingGlobal, modelServingWizard } from '../../../../pages/modelServing';
import { ModelLocationSelectOption, ModelTypeLabel } from '../../../../utils/modelServingConstants';
import type { DataScienceProjectData, ServingRuntimeSettingsTestData } from '../../../../types';
import { unsupportedStatusAcceptanceModal } from '../../../../pages/llmAcceleratorConfigs';
import { deleteModal } from '../../../../pages/components/DeleteModal';
import { generateTestUUID } from '../../../../utils/uuidGenerator';

const uuid = generateTestUUID();
let testData: ServingRuntimeSettingsTestData;
let projectName: string;
let modelName: string;
let servingRuntimeDisplayName: string;
let servingRuntimeId: string;
let duplicateservingRuntimeId: string;
let duplicateServingRuntimeDisplayName: string;

const openDeployWizardToDeploymentStep = (modelURI: string) => {
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
};

describe('Serving runtimes: CRUD + wizard visibility', () => {
  retryableBefore(() => {
    cy.log('Loading test data');
    return loadDSPFixture('e2e/settings/servingRuntimes/testServingRuntimesUnsupported.yaml')
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData as ServingRuntimeSettingsTestData;
        projectName = `${testData.projectResourceName}-${uuid}`;
        modelName = `${testData.singleModelName}-${uuid}`;
        servingRuntimeId = `${testData.servingRuntimeId}-${uuid}`;
        servingRuntimeDisplayName = `${testData.servingRuntimeDisplayName}-${uuid}`;
        duplicateservingRuntimeId = `${servingRuntimeId}-copy`;
        duplicateServingRuntimeDisplayName = `Copy of ${servingRuntimeDisplayName}`;
      })
      .then(() => {
        cy.log('Create a project');
        cleanupTemplates(servingRuntimeId);
        cleanupTemplates(duplicateservingRuntimeId);
        createCleanProject(projectName);
      })
      .then(() => {
        cy.log('Granting contributor access to the project');
        addUserToProject(projectName, LDAP_ADMIN_USER.USERNAME, 'admin');
        return waitForUserProjectAccess(projectName, LDAP_ADMIN_USER.USERNAME);
      });
  });

  after(() => {
    cleanupTemplates(servingRuntimeId);
    cleanupTemplates(duplicateservingRuntimeId);
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Admin can import/enable/disable/delete a serving runtime and verify wizard options',
    { tags: ['@Dashboard', '@Smoke', '@SmokeSet3', '@ModelServing', '@ModelServingCI'] },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', LDAP_ADMIN_USER);

      cy.step('Navigate to Serving runtimes and import a custom runtime YAML');
      cy.wrap(servingRuntimes.navigate());
      servingRuntimes.findAddButton().should('exist').and('be.visible').click();

      cy.step('Select API protocol and model type');
      servingRuntimes.findSelectAPIProtocolButton().click();
      servingRuntimes.selectAPIProtocol(testData.apiProtocol);
      servingRuntimes.findSelectModelTypes().click();
      servingRuntimes.findGenerativeAIModelOption().click();

      cy.step('Upload YAML and create serving runtime');
      const yamlPath = getFixturePath(testData.unsupportedServingRuntimeYamlFixturePath);
      renderYamlFileWithReplacements(yamlPath, {
        SERVING_RUNTIME_NAME: servingRuntimeId,
        SERVING_RUNTIME_DISPLAY_NAME: servingRuntimeDisplayName,
      }).then((renderedYaml) => servingRuntimes.getDashboardCodeEditor().setValue(renderedYaml));

      cy.step('Submit the serving runtime');
      servingRuntimes.findSubmitButton().should('be.enabled').click();
      waitForTemplateByServingRuntimeName(servingRuntimeId);

      cy.step('Verify the serving runtime is created');
      const runtimeRow = servingRuntimes.getRowById(servingRuntimeId);
      runtimeRow.find().should('exist');
      runtimeRow.shouldHaveUnsupportedLabel(true);
      runtimeRow.shouldBeEnabled(false);

      cy.step('Duplicate the serving runtime and verify the duplicate');
      runtimeRow.findKebabToggle().click();
      runtimeRow.findDuplicateAction().click();
      servingRuntimes.findSelectAPIProtocolButton().should('have.text', testData.apiProtocol);
      servingRuntimes.findSelectModelTypes().click();
      servingRuntimes.findGenerativeAIModelOption().should('be.checked');
      servingRuntimes.getDashboardCodeEditor().containsText(testData.resourceType);
      servingRuntimes.findSubmitButton().should('be.enabled').click();
      waitForTemplateByServingRuntimeName(duplicateservingRuntimeId);

      cy.step('Verify the duplicate serving runtime is created');
      const duplicateRuntimeRow = servingRuntimes.getRowById(duplicateservingRuntimeId);
      duplicateRuntimeRow.find().should('exist');
      duplicateRuntimeRow.shouldHaveUnsupportedLabel(true);
      duplicateRuntimeRow.shouldBeEnabled(false);

      cy.step('edit the duplicate serving runtime');
      duplicateRuntimeRow.findKebabToggle().click();
      duplicateRuntimeRow.findEditButton().click();
      // update the unsupported serving runtime to supported
      servingRuntimes
        .getDashboardCodeEditor()
        .replaceInEditor(testData.replaceSourceString, testData.replaceTargetString);
      servingRuntimes.findSubmitButton().should('be.enabled').click();
      waitForTemplateByServingRuntimeName(duplicateservingRuntimeId);
      duplicateRuntimeRow.shouldHaveUnsupportedLabel(false);
      duplicateRuntimeRow.shouldBeEnabled(true);

      cy.step('delete the duplicate serving runtime');
      duplicateRuntimeRow.findKebabToggle().click();
      duplicateRuntimeRow.findDeleteButton().click();
      deleteModal.find().should('exist');
      deleteModal.findInput().clear().type(duplicateServingRuntimeDisplayName);
      deleteModal.findSubmitButton().should('be.enabled').click();
      duplicateRuntimeRow.find().should('not.exist');

      cy.step('Verify the original unsupportedserving runtime is hidden in the deploy wizard');
      waitForTemplateByServingRuntimeName(servingRuntimeId);
      runtimeRow.shouldBeEnabled(false);
      openDeployWizardToDeploymentStep(testData.modelLocationURI);
      modelServingWizard.selectDeploymentMethodByKey(testData.deploymentMethod);
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
      modelServingWizard
        .findGlobalScopedTemplateOption(servingRuntimeDisplayName)
        .should('not.exist');

      cy.step('Enable the serving runtime and verify it is visible in the wizard');
      servingRuntimes.visit();
      const runtimeRowAfterVisit = servingRuntimes.getRowById(servingRuntimeId);
      runtimeRowAfterVisit.find().should('exist');
      runtimeRowAfterVisit.findEnabledToggle().click();
      unsupportedStatusAcceptanceModal.shouldBeOpen();
      unsupportedStatusAcceptanceModal.findAcceptButton().should('be.disabled');
      unsupportedStatusAcceptanceModal.findAcceptanceCheckbox().click();
      unsupportedStatusAcceptanceModal.findAcceptButton().click();
      runtimeRowAfterVisit.shouldBeEnabled(true);

      openDeployWizardToDeploymentStep(testData.modelLocationURI);
      modelServingWizard.selectDeploymentMethodByKey(testData.deploymentMethod);
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
      modelServingWizard.findGlobalScopedTemplateOption(servingRuntimeDisplayName).should('exist');
    },
  );
});
