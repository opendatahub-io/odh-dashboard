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

  beforeEach(() => {
    // Clear any existing sessions before each test
    cy.clearCookies();
    cy.clearLocalStorage();
    adminSession = ''; // Reset admin session
  });

  retryableBefore(() => {
    // Use real groups config instead of mock
    getGroupsConfig().then((result) => {
      cy.wrap(result).as('groupsConfig');
    });
  });

  it(
    'Set up initial permissions as admin',
    { tags: ['@Destructive', '@ODS-1660', '@Dashboard'] },
    () => {
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
    },
  );

  it(
    'Verify unauthorized user cannot access settings',
    { tags: ['@Destructive', '@ODS-1660', '@Dashboard'] },
    () => {
      // Clear all session state
      cy.clearCookies();
      cy.clearLocalStorage();
      cy.window().then((win) => {
        win.sessionStorage.clear();
      });

      // Force reload
      cy.reload(true);

      // Explicitly pass TEST_USER_4 credentials
      cy.step('Login as unauthorized user');
      cy.visitWithLogin('/', {
        AUTH_TYPE: 'ldap-provider-qe',
        USERNAME: 'ldap-user9',
        PASSWORD: 'rhodsPW#1',
      });

      cy.step('Attempt to access User Management');
      // Try to access the settings page directly
      cy.visit('/groupSettings', { failOnStatusCode: false });

      // Verify we get the not found page
      cy.step('Verify unauthorized access shows not found page');
      notFoundPage.getNotFoundPage().should('exist');
      notFoundPage.getDescription().should('contain', 'Another page might have what you need');
      notFoundPage.getHomeButton().should('exist');
      userManagement.findNavItem().should('not.exist');
    },
  );
});
