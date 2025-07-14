import { HTPASSWD_CLUSTER_ADMIN_USER } from '#~/__tests__/cypress/cypress/utils/e2eUsers';
import { retryableBeforeEach } from '#~/__tests__/cypress/cypress/utils/retryableHooks';
import {
  createGroup,
  deleteGroup,
  groupExists,
} from '#~/__tests__/cypress/cypress/utils/oc_commands/groups';
import { userManagement } from '#~/__tests__/cypress/cypress/pages/userManagement';

describe('Verify a notification is shown when a user group is removed', () => {
  const GROUP_NAME = 'test-admin-group';

  retryableBeforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it(
    'Deletes a user group that has admin privileges and verifies a notification is shown',
    { tags: ['@Dashboard', '@Destructive', '@ODS-1686', '@Tier1', '@NonConcurrent'] },
    () => {
      cy.step('Create a new group using oc command');
      createGroup(GROUP_NAME).then((result) => {
        cy.log(`Group creation result: ${result.stdout}`);

        cy.step('Verify group was created');
        groupExists(GROUP_NAME).should('be.true');

        // Authentication and navigation
        cy.step('Login as an Admin');
        cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

        cy.step('Navigate to User Management');
        userManagement.navigate();

        cy.step('Add the group to administrators');
        const administratorGroupSection = userManagement.getAdministratorGroupSection();
        administratorGroupSection.findMultiGroupSelectButton().click();
        administratorGroupSection.findMultiGroupOptions(GROUP_NAME).click();
        userManagement.findSubmitButton().click();
        userManagement.shouldHaveSuccessAlertMessage();

        cy.step('Delete the group using oc command');
        deleteGroup(GROUP_NAME).then((deleteResult) => {
          cy.log(`Group deletion result: ${deleteResult.stdout}`);

          cy.step('Verify group was deleted');
          groupExists(GROUP_NAME).should('be.false');

          cy.step('Reload the page and verify notification');
          cy.reload();

          administratorGroupSection.findWarningAlert(GROUP_NAME);
        });
      });
    },
  );

  after(() => {
    cy.step('recreate group, remove from admins, then delete it');

    // recreate group
    createGroup(GROUP_NAME);

    // remove from admins
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);
    userManagement.navigate();

    // remove the group from admins
    cy.get(`[aria-label="Close ${GROUP_NAME}"]`).click();
    userManagement.findSubmitButton().click();
    userManagement.shouldHaveSuccessAlertMessage();

    deleteGroup(GROUP_NAME);
    cy.clearCookies();
    cy.clearLocalStorage();
  });
});
