import { servingRuntimes } from '#~/__tests__/cypress/cypress/pages/servingRuntimes';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { getSingleModelPath } from '#~/__tests__/cypress/cypress/utils/fileImportUtils';
import { getSingleModelServingRuntimeInfo } from '#~/__tests__/cypress/cypress/utils/fileParserUtil';
import { cleanupTemplates } from '#~/__tests__/cypress/cypress/utils/oc_commands/templates';
import { retryableBefore } from '#~/__tests__/cypress/cypress/utils/retryableHooks';

let modelServingSingleName: string;
let metadataSingleDisplayName: string;

retryableBefore(() => {
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
  cy.wrap(null)
    .then(() => {
      return getSingleModelServingRuntimeInfo();
    })
    .then((info) => {
      // Load Single-Model serving runtime info before tests run
      modelServingSingleName = info.singleModelServingName;
      metadataSingleDisplayName = info.displayName;
      cy.log(`Loaded Single-Model Name: ${modelServingSingleName}`);
      cy.log(`Loaded Single-Model Metadata Name: ${metadataSingleDisplayName}`);

      // Call cleanupTemplates here, after metadataDisplayName is set
      return cleanupTemplates(metadataSingleDisplayName);
    });
});
describe('Verify Admins Can Import and Delete a Custom Single-Model Serving Runtime Template By Uploading A YAML file', () => {
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

      cy.step('Select Single from Dropdown');
      servingRuntimes.selectPlatform('Single-model serving platform');

      cy.step('Select API Protocol');
      servingRuntimes.findSelectAPIProtocolButton().click();
      servingRuntimes.selectAPIProtocol('REST');

      cy.step('Upload a Single-Model Serving runtime yaml file');
      const singleModelYaml = getSingleModelPath();
      servingRuntimes.uploadYaml(singleModelYaml);

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
      cy.step(`Verify the model ${modelServingSingleName} has been created`);
      cy.contains(metadataSingleDisplayName).should('be.visible');
      servingRuntimes
        .getRowById(modelServingSingleName)
        .find()
        .within(() => {
          servingRuntimes.findEditModel().click();
        });
      servingRuntimes.findDeleteModel().click();

      servingRuntimes.findDeleteModal().should('be.visible').type(metadataSingleDisplayName);

      cy.step(`Delete the model ${modelServingSingleName}`);
      servingRuntimes.findDeleteModelServingButton().click();
      servingRuntimes.getRowById(modelServingSingleName).find().should('not.exist');
    },
  );
});
