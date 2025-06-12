import { servingRuntimes } from '#~/__tests__/cypress/cypress/pages/servingRuntimes';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { getMultiModelPath } from '#~/__tests__/cypress/cypress/utils/fileImportUtils';
import { getMultiModelServingRuntimeInfo } from '#~/__tests__/cypress/cypress/utils/fileParserUtil';
import { cleanupTemplates } from '#~/__tests__/cypress/cypress/utils/oc_commands/templates';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';

let modelServingName: string;
let metadataDisplayName: string;

retryableBefore(() => {
  // TODO: Investigate and resolve 'window is not defined' error during page transition seen in ODH related to application performance
  // Temporary workaround: Catching and ignoring this specific error to prevent test failure
  Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('window is not defined')) {
      return false;
    }
    return true;
  });

  cy.wrap(null)
    .then(() => {
      return getMultiModelServingRuntimeInfo();
    })
    .then((info) => {
      // Load Multi-Model serving runtime info before tests run
      modelServingName = info.multiModelServingName;
      metadataDisplayName = info.displayName;
      cy.log(`Loaded Multi-Model Name: ${modelServingName}`);
      cy.log(`Loaded Multi-Model Metadata Name: ${metadataDisplayName}`);

      // Call cleanupTemplates here, after metadataDisplayName is set
      return cleanupTemplates(metadataDisplayName);
    });
});

describe('Verify Admins Can Import and Delete a Custom Multi-Model Serving Runtime Template By Uploading A YAML file', () => {
  it(
    'Admin should access serving runtimes, import a yaml file and then delete',
    { tags: ['@Smoke', '@SmokeSet2', '@ODS-2276', '@Dashboard', '@NonConcurrent'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Navigate to serving runtimes and import a multi-model serving yaml
      cy.step('Navigate to Serving Runtimes and add a new serving runtime').then(() => {
        // TODO: Remove extended timeout once '/servingruntimes' performance is optimized - RHOAIENG-15914
        // Current workaround for ODH page loading performance issues
        cy.log('⚠️ Note: RHOAIENG-15914 may cause intermittent failures at this step ⚠️');
        return cy.wrap(servingRuntimes.navigate(), { timeout: 100000 });
      });

      cy.log('Navigation successful | Searching for Add button');
      servingRuntimes.findAddButton().should('exist').and('be.visible').and('be.enabled').click();

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
          servingRuntimes.findEditModel().click();
        });
      servingRuntimes.findDeleteModel().click();

      servingRuntimes.findDeleteModal().should('be.visible').type(metadataDisplayName);

      cy.step(`Delete the model ${modelServingName}`);
      servingRuntimes.findDeleteModelServingButton().click();
      servingRuntimes.getRowById(modelServingName).find().should('not.exist');
    },
  );
});
