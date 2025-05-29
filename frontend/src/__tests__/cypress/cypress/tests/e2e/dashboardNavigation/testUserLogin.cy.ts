import {
  HTPASSWD_CLUSTER_ADMIN_USER,
  LDAP_CONTRIBUTOR_USER,
} from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { header } from '#~/__tests__/cypress/cypress/pages/components/Header';

describe('Verify that logged in users display on the Dashboard', () => {
  it(
    'Verify that Admin Users can login and that login information displays on the dashboard',
    { tags: ['@Sanity', '@SanitySet2', '@ODS-354', '@Dashboard'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Click the user menu toggle
      cy.step('Click the user menu dropdown');
      header.findMenuDropdown().click();

      // Verify the username appears
      cy.step('Verify the username appears in the menu');
      header
        .findMenuDropdown()
        .find('span')
        .first()
        .should('have.text', HTPASSWD_CLUSTER_ADMIN_USER.USERNAME);
    },
  );
  it(
    'Verify that Non-Admin Users can login and that login information displays on the dashboard',
    { tags: ['@Sanity', '@SanitySet2', '@ODS-354', '@Dashboard'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      // Click the user menu toggle
      cy.step('Click the user menu dropdown');
      header.findMenuDropdown().click();

      // Verify the username appears
      cy.step('Verify the username appears in the menu');
      header
        .findMenuDropdown()
        .find('span')
        .first()
        .should('have.text', LDAP_CONTRIBUTOR_USER.USERNAME);
    },
  );
});
