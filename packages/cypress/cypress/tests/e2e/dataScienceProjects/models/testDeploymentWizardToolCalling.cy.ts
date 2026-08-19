import { modelServingGlobal, modelServingWizard } from '../../../../pages/modelServing';
import { ModelDeploymentType } from '../../../../utils/modelServingConstants';
import { modelDetailsPage } from '../../../../pages/modelCatalog/modelDetailsPage';
import type { ModelCatalogSourceTestData } from '../../../../types';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { waitForModelCatalogCards } from '../../../../utils/oc_commands/modelCatalog';
import { LDAP_ADMIN_USER } from '../../../../utils/e2eUsers';
import { modelCatalog } from '../../../../pages/modelCatalog/modelCatalog';
import { setupToolCallingWizardTestData } from '../../../../utils/modelCatalogToolCallingSetup';

let sourceData: ModelCatalogSourceTestData;
let projectName: string;
let modelName: string;
let validatedConfigurationOptionId: string;
const uuid = generateTestUUID();

const TOOL_CALLING_FEATURE_FLAG_ON = 'toolCalling=true';
const TOOL_CALLING_FEATURE_FLAG_OFF = 'toolCalling=false';

const selectProjectOnPreconfigureStep = (): void => {
  cy.step('Select project on the preconfigure step');
  modelServingWizard.findModelDeploymentProjectSelector().should('exist').click();
  modelServingWizard.findModelDeploymentProjectSelectorOption(projectName).should('exist').click();
};

describe('Verify tool calling configuration in the deployment wizard', () => {
  retryableBefore(() => {
    return setupToolCallingWizardTestData(uuid).then((setupData) => {
      sourceData = setupData.sourceData;
      projectName = setupData.projectName;
      modelName = setupData.modelName;
      validatedConfigurationOptionId = setupData.validatedConfigurationOptionId;
    });
  });

  after(() => {
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'should show the tool calling card and prefill runtime args on advanced settings',
    { tags: ['@Dashboard', '@ModelServing', '@ModelCatalog', '@Featureflagged'] },
    () => {
      const deploymentName = modelName;
      const flagsQuery = `?devFeatureFlags=${TOOL_CALLING_FEATURE_FLAG_ON}`;

      cy.step(`Log in with toolCalling feature flag (${TOOL_CALLING_FEATURE_FLAG_ON})`);
      cy.visitWithLogin(`/?devFeatureFlags=${TOOL_CALLING_FEATURE_FLAG_ON}`, LDAP_ADMIN_USER);

      cy.step('Navigate to Model Catalog');
      modelCatalog.visit(flagsQuery);

      cy.step('Wait for model catalog cards to appear');
      waitForModelCatalogCards();

      cy.step(`Search for ${sourceData.toolCallingModelName} and open it`);
      modelCatalog.searchByName(sourceData.toolCallingModelName);
      modelCatalog.findModelCatalogCardLink(sourceData.toolCallingModelName).click();
      modelDetailsPage.findPageTitle().should('exist');

      cy.step('Deploy the model from catalog into the wizard');
      modelCatalog.clickDeployModelButtonWithRetry();
      modelServingWizard.findPreconfigureStep().should('be.enabled');

      cy.step('Verify the Tool calling card is selected on the wizard');
      modelServingWizard.findValidatedArgumentsSection().should('be.visible');
      modelServingWizard
        .findValidatedConfigurationOption(validatedConfigurationOptionId)
        .should('be.visible');
      modelServingWizard
        .findValidatedConfigurationOptionCheckbox(validatedConfigurationOptionId)
        .should('be.checked');

      cy.step('Verify View arguments shows the tool calling runtime arg');
      modelServingWizard
        .findValidatedConfigurationViewArguments(validatedConfigurationOptionId)
        .click();
      modelServingWizard
        .findValidatedConfigurationArgumentsPopoverContent(validatedConfigurationOptionId)
        .should('be.visible')
        .and('contain.text', sourceData.toolCallingArg);
      modelServingWizard
        .findValidatedConfigurationViewArguments(validatedConfigurationOptionId)
        .click();

      selectProjectOnPreconfigureStep();
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Skip prefilled model source step');
      modelServingWizard.findModelSourceStep().should('be.enabled');
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Complete model deployment step');
      modelServingWizard.findModelDeploymentNameInput().clear().type(deploymentName);
      modelServingWizard.selectDeploymentType(ModelDeploymentType.TYPE1);
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Verify runtime args are prefilled on the advanced settings step');
      modelServingWizard.findAdvancedOptionsStep().should('be.enabled');
      modelServingWizard.findRuntimeArgsCheckbox().should('be.checked');
      modelServingWizard
        .findRuntimeArgsTextBox()
        .invoke('val')
        .should('include', sourceData.toolCallingArg);

      cy.step('Submit deployment from review step');
      modelServingWizard.findNextButton().should('be.enabled').click();
      modelServingWizard.findSubmitButton().should('be.enabled').click();

      cy.step('Verify redirection to deployments page with new deployment');
      cy.location('pathname').should('eq', `/ai-hub/models/deployments/${projectName}`);
      modelServingGlobal.getModelRow(deploymentName).should('exist');
    },
  );

  it(
    'should not show the tool calling card when the toolCalling flag is disabled',
    { tags: ['@Dashboard', '@ModelServing', '@ModelCatalog', '@Featureflagged'] },
    () => {
      const deploymentName = `${modelName}-off`;
      const flagsQuery = `?devFeatureFlags=${TOOL_CALLING_FEATURE_FLAG_OFF}`;

      cy.step(`Log in with toolCalling feature flag (${TOOL_CALLING_FEATURE_FLAG_OFF})`);
      cy.visitWithLogin(`/?devFeatureFlags=${TOOL_CALLING_FEATURE_FLAG_OFF}`, LDAP_ADMIN_USER);

      cy.step('Navigate to Model Catalog');
      modelCatalog.visit(flagsQuery);

      cy.step('Wait for model catalog cards to appear');
      waitForModelCatalogCards();

      cy.step(`Search for ${sourceData.toolCallingModelName} and open it`);
      modelCatalog.searchByName(sourceData.toolCallingModelName);
      modelCatalog.findModelCatalogCardLink(sourceData.toolCallingModelName).click();
      modelDetailsPage.findPageTitle().should('exist');

      cy.step('Deploy the model from catalog into the wizard');
      modelCatalog.clickDeployModelButtonWithRetry();
      modelServingWizard.findPreconfigureStep().should('be.enabled');

      cy.step('Verify the wizard opened without the tool calling card');
      modelServingWizard.findPreconfigureStep().should('be.enabled');
      modelServingWizard.findValidatedArgumentsSection().should('not.exist');
      modelServingWizard
        .findValidatedConfigurationOption(validatedConfigurationOptionId)
        .should('not.exist');

      selectProjectOnPreconfigureStep();
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Skip prefilled model source step');
      modelServingWizard.findModelSourceStep().should('be.enabled');
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Complete model deployment step');
      modelServingWizard.findModelDeploymentNameInput().clear().type(deploymentName);
      modelServingWizard.selectDeploymentType(ModelDeploymentType.TYPE1);
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Submit deployment from review step');
      modelServingWizard.findNextButton().should('be.enabled').click();
      modelServingWizard.findSubmitButton().should('be.enabled').click();

      cy.step('Verify redirection to deployments page with new deployment');
      cy.location('pathname').should('eq', `/ai-hub/models/deployments/${projectName}`);
      modelServingGlobal.getModelRow(deploymentName).should('exist');
    },
  );
});
