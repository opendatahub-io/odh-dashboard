import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { llmdTopologySettingsPage } from '../../../../pages/llmdTopologySettings';
import {
  createCleanLLMInferenceServiceConfig,
  cleanupLLMInferenceServiceConfig,
} from '../../../../utils/oc_commands/llmInferenceServiceConfig';
import { projectListPage } from '../../../../pages/projects';
import { modelServingGlobal, modelServingWizard } from '../../../../pages/modelServing';
import { ModelLocationSelectOption, ModelTypeLabel } from '../../../../utils/modelServingConstants';
import { createCleanProject } from '../../../../utils/projectChecker';
import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { generateTestUUID } from '../../../../utils/uuidGenerator';

const topoConfigName = 'e2e-multi-node-topology';
const topoConfigFixture = 'resources/modelServing/llmd-topology-config.yaml';
const uuid = generateTestUUID();
const projectName = `topo-admin-${uuid}`;

describe('LLMD Topology Configurations - Admin Settings', () => {
  retryableBefore(() => {
    createCleanLLMInferenceServiceConfig(topoConfigName, topoConfigFixture);
    createCleanProject(projectName);
  });

  after(() => {
    cleanupLLMInferenceServiceConfig(topoConfigName);
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Admin can view topology configurations table',
    { tags: ['@Smoke', '@Dashboard', '@NonConcurrent', '@LLMDServingCI'] },
    () => {
      cy.step('Log in with topology configs feature flag');
      cy.visitWithLogin(
        '/?devFeatureFlags=true,llmdTopologyConfigs=true',
        HTPASSWD_CLUSTER_ADMIN_USER,
      );

      cy.step('Navigate to topology configurations settings');
      llmdTopologySettingsPage.navigate();
      llmdTopologySettingsPage.findAppTitle().should('contain', 'llm-d topology configurations');
      llmdTopologySettingsPage.findTable().should('exist');
    },
  );

  it(
    'Admin can see provisioned topology config in the table',
    { tags: ['@Smoke', '@Dashboard', '@NonConcurrent', '@LLMDServingCI'] },
    () => {
      cy.step('Log in with topology configs feature flag');
      cy.visitWithLogin(
        '/?devFeatureFlags=true,llmdTopologyConfigs=true',
        HTPASSWD_CLUSTER_ADMIN_USER,
      );

      cy.step('Navigate to topology configurations settings');
      llmdTopologySettingsPage.navigate();

      cy.step('Verify the test topology config is listed');
      llmdTopologySettingsPage.getRow(topoConfigName).find().should('exist');
    },
  );

  it(
    'Admin can toggle topology config enabled state',
    { tags: ['@Dashboard', '@NonConcurrent', '@LLMDServingCI'] },
    () => {
      cy.step('Log in with topology configs feature flag');
      cy.visitWithLogin(
        '/?devFeatureFlags=true,llmdTopologyConfigs=true',
        HTPASSWD_CLUSTER_ADMIN_USER,
      );

      cy.step('Navigate to topology configurations settings');
      llmdTopologySettingsPage.navigate();

      cy.step('Toggle the enabled switch');
      llmdTopologySettingsPage.getRow(topoConfigName).findEnabledSwitch().click();
    },
  );

  it(
    'Topology configs are visible in the model serving wizard',
    { tags: ['@Smoke', '@Dashboard', '@NonConcurrent', '@LLMDServingCI'] },
    () => {
      cy.step('Log in with topology configs feature flag');
      cy.visitWithLogin(
        '/?devFeatureFlags=true,llmdTopologyConfigs=true',
        HTPASSWD_CLUSTER_ADMIN_USER,
      );

      cy.step('Navigate to project and open deploy wizard');
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      cy.step('Fill model details and advance to deployment step');
      modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
      modelServingWizard.findUrilocationInput().clear().type('hf://facebook/opt-125m');
      modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Select llm-d deployment method');
      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      cy.step('Verify topology type dropdown is visible');
      cy.findByTestId('topology-type-select').should('exist');

      cy.step('Select multi-node topology and verify config dropdown populates');
      cy.findByTestId('topology-type-select').click();
      cy.findByTestId('topology-type-workload-multi-node-data-parallel').click();
      cy.findByTestId('custom-topology-config-select').should('exist');
    },
  );
});
