import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { explorePage } from '~/__tests__/cypress/cypress/pages/explore';
import { enabledPage } from '~/__tests__/cypress/cypress/pages/enabled';
import { nimCard } from '~/__tests__/cypress/cypress/pages/components/NIMCard';

describe('Verify NIM enable flow', () => {
  it('Enable and validate NIM flow', { tags: ['@NIM'] }, () => {
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
    cy.step('Wait for "Validating..." to complete');
    nimCard.waitForValidationToComplete();
    cy.step('Visit the enabled applications page');
    enabledPage.visit();
    cy.step('Validate NIM Card contents on Enabled page');
    nimCard
      .getNIMCard()
      .contains(
        'NVIDIA NIM is a set of easy-to-use microservices designed for secure, reliable deployment of high-performance AI model inferencing.',
      );
    cy.step('Validate that the NIM card does not contain a Disabled button');
    nimCard.disabledButtonShouldNotExist();
  });
});
