import { modelServingGlobal, modelServingWizard } from '../../../pages/modelServing';
import type { DataScienceProjectData } from '../../../types';
import { retryableBefore } from '../../../utils/retryableHooks';
import { loadDSPFixture } from '../../../utils/dataLoader';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { provisionProjectForModelServing } from '../../../utils/oc_commands/modelServing';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';

let testData: DataScienceProjectData;
let projectName: string;
const awsBucket = 'BUCKET_1' as const;
const uuid = generateTestUUID();

describe('Model Capabilities', () => {
  retryableBefore(() => {
    return loadDSPFixture('e2e/modelServing/testModelCapabilities.yaml').then(
      (fixtureData: DataScienceProjectData) => {
        testData = fixtureData;
        projectName = `${testData.projectResourceName}-${uuid}`;
        provisionProjectForModelServing(
          projectName,
          awsBucket,
          'resources/yaml/data_connection_model_serving.yaml',
        );
      },
    );
  });

  after(() => {
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true, timeout: 300000 });
  });

  describe('Wizard', () => {
    it(
      'Verify user can add well-known capabilities',
      { tags: ['@Dashboard', '@ModelServing', '@Smoke', '@ModelCapabilities'] },
      () => {
        cy.visitWithLogin(`/?devFeatureFlags=modelCapabilities=true`, HTPASSWD_CLUSTER_ADMIN_USER);

        cy.step('Navigate to deployments page');
        modelServingGlobal.visit(projectName);

        cy.step('Open deployment wizard');
        modelServingGlobal.findDeployModelButton().click();

        cy.step('Navigate to advanced options');
        modelServingWizard.navigateGenerativeLegacyToAdvancedOptions();

        cy.step('Select model capabilities');
        modelServingWizard.findModelCapabilitiesField().should('exist');
        modelServingWizard.selectWellKnownCapability('Vision');
        modelServingWizard.selectWellKnownCapability('Transcription');
        modelServingWizard.findCapabilityLabel('Vision').should('exist');
        modelServingWizard.findCapabilityLabel('Transcription').should('exist');

        cy.step('Complete wizard without full deployment');
        // ponytail: reviewer said deployment doesn't need to complete - just verify capabilities UI
      },
    );

    it(
      'Verify user can add custom capabilities',
      { tags: ['@Dashboard', '@ModelServing', '@ModelCapabilities'] },
      () => {
        cy.visitWithLogin(`/?devFeatureFlags=modelCapabilities=true`, HTPASSWD_CLUSTER_ADMIN_USER);

        cy.step('Navigate to deployments page');
        modelServingGlobal.visit(projectName);

        cy.step('Open deployment wizard');
        modelServingGlobal.findDeployModelButton().click();

        cy.step('Navigate to advanced options');
        modelServingWizard.navigateGenerativeLegacyToAdvancedOptions();

        cy.step('Add custom capability');
        modelServingWizard.findModelCapabilitiesField().should('exist');
        modelServingWizard.addCustomCapability('MyCustomCap');
        modelServingWizard.findCapabilityLabel('MyCustomCap').should('exist');
      },
    );

    it(
      'Verify user can remove capabilities',
      { tags: ['@Dashboard', '@ModelServing', '@ModelCapabilities'] },
      () => {
        cy.visitWithLogin(`/?devFeatureFlags=modelCapabilities=true`, HTPASSWD_CLUSTER_ADMIN_USER);

        cy.step('Navigate to deployments page');
        modelServingGlobal.visit(projectName);

        cy.step('Open deployment wizard');
        modelServingGlobal.findDeployModelButton().click();

        cy.step('Navigate to advanced options');
        modelServingWizard.navigateGenerativeLegacyToAdvancedOptions();

        cy.step('Add and remove capability');
        modelServingWizard.findModelCapabilitiesField().should('exist');
        modelServingWizard.selectWellKnownCapability('Vision');
        modelServingWizard.addCustomCapability('ToRemove');
        modelServingWizard.findCapabilityLabel('ToRemove').should('exist');
        modelServingWizard.removeCapability('ToRemove');
        modelServingWizard.findCapabilityLabel('ToRemove').should('not.exist');
        modelServingWizard.findCapabilityLabel('Vision').should('exist');
      },
    );

    it(
      'Verify error when adding duplicate custom capability',
      { tags: ['@Dashboard', '@ModelServing', '@ModelCapabilities'] },
      () => {
        cy.visitWithLogin(`/?devFeatureFlags=modelCapabilities=true`, HTPASSWD_CLUSTER_ADMIN_USER);

        cy.step('Navigate to deployments page');
        modelServingGlobal.visit(projectName);

        cy.step('Open deployment wizard');
        modelServingGlobal.findDeployModelButton().click();

        cy.step('Navigate to advanced options');
        modelServingWizard.navigateGenerativeLegacyToAdvancedOptions();

        cy.step('Add duplicate capability and verify error');
        modelServingWizard.addCustomCapability('MyCustomCap');
        modelServingWizard.findCapabilityLabel('MyCustomCap').should('exist');
        modelServingWizard.openAddCapabilityDropdown();
        modelServingWizard.findCustomCapabilityInput().type('MyCustomCap');
        modelServingWizard.findAddCustomCapabilityButton().click();
        modelServingWizard
          .findCustomCapabilityError()
          .should('contain.text', 'This capability has already been added.');
      },
    );

    it(
      'Verify well-known options removed from dropdown after selection',
      { tags: ['@Dashboard', '@ModelServing', '@ModelCapabilities'] },
      () => {
        cy.visitWithLogin(`/?devFeatureFlags=modelCapabilities=true`, HTPASSWD_CLUSTER_ADMIN_USER);

        cy.step('Navigate to deployments page');
        modelServingGlobal.visit(projectName);

        cy.step('Open deployment wizard');
        modelServingGlobal.findDeployModelButton().click();

        cy.step('Navigate to advanced options');
        modelServingWizard.navigateGenerativeLegacyToAdvancedOptions();

        cy.step('Select capability and verify it is removed from dropdown');
        modelServingWizard.selectWellKnownCapability('Vision');
        modelServingWizard.openAddCapabilityDropdown();
        modelServingWizard.findWellKnownCapabilityOption('Vision').should('not.exist');
        modelServingWizard.findWellKnownCapabilityOption('Transcription').should('exist');
      },
    );

    it(
      'Verify field hidden when feature flag disabled',
      { tags: ['@Dashboard', '@ModelServing', '@ModelCapabilities'] },
      () => {
        cy.visitWithLogin(`/?devFeatureFlags=modelCapabilities=false`, HTPASSWD_CLUSTER_ADMIN_USER);

        cy.step('Navigate to deployments page');
        modelServingGlobal.visit(projectName);

        cy.step('Open deployment wizard');
        modelServingGlobal.findDeployModelButton().click();

        cy.step('Navigate to advanced options');
        modelServingWizard.navigateGenerativeLegacyToAdvancedOptions();

        cy.step('Verify capabilities field does not exist');
        modelServingWizard.findModelCapabilitiesField().should('not.exist');
      },
    );
  });

  describe('Table Column', () => {
    it(
      'Verify Capabilities column shows when flag is enabled',
      { tags: ['@Dashboard', '@ModelServing', '@ModelCapabilities'] },
      () => {
        cy.visitWithLogin(`/?devFeatureFlags=modelCapabilities=true`, HTPASSWD_CLUSTER_ADMIN_USER);

        cy.step('Navigate to deployments page');
        modelServingGlobal.visit(projectName);

        cy.step('Verify Capabilities column exists');
        cy.findByTestId('deployments-table').should('exist');
        cy.findByTestId('deployments-table').find('th').contains('Capabilities').should('exist');
      },
    );

    it(
      'Verify Capabilities column hidden when flag is disabled',
      { tags: ['@Dashboard', '@ModelServing', '@ModelCapabilities'] },
      () => {
        cy.visitWithLogin(`/?devFeatureFlags=modelCapabilities=false`, HTPASSWD_CLUSTER_ADMIN_USER);

        cy.step('Navigate to deployments page');
        modelServingGlobal.visit(projectName);

        cy.step('Verify Capabilities column does not exist');
        cy.findByTestId('deployments-table').should('exist');
        cy.findByTestId('deployments-table')
          .find('th')
          .contains('Capabilities')
          .should('not.exist');
      },
    );
  });
});
