import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { explorePage } from '~/__tests__/cypress/cypress/pages/explore';
import { enabledPage } from '~/__tests__/cypress/cypress/pages/enabled';
import { nimCard } from '~/__tests__/cypress/cypress/pages/components/NIMCard';
import { deleteNIMAccount, validateNIMAccountStatus } from '~/__tests__/cypress/cypress/utils/oc_commands/baseCommands';

describe('Verify NIM enable flow', () => {
  before(() => {
    cy.step('Delete odh-nim-account');
    deleteNIMAccount(Cypress.env('TEST_NAMESPACE'), true);
  });

  it('Enable and validate NIM flow', { tags: ['@NIM', '@Sanity'] }, () => {
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
    cy.step('Input NGC API Key');
    nimCard.getNGCAPIKey().type(Cypress.env('NGC_API_KEY'));
    cy.step('Click submit to enable the NIM application');
    nimCard.getNIMSubmit().click();
    cy.step('Wait for Validation to complete');
    nimCard.getProgressTitle().should('exist');
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
    cy.step('Validate odh-nim-account AccountStatus is True');
    validateNIMAccountStatus('AccountStatus', 'True')
    cy.step('Validate odh-nim-account APIKeyValidation is True');
    validateNIMAccountStatus('APIKeyValidation', 'True')
    cy.step('Validate odh-nim-account ConfigMapUpdate is True');
    validateNIMAccountStatus('ConfigMapUpdate', 'True')
    cy.step('Validate odh-nim-account TemplateUpdate is True');
    validateNIMAccountStatus('TemplateUpdate', 'True')
    cy.step('Validate odh-nim-account SecretUpdate is True');
    validateNIMAccountStatus('SecretUpdate', 'True')
  });
});

