import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  FormFieldSelector,
  registerModelPage,
} from '#~/__tests__/cypress/cypress/pages/modelRegistry/registerModelPage';
import { modelRegistry } from '#~/__tests__/cypress/cypress/pages/modelRegistry';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import {
  checkModelExistsInDatabase,
  cleanupModelRegistryComponents,
  createAndVerifyDatabase,
  createAndVerifyModelRegistry,
  deleteModelRegistryDatabase,
  ensureOperatorMemoryLimit,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/modelRegistry';
import { loadModelRegistryFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';
import type { ModelRegistryTestData } from '#~/__tests__/cypress/cypress/types';
import { modelVersionDeployModal } from '#~/__tests__/cypress/cypress/pages/modelRegistry/modelVersionDeployModal';
import { clickRegisterModelButton } from '#~/__tests__/cypress/cypress/utils/modelRegistryUtils';
import { kserveModal, modelServingGlobal } from '#~/__tests__/cypress/cypress/pages/modelServing';
import { checkInferenceServiceState } from '#~/__tests__/cypress/cypress/utils/oc_commands/modelServing';
import { projectDetails } from '#~/__tests__/cypress/cypress/pages/projects';
import { createCleanProject } from '#~/__tests__/cypress/cypress/utils/projectChecker';
import { deleteOpenShiftProject } from '#~/__tests__/cypress/cypress/utils/oc_commands/project';
import { AWS_BUCKETS } from '#~/__tests__/cypress/cypress/utils/s3Buckets';

describe('Verify models can be deployed from model registry', () => {
  let testData: ModelRegistryTestData;
  let registryName: string;
  let modelName: string;
  let projectName: string;
  let deploymentName: string;
  const uuid = generateTestUUID();

  retryableBefore(() => {
    cy.step('Load test data from fixture');
    loadModelRegistryFixture('e2e/modelRegistry/testModelRegistry.yaml').then((fixtureData) => {
      testData = fixtureData;
      registryName = `${testData.registryNamePrefix}-${uuid}`;
      modelName = `${testData.objectStorageModelName}-${uuid}`;
      projectName = `${testData.deployProjectNamePrefix}-${uuid}`;
      deploymentName = testData.operatorDeploymentName;

      // ensure operator has optimal memory
      cy.step('Ensure operator has optimal memory for testing');
      ensureOperatorMemoryLimit(deploymentName).should('be.true');

      // Create and verify SQL database
      cy.step('Create and verify SQL database for model registry');
      createAndVerifyDatabase().should('be.true');

      cy.step('Create a model registry and verify it is ready');
      createAndVerifyModelRegistry(registryName);

      cy.step('Create a project for model deployment');
      createCleanProject(projectName);
    });
  });

  after(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.step('Clean up model registry components');
    cleanupModelRegistryComponents([modelName], registryName);

    cy.step('Delete the test project');
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });

    cy.step('Delete the SQL database');
    deleteModelRegistryDatabase();
  });

  it(
    'Registers a model and deploys it via model registry',
    { tags: ['@Dashboard', '@ModelRegistry', '@NonConcurrent', '@FeatureFlagged'] },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry');
      modelRegistry.navigate();

      cy.step('Select the created model registry');
      modelRegistry.findSelectModelRegistry(registryName);

      cy.step('Register a model using object storage');
      clickRegisterModelButton(30000);

      // Fill in model details for object storage
      registerModelPage.findFormField(FormFieldSelector.MODEL_NAME).type(modelName);
      registerModelPage
        .findFormField(FormFieldSelector.MODEL_DESCRIPTION)
        .type(testData.objectStorageModelDescription);
      registerModelPage.findFormField(FormFieldSelector.VERSION_NAME).type(testData.version1Name);
      registerModelPage
        .findFormField(FormFieldSelector.VERSION_DESCRIPTION)
        .type(testData.version1Description);
      registerModelPage
        .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT)
        .type(testData.modelFormatOnnx);
      registerModelPage
        .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
        .type(testData.formatVersion1_0);

      // Configure object storage location
      registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE).click();
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_ENDPOINT)
        .type(AWS_BUCKETS.BUCKET_1.ENDPOINT);
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_BUCKET)
        .type(AWS_BUCKETS.BUCKET_1.NAME);
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_REGION)
        .type(AWS_BUCKETS.BUCKET_1.REGION);
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_PATH)
        .type(testData.modelOpenVinoPath);

      registerModelPage.findSubmitButton().should('be.enabled').click();

      cy.step('Verify the model was registered');
      cy.url().should('include', '/ai-hub/registry');
      cy.contains(modelName, { timeout: 10000 }).should('be.visible');

      cy.step('Verify the model exists in the database');
      checkModelExistsInDatabase(modelName).should('be.true');

      cy.step('Navigate to model versions to deploy the model');
      cy.contains(modelName).click();
      modelRegistry.findModelVersionsTab().click();

      cy.step('Deploy the model from the versions table');
      const modelVersionRow = modelRegistry.getModelVersionRow(testData.version1Name);
      modelVersionRow.findKebabAction('Deploy').click();

      cy.step('Select the project for deployment');
      modelVersionDeployModal.selectProjectByName(projectName);

      // Configure model serving platform for the project
      cy.step('Configure model serving platform for the project');
      modelVersionDeployModal.findGoToProjectPageLink().click();

      cy.url().should('include', projectName);

      modelServingGlobal.findSingleServingModelButton().click();

      cy.step('Click deploy from registry button');
      projectDetails.findBackToRegistryButton().click();

      cy.step('Click deploy button to deploy the model');
      projectDetails.findTopLevelDeployModelButton().click();

      cy.step('Select the project for deployment');
      modelVersionDeployModal.selectProjectByName(projectName);

      cy.step('Configure the deployment');
      // Model name should be prefilled
      kserveModal.findModelNameInput().should('not.be.empty');
      kserveModal.findServingRuntimeTemplateSearchSelector().click();
      kserveModal.findGlobalScopedTemplateOption('OpenVINO Model Server').click();
      kserveModal.findModelFrameworkSelect().click();
      kserveModal.findOpenVinoOnnx().click();

      // Create a data connection for the project
      cy.step('Create a data connection for the project');
      kserveModal.findConnectionNameInput().clear().type(`${projectName}-connection`);
      kserveModal.findLocationAccessKeyInput().clear().type(AWS_BUCKETS.AWS_ACCESS_KEY_ID);
      kserveModal.findLocationSecretKeyInput().clear().type(AWS_BUCKETS.AWS_SECRET_ACCESS_KEY);
      kserveModal.findLocationEndpointInput().clear().type(AWS_BUCKETS.BUCKET_1.ENDPOINT);
      kserveModal.findLocationBucketInput().clear().type(AWS_BUCKETS.BUCKET_1.NAME);
      kserveModal.findLocationRegionInput().clear().type(AWS_BUCKETS.BUCKET_1.REGION);

      cy.step('Submit the deployment');
      kserveModal.findSubmitButton().click();

      // Check deployment status in model registry deployments view
      modelRegistry.findDeploymentsTab().click();
      cy.contains(modelName, { timeout: 30000 }).should('be.visible');
      cy.contains('Started', { timeout: 120000 }).should('be.visible');

      cy.step('Verify the model is deployed and started in backend');
      // Verify model deployment is ready
      checkInferenceServiceState(`${modelName}-v10`, projectName, { checkReady: true });
    },
  );
});
