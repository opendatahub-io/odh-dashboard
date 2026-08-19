import * as yaml from 'js-yaml';
import { modelServingWizard } from '../../../../pages/modelServing';
import { ModelDeploymentType } from '../../../../utils/modelServingConstants';
import { modelDetailsPage } from '../../../../pages/modelCatalog/modelDetailsPage';
import type { DataScienceProjectData, ModelCatalogSourceTestData } from '../../../../types';
import { retryableBefore } from '../../../../utils/retryableHooks';
import { loadDSPFixture } from '../../../../utils/dataLoader';
import { generateTestUUID } from '../../../../utils/uuidGenerator';
import { deleteOpenShiftProject } from '../../../../utils/oc_commands/project';
import { provisionProjectForModelServing } from '../../../../utils/oc_commands/modelServing';
import {
  detectModelCatalogNamespace,
  ensureModelCatalogSourceEnabled,
  verifyModelCatalogBackend,
  waitForModelCatalogCards,
} from '../../../../utils/oc_commands/modelCatalog';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { modelCatalog } from '../../../../pages/modelCatalog/modelCatalog';

let testData: DataScienceProjectData;
let sourceData: ModelCatalogSourceTestData;
let projectName: string;
let modelName: string;
let validatedConfigurationOptionId: string;
const awsBucket = 'BUCKET_1' as const;
const uuid = generateTestUUID();

const TOOL_CALLING_FEATURE_FLAG_ON = 'toolCalling=true';
const TOOL_CALLING_FEATURE_FLAG_OFF = 'toolCalling=false';

const openWizardFromCatalogModel = (devFeatureFlags: string): void => {
  const flagsQuery = `?devFeatureFlags=${devFeatureFlags}`;

  cy.step(`Log in with toolCalling feature flag (${devFeatureFlags})`);
  cy.visitWithLogin(`/${flagsQuery}`, HTPASSWD_CLUSTER_ADMIN_USER);

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
};

const selectProjectOnPreconfigureStep = (): void => {
  cy.step('Select project on the preconfigure step');
  modelServingWizard.findModelDeploymentProjectSelector().should('exist').click();
  modelServingWizard.findModelDeploymentProjectSelectorOption(projectName).should('exist').click();
};

describe('Verify tool calling configuration in the deployment wizard', () => {
  retryableBefore(() => {
    return detectModelCatalogNamespace()
      .then((namespace) => {
        if (!namespace) {
          throw new Error(
            'model-catalog deployment was not found. Log in with oc to the cluster that serves the dashboard.',
          );
        }
        Cypress.env('MODEL_REGISTRY_NAMESPACE_OVERRIDE', namespace);
        cy.log(`Using model catalog namespace: ${namespace}`);

        return cy.fixture('e2e/modelCatalog/testSourceEnableDisable.yaml', 'utf8');
      })
      .then((yamlContent: string) => {
        sourceData = yaml.load(yamlContent) as ModelCatalogSourceTestData;
        if (!sourceData.toolCallingModelName) {
          throw new Error(
            'Set toolCallingModelName in e2e/modelCatalog/testSourceEnableDisable.yaml to a catalog card that has validated tool-calling args.',
          );
        }
        validatedConfigurationOptionId = sourceData.toolCallingLabel
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-');

        cy.step('Verify Model Catalog backend resources are available');
        verifyModelCatalogBackend();

        cy.step('Ensure the Red Hat AI validated catalog source is enabled');
        return ensureModelCatalogSourceEnabled(sourceData.redhatAiSourceId2);
      })
      .then(() => {
        return loadDSPFixture('e2e/modelCatalog/testModelCatalog.yaml').then(
          (fixtureData: DataScienceProjectData) => {
            testData = fixtureData;
            projectName = `${testData.projectResourceName}-${uuid}`;
            modelName = testData.singleModelName;

            if (!projectName) {
              throw new Error('Project name is undefined or empty in the loaded fixture');
            }
            cy.log(`Loaded project name: ${projectName}`);
            provisionProjectForModelServing(
              projectName,
              awsBucket,
              'resources/yaml/data_connection_model_serving.yaml',
            );
          },
        );
      });
  });

  after(() => {
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true, timeout: 300000 });
  });

  it(
    'should show the tool calling card and prefill runtime args on advanced settings',
    { tags: ['@Dashboard', '@ModelServing', '@ModelCatalog', '@Featureflagged'] },
    () => {
      openWizardFromCatalogModel(TOOL_CALLING_FEATURE_FLAG_ON);

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
      modelServingWizard.findModelDeploymentNameInput().clear().type(modelName);
      modelServingWizard.selectDeploymentType(ModelDeploymentType.TYPE1);
      modelServingWizard.findNextButton().should('be.enabled').click();

      cy.step('Verify runtime args are prefilled on the advanced settings step');
      modelServingWizard.findAdvancedOptionsStep().should('be.enabled');
      modelServingWizard.findRuntimeArgsCheckbox().should('be.checked');
      modelServingWizard
        .findRuntimeArgsTextBox()
        .invoke('val')
        .should('include', sourceData.toolCallingArg);

      cy.step('Discard the wizard without deploying');
      modelServingWizard.findCancelButton().click();
      modelServingWizard.findExitDeploymentDiscardButton().should('be.visible').click();
    },
  );

  it(
    'should not show the tool calling card when the toolCalling flag is disabled',
    { tags: ['@Dashboard', '@ModelServing', '@ModelCatalog', '@Featureflagged'] },
    () => {
      openWizardFromCatalogModel(TOOL_CALLING_FEATURE_FLAG_OFF);

      cy.step('Verify the wizard opened without the tool calling card');
      modelServingWizard.findPreconfigureStep().should('be.enabled');
      modelServingWizard.findValidatedArgumentsSection().should('not.exist');
      modelServingWizard
        .findValidatedConfigurationOption(validatedConfigurationOptionId)
        .should('not.exist');

      cy.step('Discard the wizard without deploying');
      modelServingWizard.findCancelButton().click();
      modelServingWizard.findExitDeploymentDiscardButton().should('be.visible').click();
    },
  );
});
