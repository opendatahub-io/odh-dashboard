import { LDAP_ADMIN_USER } from '../../../../utils/e2eUsers';
import { retryableBefore } from '../../../../utils/retryableHooks';
import {
  routingConfigurations,
  llmdRoutingCreatePage,
  deleteRouteModal,
} from '../../../../pages/modelDeploymentSettings/routingConfigurations';
import { cleanupLLMInferenceServiceConfig } from '../../../../utils/oc_commands/llmInferenceServiceConfig';
import { projectDetails, projectListPage } from '../../../../pages/projects';
import { modelServingGlobal, modelServingWizard } from '../../../../pages/modelServing';
import { ModelLocationSelectOption, ModelTypeLabel } from '../../../../utils/modelServingConstants';
import { createCleanProject } from '../../../../utils/projectChecker';
import {
  addUserToProject,
  deleteOpenShiftProject,
  waitForUserProjectAccess,
} from '../../../../utils/oc_commands/project';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { loadDSPFixture } from '../../../../utils/dataLoader';
import type { RoutingTestData, DataScienceProjectData } from '../../../../types';

let testData: RoutingTestData;
const uuid = generateTestUUID();
let projectName: string;
let routingConfigName: string;
// Duplicating a config produces display name "Copy of <name>", whose k8s
// metadata.name (and therefore its row/option testids) is "copy-of-<name>".
let duplicateRoutingConfigName: string;

describe('LLMD Routing Configurations - Admin Settings', () => {
  retryableBefore(() => {
    return loadDSPFixture(
      'e2e/settings/llmdRoutingConfigurations/testLlmdRoutingConfigurations.yaml',
    )
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData as RoutingTestData;
        projectName = `${testData.projectResourceName}-${uuid}`;
        routingConfigName = `${testData.routingConfigName}-${uuid}`;
        duplicateRoutingConfigName = `copy-of-${routingConfigName}`;
      })
      .then(() => {
        createCleanProject(projectName);
      })
      .then(() => {
        // The project is created via oc as a cluster admin; grant the test's
        // login user admin access so it appears in their Projects list (STEP 8).
        addUserToProject(projectName, LDAP_ADMIN_USER.USERNAME, 'admin');
        return waitForUserProjectAccess(projectName, LDAP_ADMIN_USER.USERNAME);
      });
  });

  after(() => {
    cleanupLLMInferenceServiceConfig(routingConfigName);
    cleanupLLMInferenceServiceConfig(duplicateRoutingConfigName);
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Admin can create, validate, edit, duplicate, delete routing configs and verify wizard visibility',
    {
      tags: ['@Featureflagged', '@Dashboard', '@ModelServing', '@LLMDServingCI', '@ModelServingCI'],
    },
    () => {
      cy.step('Log in as admin');
      cy.visitWithLogin('/?devFeatureFlags=llmdTemplates=true', LDAP_ADMIN_USER);

      cy.step('Navigate to routing configurations settings');
      routingConfigurations.navigate();

      cy.step('Create routing config from UI');
      routingConfigurations.findAddButton().click();
      llmdRoutingCreatePage.findDisplayNameInput().clear().type(routingConfigName);
      llmdRoutingCreatePage.selectTopologyType(testData.topologyTypeTestId);
      llmdRoutingCreatePage.selectConfigSource(testData.configSourceEditorKey);
      llmdRoutingCreatePage.findYamlEditor().should('exist');
      cy.fixture(testData.routingConfigFixture).then((yamlContent: string) => {
        // The config field is a Monaco CodeEditor (no textarea); set content via
        // the shared helper, which uploads through the editor's file input.
        llmdRoutingCreatePage.getYamlEditor().setValue(yamlContent);
      });
      llmdRoutingCreatePage.findSubmitButton().should('be.enabled').click();

      cy.step('Validate routing row: exists, enabled, topology type');
      routingConfigurations.findTable().should('exist');
      const row = routingConfigurations.getRow(routingConfigName);
      row.find().should('exist');
      row.findEnabledSwitch().should('exist');
      row.find().should('contain.text', testData.topologyTypeLabel);

      cy.step('Edit the routing config');
      row.findKebabAction('Edit').click();
      llmdRoutingCreatePage.findTopologyTypeSelect().should('not.be.disabled');
      llmdRoutingCreatePage.findSubmitButton().should('be.enabled').click();
      routingConfigurations.findTable().should('exist');
      routingConfigurations.getRow(routingConfigName).find().should('exist');

      cy.step('Duplicate the routing config');
      routingConfigurations.getRow(routingConfigName).findKebabAction('Duplicate').click();
      llmdRoutingCreatePage.findSubmitButton().should('be.enabled').click();
      routingConfigurations.findTable().should('exist');
      routingConfigurations.getRow(duplicateRoutingConfigName).find().should('exist');

      cy.step('Delete the original routing config');
      routingConfigurations.getRow(routingConfigName).findKebabAction('Delete').click();
      // The delete modal gates its danger button on typing the config name to confirm.
      deleteRouteModal.findInput().clear().type(routingConfigName);
      deleteRouteModal.findSubmitButton().should('be.enabled').click();
      routingConfigurations.getRow(routingConfigName).find().should('not.exist');
      routingConfigurations.getRow(duplicateRoutingConfigName).find().should('exist');

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
      modelServingWizard.findRoutingConfigOption(duplicateRoutingConfigName).should('exist');
    },
  );
});
