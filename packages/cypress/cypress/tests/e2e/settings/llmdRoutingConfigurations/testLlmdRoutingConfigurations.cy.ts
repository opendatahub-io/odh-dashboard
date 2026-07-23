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
  modelLocationURI: string;
  deploymentMethod: string;
  defaultRoutingLabel: string;
};

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
    {
      tags: ['@Featureflagged', '@Dashboard', '@ModelServing', '@NonConcurrent', '@LLMDServingCI'],
    },
    () => {
      cy.step('Log in as admin');
      cy.visitWithLogin('/?devFeatureFlags=llmdTemplates=true', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to routing configurations settings');
      llmdRoutingSettingsPage.navigate();
      llmdRoutingSettingsPage.findTable().should('exist');

      cy.step('Validate routing row: name, enabled state');
      const row = llmdRoutingSettingsPage.getRow(testData.routingConfigName);
      row.find().should('exist');
      row.findEnabledSwitch().should('exist');

      cy.step('Edit the routing config');
      row.findKebabAction('Edit').click();
      cy.findByTestId('app-page-title').should('exist');
      cy.findByTestId('cancel-routing-config-button').click();

      cy.step('Duplicate the routing config');
      llmdRoutingSettingsPage.findTable().should('exist');
      llmdRoutingSettingsPage
        .getRow(testData.routingConfigName)
        .findKebabAction('Duplicate')
        .click();
      cy.findByTestId('app-page-title').should('exist');
      cy.findByTestId('cancel-routing-config-button').click();

      cy.step('Delete the routing config');
      llmdRoutingSettingsPage.findTable().should('exist');
      llmdRoutingSettingsPage.getRow(testData.routingConfigName).findKebabAction('Delete').click();
      cy.findByRole('dialog').should('exist');
      cy.findByRole('dialog').within(() => {
        cy.findByRole('button', { name: /Delete/ }).click();
      });
      llmdRoutingSettingsPage.getRow(testData.routingConfigName).find().should('not.exist');

      cy.step('Re-provision routing config for wizard test');
      createCleanLLMInferenceServiceConfig(
        testData.routingConfigName,
        testData.routingConfigFixture,
      );

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

      cy.step('Verify routing dropdown is visible with default selected');
      modelServingWizard.findRoutingConfigSelect().should('exist');
      modelServingWizard
        .findRoutingConfigSelect()
        .should('contain.text', testData.defaultRoutingLabel);

      cy.step('Open routing dropdown and verify provisioned config appears');
      modelServingWizard.findRoutingConfigSelect().click();
      modelServingWizard.findRoutingConfigOption(testData.routingConfigName).should('exist');
    },
  );
});
