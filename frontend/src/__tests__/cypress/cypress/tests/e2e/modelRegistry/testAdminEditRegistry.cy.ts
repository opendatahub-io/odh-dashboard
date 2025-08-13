import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { retryableBeforeEach } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import {
  checkModelRegistry,
  checkModelRegistryAvailable,
  createAndVerifyDatabase,
  createModelRegistryViaYAML,
  deleteModelRegistry,
  deleteModelRegistryDatabase,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/modelRegistry';
import { loadRegisterModelFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import { generateTestUUID } from '#~/__tests__/cypress/cypress/utils/uuidGenerator';
import type { RegisterModelTestData } from '#~/__tests__/cypress/cypress/types';
import {
  modelRegistrySettings,
  FormFieldSelector as SettingsFormFieldSelector,
} from '#~/__tests__/cypress/cypress/pages/modelRegistrySettings';

describe('Verify that admin users can edit a model registry', () => {
  let testData: RegisterModelTestData;
  let registryName: string;
  let originalRegistryName: string;
  const uuid = generateTestUUID();

  before(() => {
    cy.step('Load test data from fixture');
    loadRegisterModelFixture('e2e/modelRegistry/testRegisterModel.yaml').then((fixtureData) => {
      testData = fixtureData;
      registryName = `${testData.registryNamePrefix}-${uuid}`;
      originalRegistryName = registryName; // Store original name for cleanup

      // Create and verify SQL database
      cy.step('Create and verify SQL database for model registry');
      createAndVerifyDatabase().should('be.true');

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
    'Logs in as admin user and edits an existing model registry',
    { tags: ['@Dashboard', '@ModelRegistry', '@NonConcurrent', '@Featureflagged'] },
    () => {
      cy.step('Login as an Admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry Settings');
      modelRegistrySettings.navigate();

      cy.step('Find and edit the model registry');
      modelRegistrySettings
        .findModelRegistryRow(registryName)
        .findKebabAction('Edit model registry')
        .click();

      cy.step('Verify the current values are loaded');
      modelRegistrySettings
        .findFormField(SettingsFormFieldSelector.NAME)
        .should('have.value', registryName);

      cy.step('Modify the name and description fields');
      const { newNameSuffix, newDescription } = testData;
      const newRegistryName = `${registryName}${newNameSuffix}`;

      modelRegistrySettings
        .findFormField(SettingsFormFieldSelector.NAME)
        .clear()
        .type(newRegistryName);

      modelRegistrySettings
        .findFormField(SettingsFormFieldSelector.DESCRIPTION)
        .clear()
        .type(newDescription);

      cy.step('Submit the changes');
      modelRegistrySettings.findSubmitButton().should('be.enabled');
      modelRegistrySettings.findSubmitButton().click();

      cy.step('Verify the registry name and description were updated');
      modelRegistrySettings.findModelRegistryRow(newRegistryName).should('exist');
      modelRegistrySettings.findModelRegistryRow(newRegistryName).should('contain', newDescription);
    },
  );

  after(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.step('Delete the model registry');
    deleteModelRegistry(originalRegistryName);

    cy.step('Verify model registry is removed from the backend');
    checkModelRegistry(originalRegistryName).should('be.false');

    cy.step('Delete the SQL database');
    deleteModelRegistryDatabase();
  });
});
