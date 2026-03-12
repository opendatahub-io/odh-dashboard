import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  FormFieldSelector,
  registerModelPage,
} from '../../../pages/modelRegistry/registerModelPage';
import { modelRegistry } from '../../../pages/modelRegistry';
import { clickRegisterModelButton } from '../../../utils/modelRegistryUtils';
import { retryableBeforeEach } from '../../../utils/retryableHooks';
import {
  checkModelRegistry,
  checkModelRegistryAvailable,
  cleanupRegisteredModelsFromDatabase,
  createAndVerifyDatabase,
  createModelRegistryViaYAML,
  deleteModelRegistry,
  deleteModelRegistryDatabase,
  ensureOperatorMemoryLimit,
} from '../../../utils/oc_commands/modelRegistry';
import { loadModelRegistryFixture } from '../../../utils/dataLoader';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { ModelRegistryTestData } from '../../../types';
import { appChrome } from '../../../pages/appChrome';
import {
  archiveVersionModal,
  modelVersionArchive,
  restoreVersionModal,
} from '../../../pages/modelRegistry/modelVersionArchive';
import {
  registerVersionPage,
  FormFieldSelector as VersionFormFieldSelector,
} from '../../../pages/modelRegistry/registerVersionPage';

describe('Verify that models and versions can be archived and restored via model registry', () => {
  let testData: ModelRegistryTestData;
  let registryName: string;
  let deploymentName: string;
  const uuid = generateTestUUID();
  const databaseName = `model-registry-db-${uuid}`;

  before(() => {
    cy.step('Load test data from fixture');
    return loadModelRegistryFixture('e2e/modelRegistry/testModelRegistry.yaml').then(
      (fixtureData) => {
        testData = fixtureData;
        registryName = `${testData.registryNamePrefix}-${uuid}`;
        deploymentName = testData.operatorDeploymentName;

        // ensure operator has optimal memory
        cy.step('Ensure operator has optimal memory for testing');
        ensureOperatorMemoryLimit(deploymentName).should('be.true');

        // Create and verify SQL database
        cy.step('Create and verify SQL database for model registry');
        createAndVerifyDatabase(databaseName).should('be.true');

        // creates a model registry
        cy.step('Create a model registry using YAML');
        createModelRegistryViaYAML(registryName, databaseName);

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
    {
      tags: ['@Dashboard', '@ModelRegistry', '@NonConcurrent', '@Sanity', '@SanitySet4'],
    },
    () => {
      cy.step('Login as an Admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry');
      appChrome
        .findNavItem({ name: 'Registry', rootSection: 'AI hub', subSection: 'Models' })
        .click();

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

      registerModelPage.findSubmitButton().should('be.enabled').click();

      cy.step('Verify the model was registered');
      cy.url().should('include', '/details');
      cy.contains(testData.objectStorageModelName, { timeout: 10000 }).should('be.visible');

      cy.step('Register version v2.0 for the same model');
      // Click on the model to view its details
      cy.contains(testData.objectStorageModelName).click();

      // Navigate to versions tab and register new version
      modelRegistry.findModelVersionsTab().click();
      modelRegistry.findRegisterNewVersionButton().click();

      // Fill in version details for v2.0
      registerVersionPage
        .findFormField(VersionFormFieldSelector.VERSION_NAME)
        .type(testData.version2Name);
      registerVersionPage
        .findFormField(VersionFormFieldSelector.VERSION_DESCRIPTION)
        .type(testData.version2Description);
      registerVersionPage
        .findFormField(VersionFormFieldSelector.SOURCE_MODEL_FORMAT)
        .type(testData.modelFormatOnnx);
      registerVersionPage
        .findFormField(VersionFormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
        .type(testData.formatVersion1_0);

      // Configure object storage location for v2.0
      registerVersionPage
        .findFormField(VersionFormFieldSelector.LOCATION_TYPE_OBJECT_STORAGE)
        .click();
      registerVersionPage
        .findFormField(VersionFormFieldSelector.LOCATION_ENDPOINT)
        .type(testData.objectStorageEndpoint);
      registerVersionPage
        .findFormField(VersionFormFieldSelector.LOCATION_BUCKET)
        .type(testData.objectStorageBucket);
      registerVersionPage
        .findFormField(VersionFormFieldSelector.LOCATION_REGION)
        .type(testData.objectStorageRegion);
      registerVersionPage
        .findFormField(VersionFormFieldSelector.LOCATION_PATH)
        .type(testData.objectStoragePathV2);

      registerVersionPage.findSubmitButton().should('be.enabled').click();

      cy.step('Verify v1.0 & v2.0 are registered');
      cy.visit(`/ai-hub/registry/${registryName}/registered-models/1/versions`);
      cy.contains(testData.version2Name, { timeout: 30000 }).should('be.visible');
      cy.contains(testData.version1Name, { timeout: 30000 }).should('be.visible');

      cy.step('Navigate to versions view');
      cy.contains(testData.objectStorageModelName).click();
      modelRegistry.findModelVersionsTab().click();

      cy.step('Archive version v1.0');
      // Find the v1.0 version row and archive it
      const modelVersionRow = modelRegistry.getModelVersionRow(testData.version1Name);
      modelVersionRow.findKebab().click();
      modelRegistry.findArchiveModelVersionAction().click({ force: true });

      // Confirm archiving in the modal
      archiveVersionModal.findArchiveButton().should('be.disabled');
      archiveVersionModal.findModalTextInput().type(testData.version1Name);
      archiveVersionModal.findArchiveButton().should('be.enabled').click();

      cy.step('Verify version v1.0 is archived');
      // Navigate to archived versions to verify
      modelRegistry.findModelVersionsTableKebab().click();
      modelRegistry.findViewArchivedVersionsAction().click();
      modelVersionArchive
        .findArchiveVersionTable()
        .contains('td', testData.version1Name, { timeout: 10000 })
        .should('be.visible');

      // Verify we're on the archived versions page
      cy.url().should('include', '/versions/archive');

      cy.step('Restore the archived version');
      // Find the archived version row and restore it
      const archivedVersionRow = modelVersionArchive.getRow(testData.version1Name);
      archivedVersionRow.findKebab().click();
      modelRegistry.findRestoreModelVersionAction().click();

      // Confirm restore in the modal
      restoreVersionModal.findRestoreButton().click();

      cy.step('Verify the version is restored');
      // Navigate back to versions and verify v1.0 is restored
      cy.visit(`/ai-hub/registry/${registryName}`);
      cy.contains(testData.objectStorageModelName).click();
      modelRegistry.findModelVersionsTab().should('be.visible').click();
      modelRegistry
        .getModelVersionRow(testData.version1Name)
        .findModelVersionName()
        .should('be.visible');
    },
  );

  after(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.step('Navigate away from model registry before cleanup');
    cy.visit('/');

    cy.step('Clean up registered models from database');
    cleanupRegisteredModelsFromDatabase([testData.objectStorageModelName], databaseName);

    cy.step('Delete the model registry');
    deleteModelRegistry(registryName);

    cy.step('Verify model registry is removed from the backend');
    checkModelRegistry(registryName).should('be.false');

    cy.step('Delete the SQL database');
    deleteModelRegistryDatabase(databaseName).should('be.true');
  });
});
