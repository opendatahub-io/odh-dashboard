import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  FormFieldSelector,
  modelRegistrySettings,
} from '#~/__tests__/cypress/cypress/pages/modelRegistrySettings';
import { retryableBeforeEach } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import {
  checkModelRegistry,
  createAndVerifyDatabase,
  deleteModelRegistry,
  deleteModelRegistryDatabase,
  ensureOperatorMemoryLimit,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/modelRegistry';
import { loadModelRegistryFixture } from '#~/__tests__/cypress/cypress/utils/dataLoader';
import type { ModelRegistryTestData } from '#~/__tests__/cypress/cypress/types';

describe('Verify a model registry can be created and deleted', () => {
  let testData: ModelRegistryTestData;
  let deploymentName: string;
  let registryName: string;

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
      createAndVerifyDatabase().should('be.true');
    });
  });

  retryableBeforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it(
    'Creates a model registry and then deletes it',
    { tags: ['@Dashboard', '@ModelRegistry', '@NonConcurrent', '@FeatureFlagged'] },
    () => {
      cy.step('Login as an Admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to Model Registry Settings');
      modelRegistrySettings.visit();

      cy.step('Create a model registry');
      modelRegistrySettings.findCreateButton().click();
      modelRegistrySettings.findFormField(FormFieldSelector.NAME).type(registryName);
      modelRegistrySettings.findFormField(FormFieldSelector.HOST).type('model-registry-db');
      modelRegistrySettings.findFormField(FormFieldSelector.PORT).type('3306');
      modelRegistrySettings.findFormField(FormFieldSelector.USERNAME).type('mlmduser');
      modelRegistrySettings.findFormField(FormFieldSelector.PASSWORD).type('TheBlurstOfTimes');
      modelRegistrySettings.findFormField(FormFieldSelector.DATABASE).type('model_registry');
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
      cy.findByTestId('modal-submit-button').click();

      cy.step('Verify model registry is removed from UI');
      cy.contains(registryName).should('not.exist');

      cy.step('Verify model registry is removed from the backend');
      checkModelRegistry(registryName).should('be.false');
    },
  );

  after(() => {
    cy.clearCookies();
    cy.clearLocalStorage();

    cy.step('Delete the model registry');
    deleteModelRegistry(registryName);

    cy.step('Verify model registry is removed from the backend');
    checkModelRegistry(registryName).should('be.false');

    cy.step('Delete the SQL database');
    deleteModelRegistryDatabase();
  });
});
