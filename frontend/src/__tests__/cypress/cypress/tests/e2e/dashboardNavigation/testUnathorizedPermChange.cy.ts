import { getGroupsConfig } from '~/__tests__/cypress/cypress/utils/oc_commands/groupConfig';
import {
  HTPASSWD_CLUSTER_ADMIN_USER,
  TEST_USER_4,
} from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { userManagement } from '~/__tests__/cypress/cypress/pages/userManagement';
import { retryableBeforeEach } from '~/__tests__/cypress/cypress/utils/retryableHooks';
import { notFoundPage } from '~/__tests__/cypress/cypress/pages/notFound';

describe('Dashboard Navigation - Unauthorized Permission Change', () => {
  retryableBeforeEach(() => {
    // Clear any existing sessions before each test
    cy.clearCookies();
    cy.clearLocalStorage();

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
      userManagement.navigate();

      // Set up initial permissions
      const administratorGroupSection = userManagement.getAdministratorGroupSection();
      const userGroupSection = userManagement.getUserGroupSection();

      // Wait for the administrator group section to be fully loaded
      administratorGroupSection.find().should('be.visible');

      // Clear existing selections and type new group
      administratorGroupSection
        .findMultiGroupInput()
        .should('be.visible')
        .clear()
        .should('have.value', '')
        .type('rhods-admins{enter}', { delay: 100 });

      // Verify the selection was made
      administratorGroupSection.findMultiGroupInput().should('have.value', 'rhods-admins');

      // Clear existing selections
      userGroupSection.clearMultiChipItem();

      // Select the group using the dropdown
      userGroupSection.findMultiGroupSelectButton().click();
      userGroupSection.findMultiGroupOptions('rhods-users').click();
      // Click outside the dropdown to close it
      cy.findByTestId('app-page-title').click();

      // Wait for any animations and ensure dropdown is gone
      cy.get('[role="listbox"]').should('not.exist');

      // Verify selection by checking if the submit button becomes enabled
      userManagement
        .findSubmitButton()
        .should('be.enabled', { timeout: 30000 })
        .should('be.visible');
      // Click the submit button
      userManagement.findSubmitButton().click();

      // Verify the success message appears
      userManagement.shouldHaveSuccessAlertMessage();
    },
  );

  it(
    'Verify unauthorized user cannot access settings',
    { tags: ['@Destructive', '@ODS-1660', '@Dashboard'] },
    () => {
      cy.step('Login as unauthorized user');
      cy.visitWithLogin('/', TEST_USER_4);

      cy.step('Attempt to access User Management');
      // Try to access the settings page directly
      cy.visit('/groupSettings', { failOnStatusCode: false });

      // Verify we get the not found page
      cy.step('Verify unauthorized access shows not found page');
      notFoundPage.findNotFoundPage().should('exist');
      notFoundPage.findDescription().should('contain', 'Another page might have what you need');
      notFoundPage.findHomeButton().should('exist');
      userManagement.findNavItem().should('not.exist');
    },
  );
});
