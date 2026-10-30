import { explorePage } from '../../../pages/explore';
import { enabledPage } from '../../../pages/enabled';
import { nimCard } from '../../../pages/components/NIMCard';
import {
  deleteNIMAccount,
  applyNIMApplication,
  checkNIMApplicationExists,
  waitForNIMAccountValidation,
} from '../../../utils/oc_commands/nimCommands';
import { getCustomResource } from '../../../utils/oc_commands/customResources';
import { retryableBefore } from '../../../utils/retryableHooks';

/**
 * Legacy NIM enable-via-Explore flow.
 *
 * When nimWizard is enabled (default), Explore hides the nvidia-nim card.
 * This test forces nimWizard=false on every Explore visit so the legacy
 * OdhApplication enable path remains covered.
 *
 * NOTE: NIM is a RHOAI-specific feature. This test is skipped on ODH deployments.
 */
const LEGACY_NIM_DEV_FLAGS = 'devFeatureFlags=nimWizard=false';

describe('Verify NIM enable flow', () => {
  let skipTest = false;

  const shouldSkip = () => {
    if (skipTest) {
      cy.log('Skipping test - NIM is RHOAI-specific and not available on ODH.');
      return true;
    }
    return false;
  };

  const visitExploreForLegacyNim = () => {
    explorePage.visit(LEGACY_NIM_DEV_FLAGS);
  };

  retryableBefore(() => {
    // Check if the operator is RHOAI, if it's not (ODH), skip the test
    cy.step('Check if the operator is RHOAI');
    getCustomResource('redhat-ods-operator', 'Deployment', 'name=rhods-operator')
      .then((result) => {
        if (!result.stdout.includes('rhods-operator')) {
          cy.log('RHOAI operator not found, skipping the test (NIM is RHOAI-specific).');
          skipTest = true;
        } else {
          cy.log('RHOAI operator confirmed:', result.stdout);
        }
      })
      .then(() => {
        // If not skipping, proceed with test setup
        if (skipTest) {
          return;
        }

        cy.step('Clean up any existing NIM account before test');
        return deleteNIMAccount();
      });
  });

  it(
    'Enable and validate NIM flow',
    {
      tags: ['@NIM', '@Sanity', '@SanitySet3', '@NonConcurrent', '@NIMServingCI'],
    },
    function enableAndValidateNIMFlow() {
      // Skip test if running on ODH
      if (shouldSkip()) {
        return;
      }

      cy.step('Login and open Explore with legacy NIM enable flow enabled');
      visitExploreForLegacyNim();

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
              throw new Error(
                'NIM OdhApplication exists but the Explore card is not visible with nimWizard=false.',
              );
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

            // Re-visit with flags so nimWizard stays disabled after navigation
            visitExploreForLegacyNim();

            // Wait longer for the NIM card to become visible after applying the manifest
            cy.step('Waiting for NIM card to become visible...');

            // Wait with periodic refreshes to ensure the NIM card loads
            let attempts = 0;
            const maxAttempts = 8; // 8 attempts * 20 seconds = 160 seconds total

            const checkForNIMCard = () => {
              attempts++;
              cy.step(`Attempt ${attempts}/${maxAttempts} - Checking for NIM card...`);

              // Re-visit with flags every attempt to keep nimWizard disabled
              visitExploreForLegacyNim();

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
  nimCard.findBadgeDescription().should('not.be.empty');
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

  // Continue with enablement steps
  cy.step('Input NGC API Key');
  nimCard.getNGCAPIKey().clear().type(Cypress.env('NGC_API_KEY'));
  cy.step('Click submit to enable the NIM application');
  nimCard.getNIMSubmit().click();
  cy.step('Wait for validation to complete and verify the validation message');
  nimCard.getProgressTitle().should('contain', 'Contacting NVIDIA to validate the license key');

  // Wait for NIM account validation by checking the account status fields via oc command.
  // This is more reliable than waiting for UI elements and allows up to 7 minutes
  // for the NVIDIA API validation to complete.
  cy.step('Wait for NIM account validation via oc command (up to 7 minutes)');
  waitForNIMAccountValidation();

  // Verify that the enable modal closes automatically after successful validation
  // Note: This test only runs on RHOAI where the modal closes automatically
  cy.step('Verify the enable modal closes automatically after validation');
  nimCard.findEnableModal().should('not.exist', { timeout: 30000 });

  cy.step('Visit the enabled applications page to verify NIM is enabled');
  enabledPage.visit();
  cy.step('Validate NIM Card contents on Enabled page');
  nimCard.getNIMCard().findByTestId('badge-description').should('not.be.empty');
  cy.step('Validate that the NIM card does not contain a Disabled button');
  nimCard.getNIMCard().within(() => {
    cy.contains('button', 'Disabled').should('not.exist');
  });
}
