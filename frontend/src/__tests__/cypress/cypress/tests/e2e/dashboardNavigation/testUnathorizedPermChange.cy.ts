import { mockGroupSettings } from '~/__mocks__/mockGroupConfig';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { userManagement } from '~/__tests__/cypress/cypress/pages/userManagement';
import { pageNotfound } from '~/__tests__/cypress/cypress/pages/pageNotFound';

const TEST_USER_4 = {
  AUTH_TYPE: 'ldap-provider-qe',
  USERNAME: 'ldap-user9',
  PASSWORD: 'rhodsPW#1',
};

describe('Dashboard Navigation - Unauthorized Permission Change', () => {
  beforeEach(() => {
    cy.interceptOdh('GET /api/groups-config', mockGroupSettings());
  });

  it('Verify unauthorized user cannot change permissions', () => {
    // Start as admin user
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
    userManagement.visit();

    // Set up initial permissions
    const administratorGroupSection = userManagement.getAdministratorGroupSection();
    const userGroupSection = userManagement.getUserGroupSection();

    // Add permissions
    administratorGroupSection.findMultiGroupInput().type('odh-admins');
    administratorGroupSection.findMultiGroupOptions('odh-admins-1').click();
    administratorGroupSection.findChipItem(/^odh-admins-1$/).should('exist');
    administratorGroupSection.shouldHaveAdministratorGroupInfo();

    userGroupSection.findMultiGroupInput().type('odh-admins');
    userGroupSection.findMultiGroupOptions('odh-admins').click();
    userGroupSection.findChipItem('odh-admins').should('exist');
    userGroupSection.findMultiGroupSelectButton().click();

    // Verify submit button is enabled
    userManagement.findSubmitButton().should('be.enabled');

    // Save and verify changes
    cy.interceptOdh('PUT /api/groups-config', mockGroupSettings()).as('saveGroupSetting');
    userManagement.findSubmitButton().click();
    cy.wait('@saveGroupSetting');
    userManagement.shouldHaveSuccessAlertMessage();

    // Store admin session cookie
    cy.getCookie('_oauth_proxy').then((cookie) => {
      if (!cookie) throw new Error('Admin session cookie not found');
      const adminSession = cookie.value;

      // Switch to TEST_USER_4 (unauthorized user)
      cy.visitWithLogin('/', TEST_USER_4);
      userManagement.visit(false);

      // Verify unauthorized access using correct test ID
      pageNotfound.findPage().should('exist');
      userManagement.findNavItem().should('not.exist');

      // Switch back to admin and remove permissions
      cy.setCookie('_oauth_proxy', adminSession);
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      userManagement.visit();

      administratorGroupSection.removeChipItem('rhods-users');
      cy.interceptOdh('PUT /api/groups-config', mockGroupSettings()).as('removePermissions');
      userManagement.findSubmitButton().click();
      cy.wait('@removePermissions');
      userManagement.shouldHaveSuccessAlertMessage();

      // Verify non-admin user cannot access settings
      cy.clearCookie('_oauth_proxy'); // Clear the admin session
      cy.clearAllCookies(); // Clear all cookies to be sure
      cy.clearAllLocalStorage(); // Clear local storage

      // Now try to access as TEST_USER_4
      cy.step('Log into the application as unauthorized user');
      cy.visitWithLogin('/', TEST_USER_4);

      cy.step('Try to navigate to User Management settings');
      userManagement.visit(false); // false parameter prevents waiting for the page to load

      pageNotfound.findPage().should('exist');
      userManagement.findNavItem().should('not.exist');
    });
  });
});
