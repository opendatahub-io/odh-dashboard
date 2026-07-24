import { LDAP_ADMIN_USER } from '../../../../utils/e2eUsers';
import { retryableBefore } from '../../../../utils/retryableHooks';
import {
  llmdRoutingSettingsPage,
  llmdRoutingCreatePage,
} from '../../../../pages/llmdRoutingSettings';
import { cleanupLLMInferenceServiceConfig } from '../../../../utils/oc_commands/llmInferenceServiceConfig';
import { projectDetails, projectListPage } from '../../../../pages/projects';
import { modelServingGlobal, modelServingWizard } from '../../../../pages/modelServing';
import { ModelLocationSelectOption, ModelTypeLabel } from '../../../../utils/modelServingConstants';
import { createCleanProject } from '../../../../utils/projectChecker';
import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { loadDSPFixture } from '../../../../utils/dataLoader';
import type { RoutingTestData, DataScienceProjectData } from '../../../../types';

let testData: RoutingTestData;
const uuid = generateTestUUID();
let projectName: string;

describe('LLMD Routing Configurations - Admin Settings', () => {
  retryableBefore(() => {
    return loadDSPFixture(
      'e2e/settings/llmdRoutingConfigurations/testLlmdRoutingConfigurations.yaml',
    )
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData as RoutingTestData;
        projectName = `${testData.projectResourceName}-${uuid}`;
      })
      .then(() => {
        createCleanProject(projectName);
      });
  });

  after(() => {
    cleanupLLMInferenceServiceConfig(testData.routingConfigName);
    cleanupLLMInferenceServiceConfig(`${testData.routingConfigName}-copy`);
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Admin can create, validate, edit, duplicate, delete routing configs and verify wizard visibility',
    {
      tags: ['@Featureflagged', '@Dashboard', '@ModelServing', '@NonConcurrent', '@LLMDServingCI'],
    },
    () => {
      cy.step('Log in as admin');
      cy.visitWithLogin('/?devFeatureFlags=llmdTemplates=true', LDAP_ADMIN_USER);

      cy.step('Navigate to routing configurations settings');
      llmdRoutingSettingsPage.navigate();

      cy.step('Create routing config from UI');
      llmdRoutingSettingsPage.findAddButton().click();
      llmdRoutingCreatePage.findDisplayNameInput().clear().type(testData.routingConfigDisplayName);
      llmdRoutingCreatePage.selectTopologyType('topology-type-workload-single-node');
      llmdRoutingCreatePage.selectConfigSource('Open code editor');
      llmdRoutingCreatePage.findYamlEditor().should('exist');
      cy.fixture(testData.routingConfigFixture).then((yamlContent: string) => {
        llmdRoutingCreatePage.findYamlEditor().find('textarea').clear({ force: true });
        llmdRoutingCreatePage.findYamlEditor().find('textarea').type(yamlContent, {
          parseSpecialCharSequences: false,
          delay: 0,
        });
      });
      llmdRoutingCreatePage.findSubmitButton().should('be.enabled').click();

      cy.step('Validate routing row: exists, enabled, topology type');
      llmdRoutingSettingsPage.findTable().should('exist');
      const row = llmdRoutingSettingsPage.getRow(testData.routingConfigName);
      row.find().should('exist');
      row.findEnabledSwitch().should('exist');

      cy.step('Edit the routing config — change topology type');
      row.findKebabAction('Edit').click();
      llmdRoutingCreatePage.findTopologyTypeSelect().should('not.be.disabled');
      llmdRoutingCreatePage.findSubmitButton().should('be.enabled').click();
      llmdRoutingSettingsPage.findTable().should('exist');
      llmdRoutingSettingsPage.getRow(testData.routingConfigName).find().should('exist');

      cy.step('Duplicate the routing config');
      llmdRoutingSettingsPage
        .getRow(testData.routingConfigName)
        .findKebabAction('Duplicate')
        .click();
      llmdRoutingCreatePage.findSubmitButton().should('be.enabled').click();
      llmdRoutingSettingsPage.findTable().should('exist');
      llmdRoutingSettingsPage.getRow(`${testData.routingConfigName}-copy`).find().should('exist');

      cy.step('Delete the original routing config');
      llmdRoutingSettingsPage.getRow(testData.routingConfigName).findKebabAction('Delete').click();
      llmdRoutingCreatePage.findDeleteDialog().should('exist');
      llmdRoutingCreatePage.confirmDelete();
      llmdRoutingSettingsPage.getRow(testData.routingConfigName).find().should('not.exist');
      llmdRoutingSettingsPage.getRow(`${testData.routingConfigName}-copy`).find().should('exist');

      cy.step('Navigate to project and open deploy wizard');
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      cy.step('Fill model details and advance to deployment step');
      modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
      modelServingWizard.findUrilocationInput().clear().type(testData.modelLocationURI);
      modelServingWizard.findSaveConnectionCheckbox().uncheck();
      modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Select llm-d deployment method');
      modelServingWizard.selectDeploymentMethodByKey(
        testData.deploymentMethod as 'llm-inference-service-llmd',
      );

      cy.step('Verify routing dropdown with default and duplicated config');
      modelServingWizard.findRoutingConfigSelect().should('exist');
      modelServingWizard
        .findRoutingConfigSelect()
        .should('contain.text', testData.defaultRoutingLabel);
      modelServingWizard.findRoutingConfigSelect().click();
      modelServingWizard
        .findRoutingConfigOption(`${testData.routingConfigName}-copy`)
        .should('exist');
    },
  );
});
