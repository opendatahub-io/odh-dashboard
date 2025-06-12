import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  FormFieldSelector,
  registerModelPage,
} from '#~/__tests__/cypress/cypress/pages/modelRegistry/registerModelPage';
import { modelRegistry } from '#~/__tests__/cypress/cypress/pages/modelRegistry';
import { retryableBeforeEach } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import {
  checkModelRegistry,
  checkModelRegistryAvailable,
  cleanupRegisteredModelsFromDatabase,
  createModelRegistryViaYAML,
  deleteModelRegistry,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/modelRegistry';
import { loadRegisterModelFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';
import type { RegisterModelTestData } from '#~/__tests__/cypress/cypress/types';
import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';

describe('Verify models can be registered in a model registry', () => {
  let testData: RegisterModelTestData;
  let registryName: string;
  const uuid = generateTestUUID();

  before(() => {
    cy.step('Load test data from fixture');
    loadRegisterModelFixture('e2e/modelRegistry/testRegisterModel.yaml').then((fixtureData) => {
      testData = fixtureData;
      registryName = `${testData.registryNamePrefix}-${uuid}`;

      // creates a model registry
      cy.step('Create a model registry using YAML');
      createModelRegistryViaYAML(registryName);

      cy.step('Verify model registry is created');
      checkModelRegistry(registryName).should('be.true');

      cy.step('Wait for model registry to be in Available state');
      checkModelRegistryAvailable(registryName).should('be.true');
    });
  });

  retryableBeforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it(
    'Registers models via model registry using object storage and URI',
    { tags: ['@Maintain', '@ModelRegistry', '@NonConcurrent'] },
    () => {
      cy.step('Login as an Admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry');
      appChrome.findNavItem('Model registry', 'Models').click();

      cy.step('Select the created model registry');
      modelRegistry.findModelRegistry().click();
      cy.findByTestId(registryName).click();

      cy.step('Register a model using object storage');
      modelRegistry.findRegisterModelButton().click();

      // Fill in model details for object storage
      registerModelPage
        .findFormField(FormFieldSelector.MODEL_NAME)
        .type(testData.objectStorageModelName);
      registerModelPage
        .findFormField(FormFieldSelector.MODEL_DESCRIPTION)
        .type('E2E test model using object storage');
      registerModelPage.findFormField(FormFieldSelector.VERSION_NAME).type('v1.0');
      registerModelPage
        .findFormField(FormFieldSelector.VERSION_DESCRIPTION)
        .type('First version of the test model');
      registerModelPage.findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT).type('onnx');
      registerModelPage.findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION).type('1.0');

      // Configure object storage location
      registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE).click();
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_ENDPOINT)
        .type('http://minio.example.com:9000');
      registerModelPage.findFormField(FormFieldSelector.LOCATION_BUCKET).type('test-models');
      registerModelPage.findFormField(FormFieldSelector.LOCATION_REGION).type('us-east-1');
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_PATH)
        .type('models/test-model/v1.0');

      registerModelPage.findSubmitButton().click();

      cy.step('Verify the object storage model was registered');
      cy.url().should('include', '/modelRegistry');
      cy.contains(testData.objectStorageModelName, { timeout: 10000 }).should('be.visible');

      cy.step('Navigate back to register another model using direct URL');
      registerModelPage.visitWithRegistry(registryName);

      cy.step('Register a model using URI');
      // Fill in model details for URI
      registerModelPage.findFormField(FormFieldSelector.MODEL_NAME).type(testData.uriModelName);
      registerModelPage
        .findFormField(FormFieldSelector.MODEL_DESCRIPTION)
        .type('E2E test model using URI');
      registerModelPage.findFormField(FormFieldSelector.VERSION_NAME).type('v1.0');
      registerModelPage
        .findFormField(FormFieldSelector.VERSION_DESCRIPTION)
        .type('First version of the URI test model');
      registerModelPage.findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT).type('pytorch');
      registerModelPage.findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION).type('2.0');

      // Configure URI location
      registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_URI).click();
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_URI)
        .type(
          's3://test-bucket/models/pytorch-model?endpoint=http%3A%2F%2Fminio.example.com%3A9000&defaultRegion=us-east-1',
        );

      registerModelPage.findSubmitButton().click();

      cy.step('Verify the URI model was registered');
      cy.url().should('include', '/modelRegistry');
      cy.contains(testData.uriModelName, { timeout: 10000 }).should('be.visible');

      cy.step('Navigate back to model registry to verify both models');
      cy.visitWithLogin(`/modelRegistry/${registryName}`, HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Verify both models are visible in the registry');
      cy.contains(testData.objectStorageModelName, { timeout: 10000 }).should('be.visible');
      cy.contains(testData.uriModelName, { timeout: 10000 }).should('be.visible');
    },
  );

  after(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.step('Clean up registered models from database');
    cleanupRegisteredModelsFromDatabase([testData.objectStorageModelName, testData.uriModelName]);

    cy.step('Delete the model registry');
    deleteModelRegistry(registryName);

    cy.step('Verify model registry is removed from the backend');
    checkModelRegistry(registryName).should('be.false');
  });
});
