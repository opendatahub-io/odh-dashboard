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
import { verifyLLMInferenceServiceRuntimeArgs } from '../../../../utils/oc_commands/modelServing';

let sourceData: ModelCatalogSourceTestData;
let projectName: string;
let modelName: string;
let validatedConfigurationOptionId: string;
const uuid = generateTestUUID();

const TOOL_CALLING_FIXTURE_PATH = 'e2e/modelCatalog/testSourceEnableDisable.yaml';
const MODEL_CATALOG_FIXTURE_PATH = 'e2e/modelCatalog/testModelCatalog.yaml';
const MODEL_SERVING_CONNECTION_YAML = 'resources/yaml/data_connection_model_serving.yaml';
const awsBucket = 'BUCKET_1' as const;

const TOOL_CALLING_FEATURE_FLAG_ON = 'toolCalling=true';
const MODEL_CATALOG_UI_TIMEOUT = 20000;

const selectProjectOnPreconfigureStep = (): void => {
  cy.step('Select project on the preconfigure step');
  modelServingWizard.findModelDeploymentProjectSelector().should('exist').click();
  modelServingWizard.findModelDeploymentProjectSelectorOption(projectName).should('exist').click();
};

describe('Verify tool calling configuration in the deployment wizard', () => {
  retryableBefore(() => {
    return setupToolCallingWizardTestData(
      uuid,
      awsBucket,
      TOOL_CALLING_FIXTURE_PATH,
      MODEL_CATALOG_FIXTURE_PATH,
      MODEL_SERVING_CONNECTION_YAML,
    ).then((setupData) => {
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
    'Should deploy a catalog model with tool calling runtime args from the wizard',
    { tags: ['@Dashboard', '@ModelServing', '@ModelCatalog', '@Featureflagged'] },
    () => {
      const deploymentName = `${modelName}-${uuid}`;
      let resourceName: string;

      cy.step(`Log in with toolCalling feature flag (${TOOL_CALLING_FEATURE_FLAG_ON})`);
      cy.visitWithLogin(`/?devFeatureFlags=${TOOL_CALLING_FEATURE_FLAG_ON}`, LDAP_ADMIN_USER);

      cy.step('Navigate to Model Catalog');
      cy.visitWithLogin(
        `/ai-hub/models/catalog?devFeatureFlags=${TOOL_CALLING_FEATURE_FLAG_ON}`,
        LDAP_ADMIN_USER,
      );

      cy.step('Wait for model catalog cards to appear');
      waitForModelCatalogCards();

      cy.step(`Search for ${sourceData.toolCallingModelName} and open it`);
      modelCatalog.searchByName(sourceData.toolCallingModelName);
      modelCatalog
        .findModelCatalogCardLink(sourceData.toolCallingModelName)
        .should('be.visible', { timeout: MODEL_CATALOG_UI_TIMEOUT })
        .click();
      modelDetailsPage.findPageTitle().should('exist', { timeout: MODEL_CATALOG_UI_TIMEOUT });

      cy.step('Deploy the model from catalog into the wizard');
      modelCatalog
        .findCatalogDeployButton()
        .should('be.visible', { timeout: MODEL_CATALOG_UI_TIMEOUT })
        .and('not.have.attr', 'aria-disabled', 'true');
      modelCatalog.clickDeployModelButtonWithRetry();
      modelServingWizard.findPreconfigureStep().should('be.enabled');

      cy.step('Verify the Tool calling card is selected on the wizard');
      modelServingWizard
        .findValidatedArgumentsSection()
        .should('be.visible', { timeout: MODEL_CATALOG_UI_TIMEOUT });
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
      modelServingWizard.findResourceNameButton().click();
      modelServingWizard
        .findResourceNameInput()
        .should('be.visible')
        .invoke('val')
        .then((val) => {
          resourceName = val as string;
        });
      modelServingWizard.selectDeploymentType(ModelDeploymentType.TYPE1);
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Verify runtime args are prefilled on the advanced settings step');
      modelServingWizard.findAdvancedOptionsStep().should('be.enabled');
      modelServingWizard
        .findRuntimeArgsTextBox()
        .invoke('val')
        .should('include', sourceData.toolCallingArg);

      cy.step('Submit deployment from review step');
      modelServingWizard.findNextButton().should('be.enabled').click();
      modelServingWizard.findSubmitButton().should('be.enabled').click();

      cy.step('Verify redirection to deployments page with new deployment');
      cy.location('pathname').should('eq', `/ai-hub/models/deployments/${projectName}`);
      modelServingGlobal.getDeploymentRow(deploymentName);

      cy.step('Verify tool calling runtime arg on the LLMInferenceService');
      cy.then(() => {
        verifyLLMInferenceServiceRuntimeArgs(projectName, resourceName, sourceData.toolCallingArg);
      });
    },
  );
});
