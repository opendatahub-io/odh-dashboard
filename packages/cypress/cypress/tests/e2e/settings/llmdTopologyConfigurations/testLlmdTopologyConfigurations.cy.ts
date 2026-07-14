import { LDAP_ADMIN_USER } from '../../../../utils/e2eUsers';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { llmdTopologySettingsPage } from '../../../../pages/llmdTopologySettings';
import { cleanupLLMInferenceServiceConfig } from '../../../../utils/oc_commands/llmInferenceServiceConfig';
import { projectListPage } from '../../../../pages/projects';
import { modelServingGlobal, modelServingWizard } from '../../../../pages/modelServing';
import { ModelLocationSelectOption, ModelTypeLabel } from '../../../../utils/modelServingConstants';
import { createCleanProject } from '../../../../utils/projectChecker';
import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { loadDSPFixture } from '../../../../utils/dataLoader';
import type { DataScienceProjectData } from '../../../../types';

type TopologyTestData = DataScienceProjectData & {
  topologyConfigName: string;
  topologyConfigDisplayName: string;
};

let testData: TopologyTestData;
const uuid = generateTestUUID();
let projectName: string;

describe('LLMD Topology Configurations - Admin Settings', () => {
  retryableBefore(() => {
    return loadDSPFixture(
      'e2e/settings/llmdTopologyConfigurations/testLlmdTopologyConfigurations.yaml',
    ).then((fixtureData: DataScienceProjectData) => {
      testData = fixtureData as TopologyTestData;
      projectName = `${testData.projectResourceName}-${uuid}`;
      createCleanProject(projectName);
    });
  });

  after(() => {
    cleanupLLMInferenceServiceConfig(testData.topologyConfigName);
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Admin can create topology config from UI, manage it, and verify wizard visibility',
    { tags: ['@Smoke', '@Dashboard', '@NonConcurrent', '@LLMDServingCI'] },
    () => {
      cy.step('Log in with topology configs feature flag');
      cy.visitWithLogin('/?devFeatureFlags=true,llmdTopologyConfigs=true', LDAP_ADMIN_USER);

      cy.step('Navigate to topology configurations settings');
      llmdTopologySettingsPage.navigate();
      llmdTopologySettingsPage.findTable().should('exist');

      cy.step('Create a new topology config from the UI');
      llmdTopologySettingsPage.findAddButton().click();
      llmdTopologySettingsPage
        .findDisplayNameInput()
        .clear()
        .type(testData.topologyConfigDisplayName);
      llmdTopologySettingsPage.findSubmitButton().should('be.enabled').click();

      cy.step('Verify the created config appears in the table');
      llmdTopologySettingsPage.findTable().should('exist');
      llmdTopologySettingsPage.getRow(testData.topologyConfigName).find().should('exist');

      cy.step('Toggle the enabled switch and verify state');
      llmdTopologySettingsPage.getRow(testData.topologyConfigName).findEnabledSwitch().click();
      llmdTopologySettingsPage
        .getRow(testData.topologyConfigName)
        .findEnabledSwitch()
        .should('be.checked');

      cy.step('Navigate to project and open deploy wizard');
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      cy.step('Fill model details and advance to deployment step');
      modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
      modelServingWizard.findUrilocationInput().clear().type(testData.modelLocationURI);
      modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Select llm-d deployment method and verify topology fields');
      modelServingWizard.selectDeploymentMethodByKey(
        testData.deploymentMethod as 'llm-inference-service-llmd',
      );
      modelServingWizard.findTopologyTypeSelect().should('exist');
      modelServingWizard.selectTopologyType('topology-type-workload-multi-node-data-parallel');
      modelServingWizard.findCustomTopologyConfigSelect().should('exist');
    },
  );
});
