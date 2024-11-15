import { servingRuntimes } from '~/__tests__/cypress/cypress/pages/servingRuntimes';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { getMultiModelPath } from '~/__tests__/cypress/cypress/utils/fileImportUtils';
import { getMultiModelServingRuntimeInfo } from '~/__tests__/cypress/cypress/utils/fileParserUtil';

let modelServingName: string;
let metadataDisplayName: string;

before(() => {
  // TODO: Investigate and resolve 'window is not defined' error during page transition seen in ODH related to application performance
  // Temporary workaround: Catching and ignoring this specific error to prevent test failure
  Cypress.on('uncaught:exception', (err) => {
    // Check if the error is about 'window is not defined'
    if (err.message.includes('window is not defined')) {
      // Prevent the error from failing the test
      return false;
    }
    // For other errors, let them fail the test
    return true;
  });
  // Load multi-model serving runtime info before tests run
  getMultiModelServingRuntimeInfo().then((info) => {
    modelServingName = info.multiModelServingName;
    metadataDisplayName = info.displayName;
    cy.log(`Loaded Multi-Model Name: ${modelServingName}`);
    cy.log(`Loaded Multi-Model Metadata Name: ${metadataDisplayName}`);
  });
});

describe('Verify Admins Can Import and Delete a Custom Multi-Model Serving Runtime Template By Uploading A YAML file', () => {
  it('Admin should access serving runtimes, import a yaml file and then delete', () => {
    // Authentication and navigation
    cy.step('Log into the application');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

    // Navigate to serving runtimes and import a multi-model serving yaml
    cy.step('Navigate to Serving Runtimes and add a new serving runtime').then(() => {
      // TODO: Remove extended timeout once '/servingruntimes' performance is optimized
      // Current workaround for ODH page loading performance issues
      return cy.wrap(servingRuntimes.navigate(), { timeout: 100000 });
    });

    cy.log('Navigation completed, looking for Add button');
    cy.then(() => {
      return servingRuntimes.findAddButton();
    })
      .should('exist')
      .should('exist', { timeout: 100000 })
      .and('be.visible')
      .and('be.enabled')
      .click();

    cy.log('Add button clicked successfully');

    cy.step('Select Multi-Model from Dropdown');
    servingRuntimes.selectPlatform('Multi-model serving platform');

    cy.step('Upload a Multi-Model Serving runtime yaml file');
    const multiModelYaml = getMultiModelPath();
    servingRuntimes.uploadYaml(multiModelYaml);

    cy.step('Click to save and verify that creation was successful');
    servingRuntimes
      .findSubmitButton()
      .should('be.enabled')
      .click()
      .then(() => {
        // Wait for URL to change, indicating page transition
        cy.url().should('include', '/servingRuntimes', { timeout: 30000 });
      });

    // Edit the created model serving platform and delete
    cy.step(`Verify the model ${modelServingName} has been created`);
    servingRuntimes
      .getRowById(modelServingName)
      .find()
      .within(() => {
        servingRuntimes.editModel().click();
        servingRuntimes.deleteModel().click();
      });

    servingRuntimes.deleteModal().should('be.visible').type(metadataDisplayName);

    cy.step(`Delete the model ${modelServingName}`);
    servingRuntimes.deleteModelServingButton().click();
    servingRuntimes.getRowById(modelServingName).find().should('not.exist');
  });
});
