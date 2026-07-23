import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { llmdRoutingSettingsPage } from '../../../../pages/llmdRoutingSettings';
import {
  createCleanLLMInferenceServiceConfig,
  cleanupLLMInferenceServiceConfig,
} from '../../../../utils/oc_commands/llmInferenceServiceConfig';
import { projectDetails, projectListPage } from '../../../../pages/projects';
import { modelServingGlobal, modelServingWizard } from '../../../../pages/modelServing';
import { ModelLocationSelectOption, ModelTypeLabel } from '../../../../utils/modelServingConstants';
import { createCleanProject } from '../../../../utils/projectChecker';
import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { loadDSPFixture } from '../../../../utils/dataLoader';
import type { DataScienceProjectData } from '../../../../types';

type RoutingTestData = DataScienceProjectData & {
  routingConfigName: string;
  routingConfigFixture: string;
};

let testData: RoutingTestData;
const uuid = generateTestUUID();
let projectName: string;

describe('LLMD Routing Configurations - Admin Settings', () => {
  retryableBefore(() => {
    return loadDSPFixture(
      'e2e/settings/llmdRoutingConfigurations/testLlmdRoutingConfigurations.yaml',
    ).then((fixtureData: DataScienceProjectData) => {
      testData = fixtureData as RoutingTestData;
      projectName = `${testData.projectResourceName}-${uuid}`;
      createCleanLLMInferenceServiceConfig(
        testData.routingConfigName,
        testData.routingConfigFixture,
      );
      createCleanProject(projectName);
    });
  });

  after(() => {
    cleanupLLMInferenceServiceConfig(testData.routingConfigName);
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Admin can manage routing configurations and verify wizard visibility',
    { tags: ['@Smoke', '@Dashboard', '@NonConcurrent', '@LLMDServingCI'] },
    () => {
      cy.step('Log in as admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to routing configurations settings');
      llmdRoutingSettingsPage.navigate();
      llmdRoutingSettingsPage.findTable().should('exist');

      cy.step('Verify the test routing config is listed');
      llmdRoutingSettingsPage.getRow(testData.routingConfigName).find().should('exist');

      cy.step('Navigate to project and open deploy wizard');
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      cy.step('Fill model details and advance to deployment step');
      modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
      modelServingWizard.findUrilocationInput().clear().type('hf://facebook/opt-125m');
      modelServingWizard.findSaveConnectionCheckbox().uncheck();
      modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Select llm-d deployment method');
      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      cy.step('Verify routing dropdown is visible with default selected');
      modelServingWizard.findRoutingConfigSelect().should('exist');
      modelServingWizard
        .findRoutingConfigSelect()
        .should('contain.text', 'Default optimized routing');

      cy.step('Open routing dropdown and verify provisioned config appears');
      modelServingWizard.findRoutingConfigSelect().click();
      cy.findByTestId(`routing-config-option-${testData.routingConfigName}`).should('exist');
    },
  );
});
