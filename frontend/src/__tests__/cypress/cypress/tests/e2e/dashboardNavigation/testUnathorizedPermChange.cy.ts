import { getGroupsConfig } from '~/__tests__/cypress/cypress/utils/oc_commands/groupConfig';
import {
  HTPASSWD_CLUSTER_ADMIN_USER,
  TEST_USER_4,
} from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { userManagement } from '~/__tests__/cypress/cypress/pages/userManagement';
import { retryableBefore } from '../../../utils/retryableHooks';
import { notFoundPage } from '~/__tests__/cypress/cypress/pages/notFound';

describe('Dashboard Navigation - Unauthorized Permission Change', () => {
  let adminSession: string;

  retryableBefore(() => {
    // Use real groups config instead of mock
    getGroupsConfig().then((result) => {
      cy.wrap(result).as('groupsConfig');
    });
  });

  it.only('Set up initial permissions as admin', () => {
    // Start as admin user
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
    userManagement.visit();

    // Set up initial permissions
    const administratorGroupSection = userManagement.getAdministratorGroupSection();
    const userGroupSection = userManagement.getUserGroupSection();

    // Add permissions - using the exact pattern from the successful test
    administratorGroupSection.findMultiGroupInput().type('rhods-admins');
    administratorGroupSection.findMultiGroupOptions('rhods-admins').click();
    administratorGroupSection.findChipItem('rhods-admins').should('exist');
    administratorGroupSection.shouldHaveAdministratorGroupInfo();

    userGroupSection.findMultiGroupInput().type('rhods-users');
    userGroupSection.findMultiGroupOptions('rhods-users').click();
    userGroupSection.findChipItem('rhods-users').should('exist');
    userGroupSection.findMultiGroupSelectButton().click();

    // Verify submit button is enabled
    userManagement.findSubmitButton().should('be.enabled');

    // Save changes
    userManagement.findSubmitButton().click();

    // Store admin session cookie
    cy.getCookie('_oauth_proxy').then((cookie) => {
      if (!cookie) throw new Error('Admin session cookie not found');
      adminSession = cookie.value;
    });
  });

  it('Verify unauthorized user cannot access settings', () => {
    // Switch to TEST_USER_4 (unauthorized user)
    cy.visitWithLogin('/', TEST_USER_4);
    userManagement.visit(false);

    cy.step('Verify unauthorized access');
    cy.visit('/logout');
    cy.clearAllCookies();
    cy.clearAllLocalStorage();

    cy.step('Log in as unauthorized user');
    cy.visitWithLogin('/', TEST_USER_4);

    cy.step('Attempt to access User Management');
    cy.visit('/groupSettings', { failOnStatusCode: false });

    // Use page objects to verify unauthorized access
    notFoundPage.getNotFoundPage().should('exist');
    notFoundPage.getDescription().should('contain', 'Another page might have what you need');
    notFoundPage.getHomeButton().should('exist');
    userManagement.findNavItem().should('not.exist');

    // Switch back to admin and remove permissions
    cy.setCookie('_oauth_proxy', adminSession);
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
    userManagement.visit();

    // Remove old admin group and add a new one
    const administratorGroupSection = userManagement.getAdministratorGroupSection();
    administratorGroupSection.removeChipItem('system:authenticated');
    administratorGroupSection.findMultiGroupInput().type('system:authenticated');
    administratorGroupSection.findMultiGroupOptions('system:authenticated').click();
    administratorGroupSection.findChipItem('system:authenticated').should('exist');

    userManagement.findSubmitButton().should('be.enabled').click();

    // Verify non-admin user cannot access settings
    cy.clearCookie('_oauth_proxy');
    cy.visitWithLogin('/', TEST_USER_4);
    userManagement.visit(false);

    notFoundPage.getNotFoundPage().should('exist');
    notFoundPage.getDescription().should('contain', 'Another page might have what you need');
    notFoundPage.getHomeButton().should('exist');
    userManagement.findNavItem().should('not.exist');
  });
});
