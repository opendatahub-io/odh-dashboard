import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  FormFieldSelector,
  registerModelPage,
} from '#~/__tests__/cypress/cypress/pages/modelRegistry/registerModelPage';
import {
  FormFieldSelector as VersionFormFieldSelector,
  registerVersionPage,
} from '#~/__tests__/cypress/cypress/pages/modelRegistry/registerVersionPage';
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
      modelRegistry.findSelectModelRegistry(registryName);

      cy.step('Register a model using object storage');
      modelRegistry.findRegisterModelButton(30000).click();

      // Fill in model details for object storage
      registerModelPage
        .findFormField(FormFieldSelector.MODEL_NAME)
        .type(testData.objectStorageModelName);
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
        .type(testData.objectStorageEndpoint);
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_BUCKET)
        .type(testData.objectStorageBucket);
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_REGION)
        .type(testData.objectStorageRegion);
      registerModelPage
        .findFormField(FormFieldSelector.LOCATION_PATH)
        .type(testData.objectStoragePath);

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
        .type(testData.uriModelDescription);
      registerModelPage.findFormField(FormFieldSelector.VERSION_NAME).type(testData.version1Name);
      registerModelPage
        .findFormField(FormFieldSelector.VERSION_DESCRIPTION)
        .type(testData.uriVersion1Description);
      registerModelPage
        .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT)
        .type(testData.modelFormatPytorch);
      registerModelPage
        .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
        .type(testData.formatVersion2_0);

      // Configure URI location
      registerModelPage.findFormField(FormFieldSelector.LOCATION_TYPE_URI).click();
      registerModelPage.findFormField(FormFieldSelector.LOCATION_URI).type(testData.uriPrimary);

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

  it(
    'Registers a new version via versions view',
    { tags: ['@Maintain', '@ModelRegistry', '@NonConcurrent'] },
    () => {
      cy.step('Login as an Admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry');
      appChrome.findNavItem('Model registry', 'Models').click();

      cy.step('Select the created model registry');
      modelRegistry.findSelectModelRegistry(registryName);

      cy.step('Navigate to the first registered model');
      cy.contains(testData.objectStorageModelName).click();

      cy.step('Navigate to versions tab');
      cy.findByTestId('model-versions-tab').click();

      cy.step('Click Register new version button');
      modelRegistry.findRegisterNewVersionButton().click();

      cy.step('Fill in version details');
      registerVersionPage
        .findFormField(VersionFormFieldSelector.VERSION_NAME)
        .type(testData.version2Name);
      registerVersionPage
        .findFormField(VersionFormFieldSelector.VERSION_DESCRIPTION)
        .type(testData.version2Description);
      registerVersionPage
        .findFormField(VersionFormFieldSelector.SOURCE_MODEL_FORMAT)
        .type(testData.modelFormatTensorflow);
      registerVersionPage
        .findFormField(VersionFormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
        .type(testData.formatVersion3_0);

      cy.step('Configure URI location for the new version');
      registerVersionPage.findFormField(VersionFormFieldSelector.LOCATION_TYPE_URI).click();
      registerVersionPage
        .findFormField(VersionFormFieldSelector.LOCATION_URI)
        .type(testData.uriVersion2);

      cy.step('Submit the new version');
      registerVersionPage.findSubmitButton().click();

      cy.step('Verify the new version was registered');
      cy.url().should('include', '/versions');
      cy.contains(testData.version2Name, { timeout: 10000 }).should('be.visible');

      cy.step('Verify both versions are now visible');
      cy.contains(testData.version1Name, { timeout: 10000 }).should('be.visible');
      cy.contains(testData.version2Name, { timeout: 10000 }).should('be.visible');
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
