import { getGroupsConfig } from '~/__tests__/cypress/cypress/utils/oc_commands/groupConfig';
import { HTPASSWD_CLUSTER_ADMIN_USER, TEST_USER_4 } from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { userManagement } from '~/__tests__/cypress/cypress/pages/userManagement';

describe('Dashboard Navigation - Unauthorized Permission Change', () => {
  beforeEach(() => {
    // Use real groups config instead of mock
    getGroupsConfig();
  });

  it('Verify unauthorized user cannot change permissions', () => {
    // Start as admin user
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
    userManagement.visit();

    // Set up initial permissions
    const administratorGroupSection = userManagement.getAdministratorGroupSection();
    const userGroupSection = userManagement.getUserGroupSection();

    // Debug: Intercept groups API call
    cy.intercept('GET', '/api/groups-config').as('getGroups');
    
    // Click to trigger groups load using the correct selector
    administratorGroupSection.findMultiGroupInput().click();
    
    // Wait for API response    
    
    // Debug: Log what's in the response
    cy.get('@getGroups').then((interception) => {
      cy.log('API Response:', interception);
    });
    
    // Now proceed with selection
    administratorGroupSection.findMultiGroupInput().clear().type('rhods-admins');
    administratorGroupSection.findMultiGroupOptions('rhods-admins').should('exist');
    administratorGroupSection.findMultiGroupOptions('rhods-admins').find('li').should('have.length.gt', 0);
    
    userGroupSection.findMultiGroupInput().type('rhods-users');
    userGroupSection.findMultiGroupOptions('rhods-users').click();
    userGroupSection.findChipItem('rhods-users').should('exist');

    // Verify submit button is enabled
    userManagement.findSubmitButton().should('be.enabled');

    // Save changes
    userManagement.findSubmitButton().click();
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
      administratorGroupSection.removeChipItem('system:authenticated');
      administratorGroupSection.findMultiGroupInput().type('system:authenticated');
      administratorGroupSection.findMultiGroupOptions('system:authenticated').click();
      administratorGroupSection.findChipItem('system:authenticated').should('exist');

      userManagement.findSubmitButton().should('be.enabled');
      userManagement.findSubmitButton().click();
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
