import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  FormFieldSelector,
  registerModelPage,
} from '#~/__tests__/cypress/cypress/pages/modelRegistry/registerModelPage';
import { modelRegistry } from '#~/__tests__/cypress/cypress/pages/modelRegistry';
import { clickRegisterModelButton } from '#~/__tests__/cypress/cypress/utils/modelRegistryUtils';
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
import {
  archiveVersionModal,
  modelVersionArchive,
  restoreVersionModal,
} from '#~/__tests__/cypress/cypress/pages/modelRegistry/modelVersionArchive';
import {
  archiveModelModal,
  registeredModelArchive,
  restoreModelModal,
} from '#~/__tests__/cypress/cypress/pages/modelRegistry/registeredModelArchive';
import {
  registerVersionPage,
  FormFieldSelector as VersionFormFieldSelector,
} from '#~/__tests__/cypress/cypress/pages/modelRegistry/registerVersionPage';

describe('Verify that models and versions can be archived and restored via model registry', () => {
  let testData: RegisterModelTestData;
  let registryName: string;
  const uuid = generateTestUUID();

  before(() => {
    cy.step('Load test data from fixture');
    return loadRegisterModelFixture('e2e/modelRegistry/testRegisterModel.yaml').then(
      (fixtureData) => {
        testData = fixtureData;
        registryName = `${testData.registryNamePrefix}-${uuid}`;

        // creates a model registry
        cy.step('Create a model registry using YAML');
        createModelRegistryViaYAML(registryName);

        cy.step('Verify model registry is created');
        checkModelRegistry(registryName).should('be.true');

        cy.step('Wait for model registry to be in Available state');
        checkModelRegistryAvailable(registryName).should('be.true');
      },
    );
  });

  retryableBeforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it(
    'Registers model, adds versions, archives version, restores version, archives whole model, restores whole model',
    { tags: ['@Maintain', '@ModelRegistry', '@NonConcurrent', '@Featureflagged'] },
    () => {
      cy.step('Login as an Admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry');
      appChrome.findNavItem('Model registry', 'Models').click();

      cy.step('Select the created model registry');
      modelRegistry.findSelectModelRegistry(registryName);

      cy.step('Register a model using object storage');
      clickRegisterModelButton(30000);

      // Fill in model details
      registerModelPage
        .findFormField(FormFieldSelector.MODEL_NAME)
        .type(testData.objectStorageModelName);
      registerModelPage
        .findFormField(FormFieldSelector.MODEL_DESCRIPTION)
        .type('E2E test model using object storage');
      registerModelPage.findFormField(FormFieldSelector.VERSION_NAME).type(testData.version1Name);
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

      cy.step('Verify the model was registered');
      cy.url().should('include', '/modelRegistry');
      cy.contains(testData.objectStorageModelName, { timeout: 10000 }).should('be.visible');

      cy.step('Register version v2.0 for the same model');
      // Click on the model to view its details
      cy.contains(testData.objectStorageModelName).click();

      // Navigate to versions tab and register new version
      cy.findByTestId('model-versions-tab').click();
      cy.findByRole('button', { name: 'Register new version' }).click();

      // Fill in version details for v2.0
      registerVersionPage
        .findFormField(VersionFormFieldSelector.VERSION_NAME)
        .type(testData.version2Name);
      registerVersionPage
        .findFormField(VersionFormFieldSelector.VERSION_DESCRIPTION)
        .type('Second version of the test model');
      registerVersionPage.findFormField(VersionFormFieldSelector.SOURCE_MODEL_FORMAT).type('onnx');
      registerVersionPage
        .findFormField(VersionFormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
        .type('1.0');

      // Configure object storage location for v2.0
      registerVersionPage
        .findFormField(VersionFormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE)
        .click();
      registerVersionPage
        .findFormField(VersionFormFieldSelector.LOCATION_ENDPOINT)
        .type('http://minio.example.com:9000');
      registerVersionPage
        .findFormField(VersionFormFieldSelector.LOCATION_BUCKET)
        .type('test-models');
      registerVersionPage.findFormField(VersionFormFieldSelector.LOCATION_REGION).type('us-east-1');
      registerVersionPage
        .findFormField(VersionFormFieldSelector.LOCATION_PATH)
        .type('models/test-model/v2.0');

      registerVersionPage.findSubmitButton().click();

      cy.step('Verify v1.0 & v2.0 are registered');
      cy.contains(testData.version2Name, { timeout: 10000 }).should('be.visible');
      cy.contains(testData.version1Name, { timeout: 10000 }).should('be.visible');

      cy.step('Archive version v1.0');
      // Find the v1.0 version row and archive it
      const modelVersionRow = modelRegistry.getModelVersionRow(testData.version1Name);
      modelVersionRow.findKebabAction('Archive model version').click();

      // Confirm archiving in the modal
      archiveVersionModal.findArchiveButton().should('be.disabled');
      archiveVersionModal.findModalTextInput().type(testData.version1Name);
      archiveVersionModal.findArchiveButton().should('be.enabled').click();

      cy.step('Verify version v1.0 is archived');
      // Navigate to archived versions to verify
      modelRegistry
        .findModelVersionsTableKebab()
        .findDropdownItem('View archived versions')
        .click();
      modelVersionArchive
        .findArchiveVersionTable()
        .contains('td', testData.version1Name, { timeout: 10000 })
        .should('be.visible');

      // Verify we're on the archived versions page
      cy.url().should('include', '/versions/archive');

      cy.step('Restore the archived version');
      // Find the archived version row and restore it
      const archivedVersionRow = modelVersionArchive.getRow(testData.version1Name);
      archivedVersionRow.findKebabAction('Restore model version').click();

      // Confirm restore in the modal
      restoreVersionModal.findRestoreButton().click();

      cy.step('Verify the version is restored');
      // Navigate back to versions and verify v1.0 is restored
      cy.visit(`/modelRegistry/${registryName}`);
      cy.contains(testData.objectStorageModelName).click();
      cy.findByTestId('model-versions-tab').click();
      modelRegistry
        .getModelVersionRow(testData.version1Name)
        .findModelVersionName()
        .should('be.visible');

      cy.step('Navigate back to model registry to archive the whole model');
      cy.visit(`/modelRegistry/${registryName}`);

      cy.step('Archive the entire model');
      // Find the model row and archive it
      const modelRow = modelRegistry.getRow(testData.objectStorageModelName);
      modelRow.findKebabAction('Archive model').click();

      // Type the model name to confirm and click archive
      archiveModelModal.findModalTextInput().type(testData.objectStorageModelName);
      archiveModelModal.findArchiveButton().click();

      cy.step('Verify the model is archived');
      // Navigate to archived models to verify
      cy.findByTestId('registered-models-table-kebab-action')
        .findDropdownItem('View archived models')
        .click();
      registeredModelArchive
        .findArchiveModelTable()
        .contains('td', testData.objectStorageModelName, { timeout: 10000 })
        .should('be.visible');

      // Verify we're on the archived models page
      cy.url().should('include', '/registeredModels/archive');

      cy.step('Restore the archived model');
      // Find the archived model row and restore it
      const archivedModelRow = registeredModelArchive.getRow(testData.objectStorageModelName);
      archivedModelRow.findKebabAction('Restore model').click();

      // Confirm restore in the modal
      restoreModelModal.findRestoreButton().click();

      cy.step('Verify the model is restored');
      // Navigate back to models and verify the model is restored
      cy.visit(`/modelRegistry/${registryName}`);
      modelRegistry.getRow(testData.objectStorageModelName).findName().should('be.visible');
    },
  );

  after(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.step('Clean up registered models from database');
    cleanupRegisteredModelsFromDatabase([testData.objectStorageModelName]);

    cy.step('Delete the model registry');
    deleteModelRegistry(registryName);

    cy.step('Verify model registry is removed from the backend');
    checkModelRegistry(registryName).should('be.false');
  });
});
