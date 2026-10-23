import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { header } from '../../../pages/components/Header';

describe('Verify basic dashboard login', () => {
  it(
    'Verify that a user can log in and see the dashboard user menu',
    { tags: ['@Sanity', '@SanitySet2', '@Dashboard', '@ci-dashboard-regression-tags'] },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Verify the user menu is available');
      header.findMenuDropdown().should('be.visible');
    },
  );
});
