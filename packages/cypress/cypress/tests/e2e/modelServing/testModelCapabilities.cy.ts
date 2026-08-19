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

  it(
    'Verify user can add capabilities',
    { tags: ['@Dashboard', '@ModelServing', '@FeatureFlagged', '@ModelCapabilities'] },
    () => {
      cy.visitWithLogin(`/?devFeatureFlags=modelCapabilities=true`, LDAP_ADMIN_USER);

      cy.step('Navigate to deployments page');
      modelServingGlobal.visit(projectName);

      cy.step('Open deployment wizard');
      modelServingGlobal.findDeployModelButton().click();

      cy.step('Configure model source');
      modelServingWizard.findModelTypeSelectOption('Generative AI model (Example, LLM)').click();
      modelServingWizard.findModelLocationSelectOption('Existing connection').click();
      modelServingWizard.findExistingConnectionSelect().click();
      modelServingWizard.findExistingConnectionSelectOption('Test URI Secret').click();
      modelServingWizard.findNextButton().click();

      cy.step('Configure deployment');
      modelServingWizard.findModelDeploymentNameInput().type(testData.modelName);
      modelServingWizard.selectDeploymentMethodByKey('legacy');
      modelServingWizard.findServingRuntimeTemplateSearchSelector().click();
      modelServingWizard.selectGlobalScopedTemplateOption(testData.servingRuntime);
      modelServingWizard.findNextButton().click();

      cy.step('Add well-known capabilities');
      modelServingWizard.findModelCapabilitiesField().should('exist');
      modelServingWizard.selectWellKnownCapability(testData.wellKnownCapabilities[0]);
      modelServingWizard.selectWellKnownCapability(testData.wellKnownCapabilities[1]);
      modelServingWizard.findCapabilityLabel(testData.wellKnownCapabilities[0]).should('exist');
      modelServingWizard.findCapabilityLabel(testData.wellKnownCapabilities[1]).should('exist');

      cy.step('Add custom capability');
      modelServingWizard.addCustomCapability(testData.customCapabilities[0]);
      modelServingWizard.findCapabilityLabel(testData.customCapabilities[0]).should('exist');

      cy.step('Complete wizard and deploy model');
      modelServingWizard.findSubmitButton().click();

      cy.step('Verify InferenceService annotation for capabilities');
      const expectedCapabilities = [
        testData.wellKnownCapabilities[0],
        testData.wellKnownCapabilities[1],
        testData.customCapabilities[0],
      ].join(',');
      verifyInferenceServiceAnnotation(
        projectName,
        testData.modelName,
        'model-capabilities',
        expectedCapabilities,
      ).should('be.true');

      cy.step('Verify capabilities column and tags in deployments table');
      const deploymentRow = modelServingGlobal.getDeploymentRow(testData.modelName);
      deploymentRow.findCapabilitiesCell().should('exist');
      deploymentRow.findCapabilitiesGroup().should('exist');
      deploymentRow.findCapabilityLabels().should('have.length', 2);
      deploymentRow
        .findCapabilityLabels()
        .eq(0)
        .should('contain', testData.wellKnownCapabilities[0]);
      deploymentRow
        .findCapabilityLabels()
        .eq(1)
        .should('contain', testData.wellKnownCapabilities[1]);
      deploymentRow.findCapabilityOverflowLabel().should('contain', '+1');

      cy.step('Edit capabilities via kebab menu');
      deploymentRow.findKebab().click();
      deploymentRow.findKebabAction('Edit').click();

      cy.step('Navigate to advanced options in edit mode');
      modelServingWizard.findNextButton().click();

      cy.step('Remove one capability and add another');
      modelServingWizard.removeCapability(testData.customCapabilities[0]);
      modelServingWizard.selectWellKnownCapability(testData.wellKnownCapabilities[2]);
      modelServingWizard.findCapabilityLabel(testData.wellKnownCapabilities[2]).should('exist');

      cy.step('Submit changes');
      modelServingWizard.findSubmitButton().click();

      cy.step('Verify updated InferenceService annotation');
      const updatedCapabilities = [
        testData.wellKnownCapabilities[0],
        testData.wellKnownCapabilities[1],
        testData.wellKnownCapabilities[2],
      ].join(',');
      verifyInferenceServiceAnnotation(
        projectName,
        testData.modelName,
        'model-capabilities',
        updatedCapabilities,
      ).should('be.true');
    },
  );
});
