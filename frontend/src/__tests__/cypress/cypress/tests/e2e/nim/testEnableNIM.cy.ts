import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { explorePage } from '#~/__tests__/cypress/cypress/pages/explore';
import { enabledPage } from '#~/__tests__/cypress/cypress/pages/enabled';
import { nimCard } from '#~/__tests__/cypress/cypress/pages/components/NIMCard';
import { deleteNIMAccount } from '#~/__tests__/cypress/cypress/utils/oc_commands/baseCommands';
import { wasSetupPerformed } from '#~/__tests__/cypress/cypress/utils/retryableHooks';

describe('[Product Bug: NVPE-244] Verify NIM enable flow', () => {
  after(() => {
    if (!wasSetupPerformed()) return;
    cy.step('Delete odh-nim-account');
    deleteNIMAccount();
  });
  it(
    'Enable and validate NIM flow',
    { tags: ['@NIM', '@Sanity', '@NonConcurrent', '@Bug'] },
    () => {
      cy.step('Login to the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      cy.step('Navigate to the Explore page');
      explorePage.visit();
      cy.step('Validate NIM card contents');
      nimCard
        .getNIMCard()
        .contains(
          'NVIDIA NIM is a set of easy-to-use microservices designed for secure, reliable deployment of high-performance AI model inferencing.',
        );
      cy.step('Click NIM card');
      nimCard.getNIMCard().click();
      cy.step('Click Enable button in NIM card');
      nimCard.getEnableNIMButton().click();

      // Test Personal API key (should NOT show warning)
      cy.step('Input Personal API key to verify no warning appears');
      nimCard.getNGCAPIKey().type('nvapi-test-personal-key-123');
      cy.step('Wait for debounce period to ensure no warning appears');

      // Wait longer than debounce timeout (500ms)
      // This is necessary since otherwise cypress will see that it's not there and always pass
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(600);
      cy.step('Verify no warning message appears for Personal API key');
      cy.get('[data-testid="warning-message-alert"]').should('not.exist');

      // Test non-Personal API key warning
      cy.step('Clear Personal API key and input legacy key to test warning');
      nimCard.getNGCAPIKey().clear();
      nimCard.getNGCAPIKey().type(Cypress.env('NGC_API_KEY'));
      cy.step('Wait for debounce period before checking warning');
      cy.step('Verify non-Personal API key warning message appears');
      cy.get('[data-testid="warning-message-alert"]', { timeout: 1000 }).should('be.visible');
      cy.get('[data-testid="warning-message-alert"]').should(
        'contain',
        "Looks like you're not using a Personal API key",
      );
      cy.step('Click submit to enable the NIM application');
      nimCard.getNIMSubmit().click();
      cy.step('Wait for "Validating..." to complete');
      nimCard.getProgressTitle().should('contain', 'Validating your entries');
      nimCard.getProgressTitle({ timeout: 120000 }).should('not.exist');
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
        cy.contains('button', 'Disabled', { timeout: 60000 }).should('not.exist');
      });
    },
  );
});
