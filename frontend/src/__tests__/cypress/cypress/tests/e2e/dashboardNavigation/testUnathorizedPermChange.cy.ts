import { mockGroupSettings } from '~/__mocks__/mockGroupConfig';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { userManagement } from '~/__tests__/cypress/cypress/pages/userManagement';

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
      cy.step('Verify unauthorized access');
      cy.visit('/logout');
      cy.clearAllCookies();
      cy.clearAllLocalStorage();

      cy.step('Log in as unauthorized user');
      cy.visitWithLogin('/', TEST_USER_4);

      cy.step('Attempt to access User Management');
      cy.visit('/groupSettings', { failOnStatusCode: false });

      // Look for not found page instead of unauthorized error
      cy.get('[data-testid="not-found-page"]').should('exist');
      // or
      userManagement.findNavItem().should('not.exist');

      // Switch back to admin and remove permissions
      cy.setCookie('_oauth_proxy', adminSession);
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
      userManagement.visit();

      // Remove old admin group and add a new one
      administratorGroupSection.removeChipItem('odh-admins');
      administratorGroupSection.findMultiGroupInput().type('odh-admins-1');
      administratorGroupSection.findMultiGroupOptions('odh-admins-1').click();
      administratorGroupSection.findChipItem(/^odh-admins-1$/).should('exist');

      cy.interceptOdh('PUT /api/groups-config', mockGroupSettings()).as('removePermissions');
      userManagement.findSubmitButton().should('be.enabled');
      userManagement.findSubmitButton().click();
      cy.wait('@removePermissions');
      userManagement.shouldHaveSuccessAlertMessage();

      // Verify non-admin user cannot access settings
      cy.clearCookie('_oauth_proxy');
      cy.visitWithLogin('/', TEST_USER_4);
      userManagement.visit(false);

      cy.get('[data-testid="not-found-page"]').should('exist');
      cy.get('[data-testid="not-found-page-description"]').should(
        'contain',
        'Another page might have what you need',
      );
      cy.get('[data-testid="home-page-button"]').should('exist');
      userManagement.findNavItem().should('not.exist');
    });
  });
});
