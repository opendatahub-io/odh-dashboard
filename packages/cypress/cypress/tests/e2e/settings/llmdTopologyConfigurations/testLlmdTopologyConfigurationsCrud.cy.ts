import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { topologyConfigurations } from '../../../../pages/modelDeploymentSettings/topologyConfigurations';
import { deleteModal } from '../../../../pages/components/DeleteModal';
import {
  cleanupLLMInferenceServiceConfig,
  checkLLMInferenceServiceConfigState,
} from '../../../../utils/oc_commands/llmInferenceServiceConfig';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { loadDSPFixture } from '../../../../utils/dataLoader';
import type { DataScienceProjectData } from '../../../../types';

type TopologyCrudTestData = DataScienceProjectData & {
  topologyConfigResourceName: string;
  topologyConfigDisplayName: string;
  topologyConfigEditorFixture: string;
  configSourceEditorKey: string;
};

let testData: TopologyCrudTestData;
const uuid = generateTestUUID();
const namespace = Cypress.env('APPLICATIONS_NAMESPACE');
// Unique per-run names so the test is safe to run concurrently.
let resourceName: string;
let displayName: string;

describe('LLMD Topology Configurations - Admin CRUD', () => {
  retryableBefore(() => {
    return loadDSPFixture(
      'e2e/settings/llmdTopologyConfigurations/testLlmdTopologyConfigurationsCrud.yaml',
    ).then((fixtureData: DataScienceProjectData) => {
      testData = fixtureData as TopologyCrudTestData;
      resourceName = `${testData.topologyConfigResourceName}-${uuid}`;
      displayName = `${testData.topologyConfigDisplayName} ${uuid}`;
      // Ensure a clean start if a previous run left this config behind.
      cleanupLLMInferenceServiceConfig(resourceName);
    });
  });

  after(() => {
    cleanupLLMInferenceServiceConfig(resourceName);
  });

  it(
    'Admin creates a topology config via the UI, it persists on the cluster, and delete removes it',
    {
      tags: ['@Featureflagged', '@Dashboard', '@ModelServing', '@LLMDServingCI', '@ModelServingCI'],
    },
    () => {
      cy.step('Log in with the topology configs feature flag');
      cy.visitWithLogin('/?devFeatureFlags=llmdTemplates=true', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to topology configurations settings');
      // On a clean cluster the tab renders an empty state (no table) until the
      // first config exists, so open the create form via the Add button (present
      // in both the empty state and the populated table) rather than asserting
      // the table up front.
      topologyConfigurations.navigate();

      cy.step('Open the create form (single node topology)');
      topologyConfigurations.findAddButton().click();

      cy.step('Fill in name, resource name, and configuration');
      topologyConfigurations.findDisplayNameInput().clear().type(displayName);
      topologyConfigurations.findEditResourceNameLink().click();
      topologyConfigurations.findNameInput().should('be.visible').clear().type(resourceName);
      topologyConfigurations.selectConfigSource(testData.configSourceEditorKey);
      topologyConfigurations.findYamlEditor().should('exist');
      cy.fixture(testData.topologyConfigEditorFixture).then((yamlContent: string) => {
        // The config field is a Monaco CodeEditor (no textarea); set content via
        // the shared helper, which uploads through the editor's file input.
        topologyConfigurations.getYamlEditor().setValue(yamlContent);
      });

      cy.step('Submit and verify the config is created');
      topologyConfigurations.findSubmitButton().should('be.enabled').click();

      cy.step('Verify the new config appears in the table');
      topologyConfigurations.findTable().should('exist');
      topologyConfigurations.getRow(resourceName).find().should('exist');

      cy.step(
        'Verify the config actually persisted as an LLMInferenceServiceConfig on the cluster',
      );
      checkLLMInferenceServiceConfigState(resourceName, namespace);

      cy.step('Delete the config from the UI');
      topologyConfigurations.getRow(resourceName).findKebabAction('Delete').click();
      deleteModal.findInput().clear().type(displayName);
      deleteModal.findSubmitButton().should('be.enabled').click();

      cy.step('Verify the config is removed from the table');
      topologyConfigurations.getRow(resourceName).find().should('not.exist');
    },
  );
});
