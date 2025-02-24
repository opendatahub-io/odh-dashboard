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

    // Wait for the administrator group section to be fully loaded
    administratorGroupSection.find().should('be.visible');

    // Debug: Log the current state
    cy.log('Starting group selection process');

    // Clear existing selections and type new group
    administratorGroupSection
      .findMultiGroupInput()
      .should('be.visible')
      .clear()
      .should('have.value', '')
      .type('rhods-admins{enter}', { delay: 100 });

    // Verify the selection was made
    administratorGroupSection.findMultiGroupInput().should('have.value', 'rhods-admins');

    // Add a wait to ensure the UI processes the selection
    cy.wait(1000);

    // Debug: Log starting user group selection
    cy.log('Starting user group selection');

    // Get the user group input and ensure we only have one
    userGroupSection
      .findMultiGroupInput()
      .should('be.visible')
      .should('have.length', 1)
      .as('userGroupInput')
      .clear()
      .should('have.value', '')
      .type('rhods-users', { delay: 100 });

    // Wait for dropdown and select option
    cy.get('[role="listbox"]')
      .should('be.visible')
      .and('contain.text', 'rhods-users')
      .within(() => {
        cy.get('[role="option"]')
          .contains('rhods-users')
          .should('be.visible')
          .click({ force: true });
      });

    // Press Escape to ensure dropdown is closed
    cy.get('@userGroupInput').type('{esc}');

    // Click somewhere neutral to ensure dropdown is closed
    cy.get('body').click(0, 0);

    // Wait for any animations and ensure dropdown is gone
    cy.get('[role="listbox"]').should('not.exist');

    // Verify selection by checking if the submit button becomes enabled
    userManagement
      .findSubmitButton()
      .should('be.enabled', { timeout: 30000 })
      .should('be.visible')
      .then(($btn) => {
        cy.log(`Button is now enabled, proceeding with submission`);
      });

    // Click the submit button
    userManagement.findSubmitButton().click();

    // Verify the success message appears
    userManagement.shouldHaveSuccessAlertMessage();

    // Store admin session cookie
    cy.getCookie('_oauth_proxy').then((cookie) => {
      if (!cookie) throw new Error('Admin session cookie not found');
      adminSession = cookie.value;
    });
  });

  it.only('Verify unauthorized user cannot access settings', () => {
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
