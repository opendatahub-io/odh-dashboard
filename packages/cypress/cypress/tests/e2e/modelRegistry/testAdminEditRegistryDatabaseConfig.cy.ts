import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { retryableBeforeEach } from '../../../utils/retryableHooks';
import {
  checkModelRegistry,
  checkModelRegistryAvailable,
  createAndVerifyDatabase,
  createAndVerifyModelRegistry,
  deleteModelRegistry,
  deleteModelRegistryDatabase,
  ensureOperatorMemoryLimit,
  getModelRegistryDatabaseConfig,
} from '../../../utils/oc_commands/modelRegistry';
import { loadModelRegistryFixture } from '../../../utils/dataLoader';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { ModelRegistryTestData } from '../../../types';
import {
  modelRegistrySettings,
  FormFieldSelector as SettingsFormFieldSelector,
} from '../../../pages/modelRegistrySettings';

describe('Verify that admin users can edit model registry database configuration', () => {
  let testData: ModelRegistryTestData;
  let registryName: string;
  let originalRegistryName: string;
  let deploymentName: string;
  let databaseName: string;
  let newDatabaseHost: string;
  let newDatabasePort: string;
  let newDatabaseName: string;
  let newDatabaseUsername: string;
  let newDatabasePassword: string;
  const uuid = generateTestUUID();

  before(() => {
    cy.step('Load test data from fixture');
    loadModelRegistryFixture('e2e/modelRegistry/testModelRegistry.yaml').then((fixtureData) => {
      testData = fixtureData;
      registryName = `${testData.registryNamePrefix}-${uuid}`;
      originalRegistryName = registryName;
      deploymentName = testData.operatorDeploymentName;
      databaseName = testData.databaseName;
      newDatabaseHost = testData.newDatabaseHost;
      newDatabasePort = testData.newDatabasePort;
      newDatabaseName = testData.newDatabaseName;
      newDatabaseUsername = testData.newDatabaseUsername;
      newDatabasePassword = testData.newDatabasePassword;

      cy.step('Ensure operator has optimal memory for testing');
      ensureOperatorMemoryLimit(deploymentName).should('be.true');

      cy.step('Create and verify SQL database for model registry');
      createAndVerifyDatabase(databaseName).should('be.true');

      cy.step('Create a model registry and verify it is ready');
      createAndVerifyModelRegistry(registryName, databaseName);

      cy.step('Wait for model registry to be in Available state');
      checkModelRegistryAvailable(registryName).should('be.true');
    });
  });

  retryableBeforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it(
    'Edits database configuration fields and verifies backend persistence',
    {
      tags: [
        '@Dashboard',
        '@ModelRegistry',
        '@Sanity',
        '@SanitySet4',
        '@NonConcurrent',
        '@DatabaseConfig',
      ],
    },
    () => {
      cy.step('Login as an Admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry Settings');
      modelRegistrySettings.navigate();

      cy.step('Verify original database configuration in backend');
      getModelRegistryDatabaseConfig(registryName).then((config) => {
        expect(config.host).to.equal(databaseName);
        expect(config.port).to.equal(3306);
        expect(config.database).to.equal('model_registry');
        expect(config.username).to.equal('mlmduser');
        expect(config.passwordSecret.name).to.equal(databaseName);
        expect(config.passwordSecret.key).to.equal('database-password');
        cy.log('✅ Original database configuration verified in backend');
      });

      cy.step('Find and edit the model registry');
      modelRegistrySettings
        .findModelRegistryRow(registryName)
        .findKebabAction('Edit model registry')
        .click();

      cy.step('Verify the current database values are loaded in the form');
      modelRegistrySettings
        .findFormField(SettingsFormFieldSelector.HOST)
        .should('have.value', databaseName);
      modelRegistrySettings
        .findFormField(SettingsFormFieldSelector.PORT)
        .should('have.value', '3306');
      modelRegistrySettings
        .findFormField(SettingsFormFieldSelector.DATABASE)
        .should('have.value', 'model_registry');
      modelRegistrySettings
        .findFormField(SettingsFormFieldSelector.USERNAME)
        .should('have.value', 'mlmduser');

      cy.step('Modify database configuration fields');

      // Update host
      modelRegistrySettings
        .findFormField(SettingsFormFieldSelector.HOST)
        .clear()
        .type(newDatabaseHost);

      // Update port
      modelRegistrySettings
        .findFormField(SettingsFormFieldSelector.PORT)
        .clear()
        .type(newDatabasePort);

      // Update database name
      modelRegistrySettings
        .findFormField(SettingsFormFieldSelector.DATABASE)
        .clear()
        .type(newDatabaseName);

      // Update username
      modelRegistrySettings
        .findFormField(SettingsFormFieldSelector.USERNAME)
        .clear()
        .type(newDatabaseUsername);

      // Update password
      modelRegistrySettings
        .findFormField(SettingsFormFieldSelector.PASSWORD)
        .clear()
        .type(newDatabasePassword);

      cy.step('Submit the database configuration changes');
      modelRegistrySettings.findSubmitButton().should('be.enabled');
      modelRegistrySettings.findSubmitButton().click();

      // Wait for the modal to close
      modelRegistrySettings.findSubmitButton().should('not.exist');

      cy.step('Verify database configuration changes persisted in backend');
      getModelRegistryDatabaseConfig(registryName).then((config) => {
        expect(config.host).to.equal(newDatabaseHost);
        expect(config.port).to.equal(parseInt(newDatabasePort, 10));
        expect(config.database).to.equal(newDatabaseName);
        expect(config.username).to.equal(newDatabaseUsername);
        // Password secret should remain the same (still references original secret)
        expect(config.passwordSecret.name).to.equal(databaseName);
        expect(config.passwordSecret.key).to.equal('database-password');
        cy.log('✅ Updated database configuration verified in backend');
      });

      cy.step('Verify updated configuration is displayed in the UI');
      modelRegistrySettings
        .findModelRegistryRow(registryName)
        .findKebabAction('Edit model registry')
        .click();

      // Verify the updated values are shown when reopening the edit form
      modelRegistrySettings
        .findFormField(SettingsFormFieldSelector.HOST)
        .should('have.value', newDatabaseHost);
      modelRegistrySettings
        .findFormField(SettingsFormFieldSelector.PORT)
        .should('have.value', newDatabasePort);
      modelRegistrySettings
        .findFormField(SettingsFormFieldSelector.DATABASE)
        .should('have.value', newDatabaseName);
      modelRegistrySettings
        .findFormField(SettingsFormFieldSelector.USERNAME)
        .should('have.value', newDatabaseUsername);
      // Note: Password field is not verified as it's typically cleared for security
      // The password secret reference is verified in the backend validation above

      cy.log('✅ Updated database configuration verified in UI form');

      // Close the modal
      modelRegistrySettings.findCancelButton().click();
    },
  );

  after(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.step('Navigate away from model registry before cleanup');
    cy.visit('/');

    cy.step('Delete the model registry');
    deleteModelRegistry(originalRegistryName);

    cy.step('Verify model registry is removed from the backend');
    checkModelRegistry(originalRegistryName).should('be.false');

    cy.step('Delete the SQL database');
    deleteModelRegistryDatabase(databaseName).should('be.true');
  });
});
