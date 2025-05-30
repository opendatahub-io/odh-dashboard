import { getGroupsConfig } from '#~/__tests__/cypress/cypress/utils/oc_commands/groupConfig';
import {
  HTPASSWD_CLUSTER_ADMIN_USER,
  LDAP_CONTRIBUTOR_USER,
} from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { userManagement } from '#~/__tests__/cypress/cypress/pages/userManagement';
import { retryableBeforeEach } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import { notFoundPage } from '#~/__tests__/cypress/cypress/pages/notFound';

describe('Settings - User Management - Unauthorized Permission Change', () => {
  retryableBeforeEach(() => {
    // Clear any existing sessions before each test
    cy.clearCookies();
    cy.clearLocalStorage();

    // Use real groups config instead of mock
    getGroupsConfig().then((result) => {
      cy.wrap(result).as('groupsConfig');
    });
  });

  after(() => {
    // Clear cookies and local storage
    cy.clearCookies();
    cy.clearLocalStorage();

    // Reload the page forcefully
    cy.reload(true);

    // Authentication and navigation
    cy.step('Login as an Admin and restore settings');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

    // Visit User Management
    cy.step('Visit User Management');
    userManagement.visit();

    cy.step('Clear the current Data Science User Groups');
    userManagement.getUserGroupSection().clearMultiChipItem();
    const userGroupSection = userManagement.getUserGroupSection();

    cy.step('Select system:authenticated and save it');
    // Click the text field to open the dropdown
    userGroupSection.findMultiGroupSelectButton().click();
    // Click the 'system:authenticated' option from the dropdown
    userGroupSection.findMultiGroupOptions('system:authenticated').click();
    // Click outside the dropdown to close it
    cy.findByTestId('app-page-title').click();
    // Submit the form
    userManagement.findSubmitButton().click();
    // Validate that changes were saved successfully
    userManagement.shouldHaveSuccessAlertMessage();
  });

  it(
    'Set up initial permissions as admin',
    { tags: ['@Destructive', '@ODS-1660', '@Dashboard', '@NonConcurrent'] },
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
        .type('rhods-admins{enter}');

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
    { tags: ['@Destructive', '@ODS-1660', '@Dashboard', '@NonConcurrent'] },
    () => {
      cy.step('Login as unauthorized user');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

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

after(() => {
  // Clear cookies and local storage
  cy.clearCookies();
  cy.clearLocalStorage();

  // Reload the page forcefully
  cy.reload(true);

  // Authentication and navigation
  cy.step('Login as an Admin and restore settings');
  cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

  // Visit User Management
  cy.step('Visit User Management');
  userManagement.visit();

  cy.step('Clear the current Data Science User Groups');
  userManagement.getUserGroupSection().clearMultiChipItem();
  const userGroupSection = userManagement.getUserGroupSection();

  cy.step('Select system:authenticated and save it');
  // Click the text field to open the dropdown
  userGroupSection.findMultiGroupSelectButton().click();
  // Click the 'system:authenticated' option from the dropdown
  userGroupSection.findMultiGroupOptions('system:authenticated').click();
  // Click outside the dropdown to close it
  cy.findByTestId('app-page-title').click();
  // Submit the form
  userManagement.findSubmitButton().click();
  // Validate that changes were saved successfully
  userManagement.shouldHaveSuccessAlertMessage();
});
