import { modelServingGlobal, modelServingWizard } from '../../../pages/modelServing';
import type { DataScienceProjectData, ModelCapabilitiesTestData } from '../../../types';
import { retryableBefore } from '../../../utils/retryableHooks';
import { loadDSPFixture } from '../../../utils/dataLoader';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { provisionProjectForModelServing } from '../../../utils/oc_commands/modelServing';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { verifyInferenceServiceAnnotation } from '../../../utils/oc_commands/inferenceService';

let testData: ModelCapabilitiesTestData;
let projectName: string;
const uuid = generateTestUUID();

// RHOAIENG-80920 - Model Capabilities feature
describe('Verify user can manage model capabilities in deployment wizard and deployments table', () => {
  retryableBefore(() => {
    return loadDSPFixture('e2e/modelServing/testModelCapabilities.yaml').then(
      (fixtureData: DataScienceProjectData) => {
        testData = fixtureData as ModelCapabilitiesTestData;
        projectName = `${testData.projectResourceName}-${uuid}`;
        provisionProjectForModelServing(
          projectName,
          testData.awsBucket,
          'resources/yaml/data_connection_model_serving.yaml',
        );
      },
    );
  });

  after(() => {
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true, timeout: 300000 });
  });

  describe('Verify user can manage capabilities in deployment wizard', () => {
    it(
      'Verify user can add well-known capabilities',
      { tags: ['@Dashboard', '@ModelServing', '@FeatureFlagged', '@ModelCapabilities'] },
      () => {
        cy.visitWithLogin(`/?devFeatureFlags=modelCapabilities=true`, LDAP_ADMIN_USER);

        cy.step('Navigate to deployments page');
        modelServingGlobal.visit(projectName);

        cy.step('Open deployment wizard');
        modelServingGlobal.findDeployModelButton().click();

        cy.step('Navigate to advanced options');
        modelServingWizard.navigateGenerativeLegacyToAdvancedOptions();

        cy.step('Select model capabilities');
        modelServingWizard.findModelCapabilitiesField().should('exist');
        modelServingWizard.selectWellKnownCapability(testData.wellKnownCapabilities[0]);
        modelServingWizard.selectWellKnownCapability(testData.wellKnownCapabilities[1]);
        modelServingWizard.findCapabilityLabel(testData.wellKnownCapabilities[0]).should('exist');
        modelServingWizard.findCapabilityLabel(testData.wellKnownCapabilities[1]).should('exist');

        cy.step('Complete wizard and deploy model');
        modelServingWizard.findSubmitButton().click();

        cy.step('Verify InferenceService annotation');
        const expectedCapabilities = [
          testData.wellKnownCapabilities[0],
          testData.wellKnownCapabilities[1],
        ].join(',');
        verifyInferenceServiceAnnotation(
          projectName,
          testData.modelName,
          'model-capabilities',
          expectedCapabilities,
        ).should('be.true');
      },
    );

    it(
      'Verify user can add custom capabilities',
      { tags: ['@Dashboard', '@ModelServing', '@FeatureFlagged', '@ModelCapabilities'] },
      () => {
        cy.visitWithLogin(`/?devFeatureFlags=modelCapabilities=true`, LDAP_ADMIN_USER);

        cy.step('Navigate to deployments page');
        modelServingGlobal.visit(projectName);

        cy.step('Open deployment wizard');
        modelServingGlobal.findDeployModelButton().click();

        cy.step('Navigate to advanced options');
        modelServingWizard.navigateGenerativeLegacyToAdvancedOptions();

        cy.step('Add custom capability');
        modelServingWizard.findModelCapabilitiesField().should('exist');
        modelServingWizard.addCustomCapability(testData.customCapabilities[0]);
        modelServingWizard.findCapabilityLabel(testData.customCapabilities[0]).should('exist');
      },
    );

    it(
      'Verify user can remove capabilities',
      { tags: ['@Dashboard', '@ModelServing', '@FeatureFlagged', '@ModelCapabilities'] },
      () => {
        cy.visitWithLogin(`/?devFeatureFlags=modelCapabilities=true`, LDAP_ADMIN_USER);

        cy.step('Navigate to deployments page');
        modelServingGlobal.visit(projectName);

        cy.step('Open deployment wizard');
        modelServingGlobal.findDeployModelButton().click();

        cy.step('Navigate to advanced options');
        modelServingWizard.navigateGenerativeLegacyToAdvancedOptions();

        cy.step('Add and remove capability');
        modelServingWizard.findModelCapabilitiesField().should('exist');
        modelServingWizard.selectWellKnownCapability(testData.wellKnownCapabilities[0]);
        modelServingWizard.addCustomCapability(testData.customCapabilities[1]);
        modelServingWizard.findCapabilityLabel(testData.customCapabilities[1]).should('exist');
        modelServingWizard.removeCapability(testData.customCapabilities[1]);
        modelServingWizard.findCapabilityLabel(testData.customCapabilities[1]).should('not.exist');
        modelServingWizard.findCapabilityLabel(testData.wellKnownCapabilities[0]).should('exist');
      },
    );

    it(
      'Verify error when adding duplicate custom capability',
      { tags: ['@Dashboard', '@ModelServing', '@FeatureFlagged', '@ModelCapabilities'] },
      () => {
        cy.visitWithLogin(`/?devFeatureFlags=modelCapabilities=true`, LDAP_ADMIN_USER);

        cy.step('Navigate to deployments page');
        modelServingGlobal.visit(projectName);

        cy.step('Open deployment wizard');
        modelServingGlobal.findDeployModelButton().click();

        cy.step('Navigate to advanced options');
        modelServingWizard.navigateGenerativeLegacyToAdvancedOptions();

        cy.step('Add duplicate capability and verify error');
        modelServingWizard.addCustomCapability(testData.customCapabilities[0]);
        modelServingWizard.findCapabilityLabel(testData.customCapabilities[0]).should('exist');
        modelServingWizard.openAddCapabilityDropdown();
        modelServingWizard.findCustomCapabilityInput().type(testData.customCapabilities[0]);
        modelServingWizard.findAddCustomCapabilityButton().click();
        modelServingWizard
          .findCustomCapabilityError()
          .should('contain.text', 'This capability has already been added.');
      },
    );

    it(
      'Verify well-known options removed from dropdown after selection',
      { tags: ['@Dashboard', '@ModelServing', '@FeatureFlagged', '@ModelCapabilities'] },
      () => {
        cy.visitWithLogin(`/?devFeatureFlags=modelCapabilities=true`, LDAP_ADMIN_USER);

        cy.step('Navigate to deployments page');
        modelServingGlobal.visit(projectName);

        cy.step('Open deployment wizard');
        modelServingGlobal.findDeployModelButton().click();

        cy.step('Navigate to advanced options');
        modelServingWizard.navigateGenerativeLegacyToAdvancedOptions();

        cy.step('Select capability and verify it is removed from dropdown');
        modelServingWizard.selectWellKnownCapability(testData.wellKnownCapabilities[0]);
        modelServingWizard.openAddCapabilityDropdown();
        modelServingWizard
          .findWellKnownCapabilityOption(testData.wellKnownCapabilities[0])
          .should('not.exist');
        modelServingWizard
          .findWellKnownCapabilityOption(testData.wellKnownCapabilities[1])
          .should('exist');
      },
    );

    it(
      'Verify field hidden when feature flag disabled',
      { tags: ['@Dashboard', '@ModelServing', '@FeatureFlagged', '@ModelCapabilities'] },
      () => {
        cy.visitWithLogin(`/?devFeatureFlags=modelCapabilities=false`, LDAP_ADMIN_USER);

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

    // Table column tests continue from wizard context
    it(
      'Verify Capabilities column shows when flag is enabled',
      { tags: ['@Dashboard', '@ModelServing', '@FeatureFlagged', '@ModelCapabilities'] },
      () => {
        cy.step('Verify Capabilities column exists');
        cy.findByTestId('deployments-table').should('exist');
        cy.findByTestId('deployments-table').find('th').contains('Capabilities').should('exist');
      },
    );

    it(
      'Verify Capabilities column hidden when flag is disabled',
      { tags: ['@Dashboard', '@ModelServing', '@FeatureFlagged', '@ModelCapabilities'] },
      () => {
        cy.visitWithLogin(`/?devFeatureFlags=modelCapabilities=false`, LDAP_ADMIN_USER);
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
