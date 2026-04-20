import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  FormFieldSelector,
  registerModelPage,
} from '../../../pages/modelRegistry/registerModelPage';
import { modelRegistry } from '../../../pages/modelRegistry';
import { registeredModelDetails } from '../../../pages/modelRegistry/registeredModelDetails';
import { modelVersionDetails } from '../../../pages/modelRegistry/modelVersionDetails';
import { retryableBeforeEach } from '../../../utils/retryableHooks';
import {
  checkModelCustomPropertiesInDatabase,
  checkModelExistsInDatabase,
  checkModelRegistry,
  checkModelRegistryAvailable,
  cleanupRegisteredModelsFromDatabase,
  createAndVerifyDatabase,
  createModelRegistryViaYAML,
  deleteModelRegistry,
  deleteModelRegistryDatabase,
  ensureOperatorMemoryLimit,
  checkVersionCustomPropertiesInDatabase,
} from '../../../utils/oc_commands/modelRegistry';
import { loadModelRegistryFixture } from '../../../utils/dataLoader';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { ModelRegistryTestData } from '../../../types';
import { clickRegisterModelButton } from '../../../utils/modelRegistryUtils';

describe('Verify custom properties and labels are retained during Model Registry operations', () => {
  let testData: ModelRegistryTestData;
  let registryName: string;
  let modelName: string;
  let deploymentName: string;
  const uuid = generateTestUUID();
  const databaseName = `props-db-${uuid}`;

  let modelCustomPropertyKeys: string[];
  let versionCustomPropertyKeys: string[];
  let allVersionProperties: { key: string; value: string }[];
  let extendedVersionPropertyKeys: string[];

  before(() => {
    cy.step('Load test data from fixture');
    loadModelRegistryFixture('e2e/modelRegistry/testRetainCustomProperties.yaml').then(
      (fixtureData) => {
        testData = fixtureData;
        registryName = `${testData.registryNamePrefix}-${uuid}`;
        modelName = `${testData.modelNamePrefix}-${uuid}`;
        deploymentName = testData.operatorDeploymentName;

        modelCustomPropertyKeys = testData.modelCustomProperties.map((prop) => prop.key);
        versionCustomPropertyKeys = testData.versionCustomProperties.map((prop) => prop.key);
        allVersionProperties = [
          ...testData.versionCustomProperties,
          { key: testData.newVersionPropertyKey, value: testData.newVersionPropertyValue },
        ];
        extendedVersionPropertyKeys = allVersionProperties.map((p) => p.key);

        cy.step('Ensure operator has optimal memory for testing');
        ensureOperatorMemoryLimit(deploymentName).should('be.true');

        cy.step('Create and verify SQL database for model registry');
        createAndVerifyDatabase(databaseName).should('be.true');

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
    'Retains custom properties across all model registry operations',
    {
      tags: ['@Dashboard', '@ModelRegistry', '@Sanity', '@SanitySet4'],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry');
      modelRegistry.visit(registryName);

      cy.step('Register a model with basic details');
      clickRegisterModelButton(30000);

      registerModelPage.findFormField(FormFieldSelector.MODEL_NAME).type(modelName);
      registerModelPage
        .findFormField(FormFieldSelector.MODEL_DESCRIPTION)
        .type(testData.modelDescription);
      registerModelPage.findFormField(FormFieldSelector.VERSION_NAME).type(testData.versionName);
      registerModelPage
        .findFormField(FormFieldSelector.VERSION_DESCRIPTION)
        .type(testData.versionDescription);
      registerModelPage
        .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT)
        .type(testData.sourceModelFormat);
      registerModelPage
        .findFormField(FormFieldSelector.SOURCE_MODEL_FORMAT_VERSION)
        .type(testData.sourceModelFormatVersion);

      cy.step('Configure object storage location');
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
      cy.contains(modelName, { timeout: 10000 }).should('be.visible');

      cy.step('Verify the model exists in the database');
      checkModelExistsInDatabase(modelName, databaseName).should('be.true');

      cy.step('Navigate to model details page to add model properties');
      modelRegistry.visit(registryName);
      cy.contains(modelName).click();

      cy.step('Add custom properties to the registered model');
      testData.modelCustomProperties.forEach((prop) => {
        registeredModelDetails.ensurePropertiesExpanded();
        registeredModelDetails.findAddPropertyButton().click();
        registeredModelDetails.findPropertyKeyInput().type(prop.key);
        registeredModelDetails.findPropertyValueInput().type(prop.value);
        registeredModelDetails.findSavePropertyButton().click();
        registeredModelDetails.findPropertyKeyInput().should('not.exist');
      });

      cy.step('Verify model custom properties are visible in UI');
      registeredModelDetails.ensurePropertiesExpanded();
      testData.modelCustomProperties.forEach((prop) => {
        registeredModelDetails.shouldHaveCustomProperty(prop.key, prop.value);
      });

      cy.step('Verify model custom properties exist in database');
      checkModelCustomPropertiesInDatabase(modelName, databaseName, modelCustomPropertyKeys).should(
        'be.true',
      );

      cy.step('Navigate to version to add version custom properties');
      modelRegistry.findModelVersionsTab().should('be.visible').click();
      modelRegistry.findModelVersionsTable().should('be.visible');
      modelRegistry
        .getModelVersionRow(testData.versionName)
        .findModelVersionName()
        .find('a')
        .click();

      cy.step('Add custom properties to the model version');
      testData.versionCustomProperties.forEach((prop) => {
        modelVersionDetails.findAddPropertyButton().scrollIntoView().click();
        modelVersionDetails.findPropertyKeyInput().type(prop.key);
        modelVersionDetails.findPropertyValueInput().type(prop.value);
        modelVersionDetails.findSavePropertyButton().click();
        modelVersionDetails.findPropertiesExpandableSection().should('be.visible');
      });

      cy.step('Verify version custom properties are visible in UI');
      testData.versionCustomProperties.forEach((prop) => {
        modelVersionDetails.shouldHaveCustomProperty(prop.key, prop.value);
      });

      cy.step('Verify version custom properties exist in database');
      checkVersionCustomPropertiesInDatabase(
        testData.versionName,
        databaseName,
        versionCustomPropertyKeys,
      ).should('be.true');

      cy.step('Add a new custom property to the version');
      modelVersionDetails.addCustomProperty(
        testData.newVersionPropertyKey,
        testData.newVersionPropertyValue,
      );

      cy.step('Verify new property was added');
      modelVersionDetails.shouldHaveCustomProperty(
        testData.newVersionPropertyKey,
        testData.newVersionPropertyValue,
      );

      cy.step('Navigate back to model and verify model properties are intact');
      modelRegistry.findModelVersionBreadcrumbItem().click();

      registeredModelDetails.ensurePropertiesExpanded();
      testData.modelCustomProperties.forEach((prop) => {
        registeredModelDetails.shouldHaveCustomProperty(prop.key, prop.value);
      });

      cy.step('Navigate to version and verify all version properties are intact');
      modelRegistry.findModelVersionsTab().click();
      modelRegistry
        .getModelVersionRow(testData.versionName)
        .findModelVersionName()
        .find('a')
        .click();
      cy.url().should('include', '/details');

      allVersionProperties.forEach((prop) => {
        modelVersionDetails.shouldHaveCustomProperty(prop.key, prop.value);
      });

      cy.step('Verify in database that both model and version properties are retained');
      checkModelCustomPropertiesInDatabase(modelName, databaseName, modelCustomPropertyKeys).should(
        'be.true',
      );
      checkVersionCustomPropertiesInDatabase(
        testData.versionName,
        databaseName,
        extendedVersionPropertyKeys,
      ).should('be.true');
    },
  );

  after(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.step('Navigate away from model registry before cleanup');
    cy.visit('/');

    cy.step('Clean up registered models from database');
    cleanupRegisteredModelsFromDatabase([modelName], databaseName);

    cy.step('Delete the model registry');
    deleteModelRegistry(registryName);

    cy.step('Verify model registry is removed from the backend');
    checkModelRegistry(registryName).should('be.false');

    cy.step('Delete the SQL database');
    deleteModelRegistryDatabase(databaseName).should('be.true');
  });
});
