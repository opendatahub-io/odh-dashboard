import {
  HTPASSWD_CLUSTER_ADMIN_USER,
  LDAP_CONTRIBUTOR_USER,
} from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import {
  notebookController,
  administration,
} from '#~/__tests__/cypress/cypress/pages/administration';

describe('Verify Notebook Server Administration', () => {
  it(
    'Verify Admin User Can Access Notebook Administration',
    { tags: ['@Smoke', '@SmokeSet1', '@Dashboard', '@NotebookAdministration'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Navigate to Notebook Administration
      cy.step('Navigate to the Notebook Administration Tab');
      notebookController.visit();
      notebookController.findAdministrationTab().click();

      //Confirm that the Page has loaded successfully
      cy.step('Confirm the page has loaded successfully');
      notebookController.findAppTitle().should('exist');
      administration.findManageUsersAlert().should('exist');
      administration.findStopAllServersButton().should('exist');
    },
  );
  it(
    'Verify Non-Admin User cannot Access Notebook Administration',
    { tags: ['@Smoke', '@SmokeSet1', '@Dashboard', '@NotebookAdministration'] },
    () => {
      // Authentication and navigation
      cy.step('Log into the application');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      // Navigate to Notebook Administration
      cy.step('Attempt to navigate to Notebook Administration');
      notebookController.visit();

      cy.step('Confirm the Notebook Admin Tab or Page is available');
      notebookController.findAdministrationTab().should('not.exist');
      administration.findManageUsersAlert().should('not.exist');
      administration.findStopAllServersButton().should('not.exist');
    },
  );
});
