import { LDAP_ADMIN_USER } from '../../../../utils/e2eUsers';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { topologyConfigurations } from '../../../../pages/modelDeploymentSettings/topologyConfigurations';
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
import { applyOpenShiftYaml } from '../../../../utils/oc_commands/baseCommands';
import { renderYamlFileWithReplacements } from '../../../../utils/oc_commands/templates';
import { getFixturePath } from '../../../../utils/fileImportUtils';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { loadDSPFixture } from '../../../../utils/dataLoader';
import type { DataScienceProjectData } from '../../../../types';

type TopologyTestData = DataScienceProjectData & {
  topologyConfigName: string;
  topologyConfigFixture: string;
};

let testData: TopologyTestData;
const uuid = generateTestUUID();
let projectName: string;
// Unique per-run config name so the test is safe to run concurrently.
let topologyConfigName: string;
const applicationNamespace = Cypress.env('APPLICATIONS_NAMESPACE');

describe('LLMD Topology Configurations - Admin Settings', () => {
  retryableBefore(() => {
    return loadDSPFixture(
      'e2e/settings/llmdTopologyConfigurations/testLlmdTopologyConfigurations.yaml',
    )
      .then((fixtureData: DataScienceProjectData) => {
        testData = fixtureData as TopologyTestData;
        projectName = `${testData.projectResourceName}-${uuid}`;
        topologyConfigName = `${testData.topologyConfigName}-${uuid}`;
        // Seed a uniquely-named topology config so concurrent runs don't collide.
        return renderYamlFileWithReplacements(getFixturePath(testData.topologyConfigFixture), {
          TOPOLOGY_CONFIG_NAME: topologyConfigName,
        }).then((renderedYaml) => applyOpenShiftYaml(renderedYaml, applicationNamespace));
      })
      .then(() => {
        createCleanProject(projectName);
      })
      .then(() => {
        // The project is created via oc as a cluster admin; grant the test's
        // login user admin access so it appears in their Projects list.
        addUserToProject(projectName, LDAP_ADMIN_USER.USERNAME, 'admin');
        return waitForUserProjectAccess(projectName, LDAP_ADMIN_USER.USERNAME);
      });
  });

  after(() => {
    cleanupLLMInferenceServiceConfig(topologyConfigName);
    deleteOpenShiftProject(projectName, { wait: true, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'Admin can manage topology configurations and verify wizard visibility',
    {
      tags: ['@Featureflagged', '@Dashboard', '@ModelServing', '@LLMDServingCI', '@ModelServingCI'],
    },
    () => {
      cy.step('Log in with topology configs feature flag');
      cy.visitWithLogin('/?devFeatureFlags=llmdTemplates=true', LDAP_ADMIN_USER);

      cy.step('Navigate to topology configurations settings');
      topologyConfigurations.navigate();
      topologyConfigurations.findTable().should('exist');

      cy.step('Verify the test topology config is listed');
      topologyConfigurations.getRow(topologyConfigName).find().should('exist');

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

      cy.step('Select llm-d deployment method and verify topology fields');
      modelServingWizard.selectDeploymentMethodByKey('llm-inference-service-llmd');
      modelServingWizard.findTopologyTypeSelect().should('exist');
      modelServingWizard.selectTopologyType('topology-type-workload-multi-node-data-parallel');
      modelServingWizard.findCustomTopologyConfigSelect().should('exist');
    },
  );
});
