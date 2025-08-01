import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { explorePage } from '#~/__tests__/cypress/cypress/pages/explore';
import { enabledPage } from '#~/__tests__/cypress/cypress/pages/enabled';
import { nimCard } from '#~/__tests__/cypress/cypress/pages/components/NIMCard';
import { toastNotifications } from '#~/__tests__/cypress/cypress/pages/components/ToastNotifications';
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
      cy.step('Check if NIM card is available');
      nimCard.isNIMCardAvailable().then((isAvailable) => {
        if (!isAvailable) {
          cy.log('⚠️  NIM card is not available on this cluster');
          cy.log('💡 This is likely because the OdhApplication for NIM does not exist');
          cy.log('💡 This is common for ODH deployments where NIM is not included by default');
          cy.log('💡 To enable NIM, apply the NIM OdhApplication: kubectl apply -f manifests/rhoai/shared/apps/nvidia-nim/nvidia-nim-app.yaml');
          cy.log('⏭️  Skipping NIM enable test');
          return;
        }
        
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
        cy.step('Input NGC API Key');
        nimCard.getNGCAPIKey().type(Cypress.env('NGC_API_KEY'));
        cy.step('Click submit to enable the NIM application');
        nimCard.getNIMSubmit().click();
        cy.step('Wait for validation to complete and verify the validation message');
        nimCard.getProgressTitle().should('contain', 'Contacting NVIDIA to validate the license key');
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
          cy.contains('button', 'Disabled', { timeout: 60000 }).should('not.exist');
        });
      });
    },
  );
});
