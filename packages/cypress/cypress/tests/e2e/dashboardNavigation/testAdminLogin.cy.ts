import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { header } from '../../../pages/components/Header';
import { homePage } from '../../../pages/home/home';

describe('Admin login', () => {
  it(
    'allows a cluster admin to log in and reach the dashboard',
    { tags: ['@Smoke', '@SmokeSet2', '@Dashboard', '@ci-dashboard-regression-tags'] },
    () => {
      cy.step('Log in as a cluster admin');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Verify the admin landing page is displayed');
      homePage.getHomeAdminSection().find().should('be.visible');

      cy.step('Verify the logged-in admin username is displayed');
      header.findMenuDropdown().should('contain.text', HTPASSWD_CLUSTER_ADMIN_USER.USERNAME);
    },
  );
});
