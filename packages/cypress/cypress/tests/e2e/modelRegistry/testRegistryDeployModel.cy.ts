import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  FormFieldSelector,
  registerModelPage,
} from '../../../pages/modelRegistry/registerModelPage';
import { modelRegistry } from '../../../pages/modelRegistry';
import { retryableBefore } from '../../../utils/retryableHooks';
import {
  checkModelExistsInDatabase,
  cleanupModelRegistryComponents,
  createAndVerifyDatabase,
  createAndVerifyModelRegistry,
  deleteModelRegistryDatabase,
  ensureOperatorMemoryLimit,
} from '../../../utils/oc_commands/modelRegistry';
import { loadModelRegistryFixture } from '../../../utils/dataLoader';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { ModelRegistryTestData } from '../../../types';
import { modelVersionDeployModal } from '../../../pages/modelRegistry/modelVersionDeployModal';
import { clickRegisterModelButton } from '../../../utils/modelRegistryUtils';
import { modelServingWizard } from '../../../pages/modelServing';
import { checkInferenceServiceState } from '../../../utils/oc_commands/modelServing';
import { createCleanProject } from '../../../utils/projectChecker';
import { deleteOpenShiftProject } from '../../../utils/oc_commands/project';
import { AWS_BUCKETS } from '../../../utils/s3Buckets';

describe('[Product Bug: RHOAIENG-41476] Verify models can be deployed from model registry', () => {
  let testData: ModelRegistryTestData;
  let registryName: string;
  let modelName: string;
  let projectName: string;
  let deploymentName: string;
  const uuid = generateTestUUID();
  const databaseName = `model-registry-db-${uuid}`;

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
      createAndVerifyDatabase(databaseName).should('be.true');

      cy.step('Create a model registry and verify it is ready');
      createAndVerifyModelRegistry(registryName, databaseName);

      cy.step('Create a project for model deployment');
      createCleanProject(projectName);
    });
  });

  after(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.step('Navigate away from model registry before cleanup');
    cy.visit('/');

    cy.step('Clean up model registry components');
    cleanupModelRegistryComponents([modelName], registryName, databaseName);

    cy.step('Delete the test project');
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });

    cy.step('Delete the SQL database');
    deleteModelRegistryDatabase(databaseName).should('be.true');
  });

  it(
    'Registers a model and deploys it via model registry',
    {
      tags: ['@Dashboard', '@ModelRegistry', '@NonConcurrent', '@Sanity', '@SanitySet4', '@Bug'],
    },
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
      cy.url().should('include', '/details');
      cy.contains(modelName, { timeout: 10000 }).should('be.visible');

      cy.step('Verify the model exists in the database');
      checkModelExistsInDatabase(modelName, databaseName).should('be.true');

      cy.step('Navigate to model versions to deploy the model');
      cy.contains(modelName).click();
      modelRegistry.findModelVersionsTab().click();

      cy.step('Deploy the model from the versions table');
      const modelVersionRow = modelRegistry.getModelVersionRow(testData.version1Name);
      modelVersionRow.findKebabAction('Deploy').click();

      cy.step('Select the project for deployment');
      modelVersionDeployModal.selectProjectByName(projectName);
      modelVersionDeployModal.findDeployButton().click();

      cy.step('Configure the deployment');
      cy.step('Model details');
      // connection data should be prefilled
      modelServingWizard.findModelLocationSelect().should('contain.text', 'S3 object storage');
      modelServingWizard.findLocationAccessKeyInput().clear().type(AWS_BUCKETS.AWS_ACCESS_KEY_ID);
      modelServingWizard
        .findLocationSecretKeyInput()
        .clear()
        .type(AWS_BUCKETS.AWS_SECRET_ACCESS_KEY);
      modelServingWizard
        .findLocationEndpointInput()
        .should('have.value', AWS_BUCKETS.BUCKET_1.ENDPOINT);
      modelServingWizard.findLocationBucketInput().should('have.value', AWS_BUCKETS.BUCKET_1.NAME);
      modelServingWizard
        .findLocationRegionInput()
        .should('have.value', AWS_BUCKETS.BUCKET_1.REGION);
      modelServingWizard.findLocationPathInput().should('have.value', testData.modelOpenVinoPath);
      modelServingWizard.findSaveConnectionCheckbox().should('be.checked');
      modelServingWizard.findSaveConnectionInput().clear().type(`${projectName}-connection`);
      modelServingWizard.findModelTypeSelectOption('Predictive model').click();
      modelServingWizard.findNextButton().click();

      cy.step('Model deployment');
      //model name should be prefilled
      modelServingWizard
        .findModelDeploymentNameInput()
        .should('have.value', `${modelName} - ${testData.version1Name}`);
      modelServingWizard.findModelFormatSelectOption('openvino_ir - opset13').click();
      modelServingWizard.findNextButton().click();

      cy.step('Advanced settings');
      modelServingWizard.findNextButton().click();

      cy.step('Review');
      modelServingWizard.findSubmitButton().click();
      modelRegistry
        .getInferenceServiceRow(`${modelName} - ${testData.version1Name}`)
        .should('be.visible');

      // Verify model deployment is ready
      cy.step('Verify the model is deployed and started in backend');
      checkInferenceServiceState(`${modelName}-v10`, projectName, { checkReady: true });
      // Check deployment link and verify status in deployments view
      modelRegistry.navigate();
      cy.contains('1 deployment', { timeout: 30000 }).should('be.visible').click();
      cy.contains(modelName).should('be.visible');
      cy.contains('Started').should('be.visible');
    },
  );
});
