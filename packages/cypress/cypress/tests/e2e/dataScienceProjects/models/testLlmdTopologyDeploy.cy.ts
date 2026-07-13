import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { ModelLocationSelectOption, ModelTypeLabel } from '../../../../utils/modelServingConstants';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { projectDetails, projectListPage } from '../../../../pages/projects';
import { modelServingGlobal, modelServingWizard } from '../../../../pages/modelServing';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { createCleanProject } from '../../../../utils/projectChecker';
import {
  createCleanHardwareProfile,
  cleanupHardwareProfiles,
} from '../../../../utils/oc_commands/hardwareProfiles';
import { checkLLMInferenceServiceState } from '../../../../utils/oc_commands/modelServing';
import {
  createTopologyConfig,
  cleanupLLMInferenceServiceConfig,
  checkLLMInferenceServiceBaseRefs,
} from '../../../../utils/oc_commands/llmInferenceServiceConfig';

const uuid = generateTestUUID();
const projectName = `topo-deploy-${uuid}`;
const modelName = `topo-model-${uuid}`;
const modelURI = 'hf://facebook/opt-125m';
const topoConfigName = 'e2e-multi-node-topology';
const topoConfigFixture = 'resources/modelServing/llmd-topology-config.yaml';
const hwProfileName = 'small-profile';
const hwProfileYamlPath = 'resources/yaml/llmd-hardware-profile.yaml';

describe('LLMD Topology Deploy Integration', () => {
  retryableBefore(() => {
    createCleanProject(projectName);
    createCleanHardwareProfile(hwProfileYamlPath);
    createTopologyConfig(topoConfigName, topoConfigFixture);
  });

  after(() => {
    cleanupHardwareProfiles(hwProfileName);
    cleanupLLMInferenceServiceConfig(topoConfigName);
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Admin deploys with topology config and verifies baseRef on LLMInferenceService',
    {
      tags: ['@Smoke', '@Dashboard', '@ModelServing', '@NonConcurrent', '@LLMDServingCI'],
    },
    () => {
      cy.step('Log in with topology configs feature flag');
      cy.visitWithLogin(
        '/?devFeatureFlags=true,llmdTopologyConfigs=true',
        HTPASSWD_CLUSTER_ADMIN_USER,
      );

      cy.step('Navigate to project');
      projectListPage.navigate();
      projectListPage.filterProjectByName(projectName);
      projectListPage.findProjectLink(projectName).click();

      cy.step('Open deploy wizard');
      projectDetails.findSectionTab('model-server').click();
      modelServingGlobal.selectSingleServingModelButtonIfExists();
      modelServingGlobal.findDeployModelButton().click();

      cy.step('Step 1: Model details');
      modelServingWizard.findModelLocationSelectOption(ModelLocationSelectOption.URI).click();
      modelServingWizard.findUrilocationInput().clear().type(modelURI);
      modelServingWizard.findModelTypeSelectOption(ModelTypeLabel.GENERATIVE).click();
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Step 2: Model deployment');
      modelServingWizard.findModelDeploymentNameInput().clear().type(modelName);
      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');

      cy.step('Select multi-node topology');
      cy.findByTestId('topology-type-select').click();
      cy.findByTestId('topology-type-workload-multi-node-data-parallel').click();

      cy.step('Verify topology config dropdown shows and select the config');
      cy.findByTestId('custom-topology-config-select').should('exist').click();
      cy.findByTestId(`topology-config-option-${topoConfigName}`).click();

      modelServingWizard.selectPotentiallyDisabledProfile(hwProfileName);
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Step 3: Advanced settings');
      modelServingWizard.findNextButton().click();

      cy.step('Step 4: Review and submit');
      modelServingWizard.findSubmitButton().click();

      cy.step('Verify model appears in UI');
      modelServingGlobal.getDeploymentRow(modelName).should('exist');

      cy.step('Verify baseRefs on the LLMInferenceService CR');
      cy.then(() => {
        checkLLMInferenceServiceState(modelName, projectName, { checkReady: false });
        checkLLMInferenceServiceBaseRefs(modelName, projectName, [topoConfigName]);
      });
    },
  );
});
