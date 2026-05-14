import {
  restoreDefaultGroupsConfig,
  updateGroupsConfig,
} from '../../../../utils/oc_commands/groupConfig';
import { HTPASSWD_CLUSTER_ADMIN_USER, LDAP_CONTRIBUTOR_USER } from '../../../../utils/e2eUsers';
import { userManagement } from '../../../../pages/userManagement';
import { retryableBeforeEach } from '../../../../utils/retryableHooks';
import { notFoundPage } from '../../../../pages/notFound';

describe('Settings - User Management - Unauthorized Permission Change', () => {
  retryableBeforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  after(() => {
    cy.step('Restore default groups configuration');
    restoreDefaultGroupsConfig();
  });

  it(
    'Set up initial permissions as admin',
    { tags: ['@Destructive', '@ODS-1660', '@Dashboard', '@NonConcurrent'] },
    () => {
      cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

      // Set admin = rhods-admins only, user = rhods-users only — same end state as the original
      // test which cleared all groups then selected specific ones before saving.
      cy.step('Set admin groups to rhods-admins and user groups to rhods-users');
      updateGroupsConfig('rhods-admins', 'rhods-users');

      // Verify the new UI reflects the OC-commanded change
      cy.step('Verify User Management page reflects the updated groups');
      userManagement.navigate();
      userManagement.getAdministratorGroupSection().findGroupRow('rhods-admins').should('exist');
      userManagement.getUserGroupSection().findGroupRow('rhods-users').should('exist');
    },
  );

  it(
    'Verify unauthorized user cannot access settings',
    { tags: ['@Destructive', '@ODS-1660', '@Dashboard', '@NonConcurrent'] },
    () => {
      cy.step('Login as unauthorized user');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      cy.step('Attempt to access User Management directly');
      cy.visit('/settings/user-management', { failOnStatusCode: false });

      cy.step('Verify unauthorized access shows not found page');
      notFoundPage.findNotFoundPage().should('exist');
      notFoundPage.findDescription().should('not.be.empty');
      notFoundPage.findHomeButton().should('exist');
      userManagement.findNavItem().should('not.exist');
    },
  );
});
