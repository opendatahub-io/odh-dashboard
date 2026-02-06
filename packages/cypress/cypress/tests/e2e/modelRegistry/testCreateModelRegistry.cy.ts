import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  DatabaseType,
  FormFieldSelector,
  modelRegistrySettings,
} from '../../../pages/modelRegistrySettings';
import { retryableBeforeEach } from '../../../utils/retryableHooks';
import {
  checkDefaultDatabaseExists,
  checkModelRegistry,
  createAndVerifyDatabase,
  createAndVerifyPostgresDatabase,
  deleteModelRegistry,
  deleteModelRegistryDatabase,
  deletePostgresDatabase,
  ensureOperatorMemoryLimit,
  waitForDefaultDatabase,
} from '../../../utils/oc_commands/modelRegistry';
import { loadModelRegistryFixture } from '../../../utils/dataLoader';
import type { ModelRegistryTestData } from '../../../types';

describe('Verify a model registry can be created and deleted', () => {
  let testData: ModelRegistryTestData;
  let deploymentName: string;
  let registryName: string;
  const sqlDbName = `mysql-db-registry-${Date.now()}`;
  const postgresDbName = `postgres-db-registry-${Date.now()}`;
  const postgresRegistryName = `postgres-registry-${Date.now()}`;
  const defaultDbName = `default-db-registry-${Date.now()}`;

  before(() => {
    cy.step('Load test data from fixture');
    loadModelRegistryFixture('e2e/modelRegistry/testModelRegistry.yaml').then((fixtureData) => {
      testData = fixtureData;
      registryName = testData.createRegistryName;
      deploymentName = testData.operatorDeploymentName;

      // ensure operator has optimal memory
      cy.step('Ensure operator has optimal memory for testing');
      ensureOperatorMemoryLimit(deploymentName).should('be.true');

      // Create and verify SQL database
      cy.step('Create and verify SQL database for model registry');
      createAndVerifyDatabase(sqlDbName).should('be.true');

      // Create and verify PostgreSQL database
      cy.step('Create and verify PostgreSQL database for model registry');
      createAndVerifyPostgresDatabase(postgresDbName).should('be.true');
    });
  });

  retryableBeforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it(
    'Creates a model registry with mysql database and then deletes it',
    {
      tags: ['@Dashboard', '@ModelRegistry', '@Smoke', '@SmokeSet4', '@NonConcurrent'],
    },
    () => {
      cy.step('Login as an Admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry Settings');
      modelRegistrySettings.visit();

      cy.step('Create a model registry with mysql database');
      modelRegistrySettings.findCreateButton().click();
      modelRegistrySettings.findFormField(FormFieldSelector.NAME).type(registryName);
      modelRegistrySettings.findDatabaseSourceExternalRadio().click();
      modelRegistrySettings.findFormField(FormFieldSelector.HOST).type(sqlDbName);
      modelRegistrySettings.findFormField(FormFieldSelector.USERNAME).type('mlmduser');
      modelRegistrySettings.findFormField(FormFieldSelector.PASSWORD).type('TheBlurstOfTimes');
      modelRegistrySettings.findSubmitButton().click();

      cy.step('Verify it is available in the UI');
      modelRegistrySettings.findModelRegistryRow(registryName).should('exist');
      modelRegistrySettings
        .findModelRegistryRow(registryName)
        .contains('Available', { timeout: 120000 })
        .should('be.visible');

      cy.step('Verify model registry is created on the backend');
      checkModelRegistry(registryName).should('be.true');

      cy.step('Delete the model registry');
      modelRegistrySettings.findModelRegistryRow(registryName).findKebab().click();
      cy.findByRole('menuitem', { name: 'Delete model registry' }).click();
      modelRegistrySettings.findConfirmDeleteNameInput().type(registryName);
      modelRegistrySettings.findSubmitButton().click();

      cy.step('Verify model registry is removed from UI');
      cy.contains(registryName).should('not.exist');

      cy.step('Verify model registry is removed from the backend');
      checkModelRegistry(registryName).should('be.false');
    },
  );

  it(
    'Creates a model registry with PostgreSQL database and then deletes it',
    {
      tags: ['@Dashboard', '@ModelRegistry', '@Smoke', '@SmokeSet4', '@NonConcurrent'],
    },
    () => {
      cy.step('Login as an Admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry Settings');
      modelRegistrySettings.visit();

      cy.step('Create a model registry with PostgreSQL database');
      modelRegistrySettings.findCreateButton().click();
      modelRegistrySettings.findFormField(FormFieldSelector.NAME).type(postgresRegistryName);
      modelRegistrySettings.findDatabaseSourceExternalRadio().click();
      modelRegistrySettings.selectDatabaseType(DatabaseType.POSTGRES);
      modelRegistrySettings.findFormField(FormFieldSelector.HOST).type(postgresDbName);
      modelRegistrySettings.findFormField(FormFieldSelector.PORT).clear().type('5432');
      modelRegistrySettings
        .findFormField(FormFieldSelector.USERNAME)
        .clear()
        .type('modelregistryuser');
      modelRegistrySettings.findFormField(FormFieldSelector.PASSWORD).type('TheBlurstOfTimes');
      modelRegistrySettings
        .findFormField(FormFieldSelector.DATABASE)
        .clear()
        .type('model-registry');
      modelRegistrySettings.findSubmitButton().click();

      cy.step('Verify it is available in the UI');
      modelRegistrySettings.findModelRegistryRow(postgresRegistryName).should('exist');
      modelRegistrySettings
        .findModelRegistryRow(postgresRegistryName)
        .contains('Available', { timeout: 120000 })
        .should('be.visible');

      cy.step('Verify model registry is created on the backend');
      checkModelRegistry(postgresRegistryName).should('be.true');

      cy.step('Delete the model registry');
      modelRegistrySettings.findModelRegistryRow(postgresRegistryName).findKebab().click();
      cy.findByRole('menuitem', { name: 'Delete model registry' }).click();
      modelRegistrySettings.findConfirmDeleteNameInput().type(postgresRegistryName);
      modelRegistrySettings.findSubmitButton().click();

      cy.step('Verify model registry is removed from UI');
      cy.contains(postgresRegistryName).should('not.exist');

      cy.step('Verify model registry is removed from the backend');
      checkModelRegistry(postgresRegistryName).should('be.false');
    },
  );

  it(
    'Creates a model registry with default database and then deletes it',
    {
      tags: ['@Dashboard', '@ModelRegistry', '@Smoke', '@SmokeSet4', '@NonConcurrent'],
    },
    () => {
      cy.step('Login as an Admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry Settings');
      modelRegistrySettings.visit();

      cy.step('Create a model registry with default database');
      modelRegistrySettings.findCreateButton().click();
      modelRegistrySettings.findFormField(FormFieldSelector.NAME).type(defaultDbName);
      modelRegistrySettings.findDatabaseSourceDefaultRadio().click();
      modelRegistrySettings.findDefaultDatabaseAlert().should('be.visible');
      modelRegistrySettings.findSubmitButton().click();

      cy.step('Verify it is available in the UI');
      modelRegistrySettings.findModelRegistryRow(defaultDbName).should('exist');
      modelRegistrySettings
        .findModelRegistryRow(defaultDbName)
        .contains('Available', { timeout: 300000 })
        .should('be.visible');

      cy.step('Verify model registry is created on the backend');
      checkModelRegistry(defaultDbName).should('be.true');

      cy.step('Verify the default database was created on the backend');
      waitForDefaultDatabase(defaultDbName).should('be.true');
      checkDefaultDatabaseExists(defaultDbName).should('be.true');

      cy.step('Delete the model registry with default database');
      modelRegistrySettings.findModelRegistryRow(defaultDbName).findKebab().click();
      cy.findByRole('menuitem', { name: 'Delete model registry' }).click();
      modelRegistrySettings.findConfirmDeleteNameInput().type(defaultDbName);
      modelRegistrySettings.findSubmitButton().click();

      cy.step('Verify model registry is removed from UI');
      cy.contains(defaultDbName).should('not.exist');

      cy.step('Verify model registry is removed from the backend');
      checkModelRegistry(defaultDbName).should('be.false');
    },
  );

  after(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.step('Navigate away from model registry before cleanup');
    cy.visit('/');

    cy.step('Delete the model registry (MySQL external db)');
    deleteModelRegistry(registryName);

    cy.step('Verify model registry (MySQL external db) is removed from the backend');
    checkModelRegistry(registryName).should('be.false');

    cy.step('Delete the MySQL database');
    deleteModelRegistryDatabase(sqlDbName).should('be.true');

    cy.step('Delete the model registry (PostgreSQL external db)');
    deleteModelRegistry(postgresRegistryName);

    cy.step('Verify model registry (PostgreSQL external db) is removed from the backend');
    checkModelRegistry(postgresRegistryName).should('be.false');

    cy.step('Delete the PostgreSQL database');
    deletePostgresDatabase(postgresDbName).should('be.true');
  });
});
