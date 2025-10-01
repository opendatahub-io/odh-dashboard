import {
  HTPASSWD_CLUSTER_ADMIN_USER,
  LDAP_CONTRIBUTOR_USER,
} from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { userManagement } from '#~/__tests__/cypress/cypress/pages/userManagement';
import { header } from '#~/__tests__/cypress/cypress/pages/components/Header';

describe('Verify Unauthorized User Is Not Able To Spawn Jupyter Notebook', () => {
  it(
    'Remove Admin privileges and apply access to the Dashboard only to Admin',
    // Note - this test should not executed alongside Smoke/Sanity as it has the potential to cause breakages within those tests
    { tags: ['@Destructive', '@ODS-1680', '@Dashboard', '@NonConcurrent'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Navigate to User Management
      cy.step('Navigate to User Management');
      userManagement.navigate();

      // Remove system:authenticated from the Data Science User Groups and apply rhods-admins only permissions
      cy.step('Clear the current Data Science User Groups');
      userManagement.getUserGroupSection().clearMultiChipItem();
      const userGroupSection = userManagement.getUserGroupSection();

      cy.step('Select rhods-admin and save it');
      // Click the text field to open the dropdown
      userGroupSection.findMultiGroupSelectButton().click();
      // Click the 'rhods-admin' option from the dropdown
      userGroupSection.findMultiGroupOptions('rhods-admins').click();
      // Click outside the dropdown to close it (e.g., clicking on the page title)
      cy.findByTestId('app-page-title').click();
      // Submit the form
      userManagement.findSubmitButton().click();
      // Validate that changes were saved successfully
      userManagement.shouldHaveSuccessAlertMessage();
    },
  );
  it(
    'Login as the Admin and verify that the user does not have acceess to any tabs/applications',
    // Note - this test should not executed alongside Smoke/Sanity as it has the potential to cause breakages within those tests
    { tags: ['@Destructive', '@ODS-1680', '@Dashboard', '@NonConcurrent'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application as a Non-admin');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      // Validate that the Dashboard and Jupyter Notebooks are not accessible
      cy.step('Verify that the Dashboard is not accessible');
      header.findUnauthorizedErrorSection().should('be.visible');
      header.findUnauthorizedErrorSection().contains('Access permissions needed').should('exist');

      cy.step('Verify that Jupyter Notebooks are also not accessible');
      cy.visit(`/notebook-controller/spawner`);
      header.findUnauthorizedErrorSection().should('be.visible');
      header.findUnauthorizedErrorSection().contains('Access permissions needed').should('exist');
    },
  );

  after(() => {
    // Clear cookies and local storage
    cy.clearCookies();
    cy.clearLocalStorage();

    // Reload the page forcefully
    cy.reload(true);

    // Authentication and navigation
    cy.step('Login as an Admnin and restore settings');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

    // Visit User Management
    cy.step('Visit User Management');
    userManagement.visit();

    cy.step('Clear the current Data Science User Groups');
    userManagement.getUserGroupSection().clearMultiChipItem();
    const userGroupSection = userManagement.getUserGroupSection();

    cy.step('Select rhods-admin and save it');
    // Click the text field to open the dropdown
    userGroupSection.findMultiGroupSelectButton().click();
    // Click the 'rhods-admin' option from the dropdown
    userGroupSection.findMultiGroupOptions('system:authenticated').click();
    // Click outside the dropdown to close it (e.g., clicking on the page title)
    cy.findByTestId('app-page-title').click();
    // Submit the form
    userManagement.findSubmitButton().click();
    // Validate that changes were saved successfully
    userManagement.shouldHaveSuccessAlertMessage();
  });
});
