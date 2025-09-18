import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { explorePage } from '#~/__tests__/cypress/cypress/pages/explore';
import { enabledPage } from '#~/__tests__/cypress/cypress/pages/enabled';
import { nimCard } from '#~/__tests__/cypress/cypress/pages/components/NIMCard';
import { toastNotifications } from '#~/__tests__/cypress/cypress/pages/components/ToastNotifications';
import {
  deleteNIMAccount,
  applyNIMApplication,
  checkNIMApplicationExists,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/nimCommands';

/**
 * NIM Application Enablement Test
 *
 * This test verifies the complete flow for enabling the NVIDIA NIM application:
 * 1. Checks if NIM card is available on the Explore page
 * 2. If not available, automatically applies the NIM OdhApplication manifest
 * 3. Waits for the NIM card to become visible (up to 160 seconds with periodic refreshes)
 * 4. Validates the NIM card contents and description
 * 5. Clicks the NIM card and enables it with NGC API key
 * 6. Verifies the validation process and success notification
 * 7. Confirms the NIM application appears on the Enabled page
 *
 * The test is designed to work in both ODH and RHOAI environments,
 * automatically handling cases where NIM is not included by default.
 */
describe('Verify NIM enable flow', () => {
  before(() => {
    cy.step('Clean up any existing NIM account before test');
    deleteNIMAccount();
  });

  it(
    'Enable and validate NIM flow',
    { tags: ['@NIM', '@Sanity', '@SanitySet3', '@NonConcurrent'] },
    function enableAndValidateNIMFlow() {
      cy.step('Login to the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Navigate to the Explore page');
      explorePage.visit();
      cy.step('Check if NIM application exists on cluster');
      checkNIMApplicationExists().then((nimExists) => {
        if (nimExists) {
          cy.step('NIM OdhApplication exists on cluster - checking UI');

          cy.step('Check if NIM card is available in UI');
          nimCard.isNIMCardAvailable().then((isAvailable) => {
            if (isAvailable) {
              cy.step('NIM card is available - proceeding with enablement test');
              cy.log('💡 No need to apply manifest, proceeding directly with enablement test');
              executeNIMTestSteps();
            } else {
              cy.step('NIM application exists on cluster but card is not visible in UI');
              cy.log('💡 This might be a UI issue - proceeding with test anyway');
              executeNIMTestSteps();
            }
          });
        } else {
          cy.step('NIM OdhApplication does not exist on cluster');
          cy.log('💡 This is common for ODH deployments where NIM is not included by default');
          cy.step('Attempting to apply NIM manifest automatically...');

          // Apply the NIM manifest to enable NIM on the cluster
          applyNIMApplication().then(() => {
            cy.step('NIM OdhApplication applied successfully');
            cy.step('Refreshing page to see the NIM card...');

            // Refresh the page to see the newly applied NIM card
            explorePage.reload();
            cy.step('Navigate to the Explore page after applying NIM');
            explorePage.visit();

            // Wait longer for the NIM card to become visible after applying the manifest
            cy.step('Waiting for NIM card to become visible...');

            // Wait with periodic refreshes to ensure the NIM card loads
            let attempts = 0;
            const maxAttempts = 8; // 8 attempts * 20 seconds = 160 seconds total

            const checkForNIMCard = () => {
              attempts++;
              cy.step(`Attempt ${attempts}/${maxAttempts} - Checking for NIM card...`);

              // Refresh the page every 20 seconds to ensure fresh content
              explorePage.reload();
              cy.step(`Navigate to Explore page (attempt ${attempts})`);
              explorePage.visit();

              // Wait for page to load
              // eslint-disable-next-line cypress/no-unnecessary-waiting
              cy.wait(5000);

              nimCard.isNIMCardAvailable().then((isNowAvailable) => {
                if (isNowAvailable) {
                  cy.step('NIM card is now available, proceeding with test');
                  executeNIMTestSteps();
                } else if (attempts < maxAttempts) {
                  cy.step('NIM card not yet available, waiting before next attempt...');
                  // eslint-disable-next-line cypress/no-unnecessary-waiting
                  cy.wait(20000); // Wait before next attempt
                  checkForNIMCard();
                } else {
                  cy.step('NIM card still not available after all attempts');
                  cy.log('💡 This might be due to timing or cluster configuration issues');
                  throw new Error(
                    'NIM card is not available after applying manifest. This indicates a real issue that needs investigation.',
                  );
                }
              });
            };

            // Start the checking process
            checkForNIMCard();
          });
        }
      });
    },
  );
});

/**
 * Helper function to execute the NIM test steps
 */
function executeNIMTestSteps(): void {
  cy.step('Validate NIM card contents');
  nimCard
    .getNIMCard()
    .contains(
      'NVIDIA NIM is a set of easy-to-use microservices designed for secure, reliable deployment of high-performance AI model inferencing.',
    );
  cy.step('Click NIM card');
  nimCard.getNIMCard().click();

  // Wait for the drawer to be visible and content to load
  cy.step('Wait for drawer content to load');
  nimCard.findDrawerPanel().should('be.visible');

  // Validate that the drawer action list is visible
  cy.step('Validate drawer action list is visible');
  nimCard.findActionList().should('be.visible');

  // Wait for enable button to be visible in the action list
  cy.step('Wait for enable button to be visible in action list');
  nimCard.findEnableButton().should('be.visible');

  // Enable button exists, proceed with enablement
  cy.step('Enable button is available - NIM application is ready to be enabled');
  cy.step('Click Enable button in NIM card');
  nimCard.getEnableNIMButton().click();

  cy.step('Input NGC API key');
  nimCard.getNGCAPIKey().clear().type(Cypress.env('NGC_API_KEY'));
  cy.step('Click submit to enable the NIM application');
  nimCard.getNIMSubmit().click();
  cy.step('Wait for validation to complete and verify the validation message');
  nimCard.getProgressTitle().should('contain', 'Contacting NVIDIA to validate the license key');
  // Wait for validation to complete (up to 120 seconds for NVIDIA API call with network issues)
  nimCard.getProgressTitle({ timeout: 120000 }).should('not.exist');
  cy.step('Check for success notification');
  toastNotifications
    .findToastNotification(0)
    .should('contain.text', 'NVIDIA NIM has been added to the Enabled page');
  cy.step('Visit the enabled applications page');
  enabledPage.visit();
  cy.step('Validate NIM Card contents on Enabled page');
  nimCard
    .getNIMCard()
    .contains(
      'NVIDIA NIM is a set of easy-to-use microservices designed for secure, reliable deployment of high-performance AI model inferencing.',
    );
  cy.step('Validate that the NIM card does not contain a Disabled button');
  nimCard.getNIMCard().within(() => {
    cy.contains('button', 'Disabled').should('not.exist');
  });
}
