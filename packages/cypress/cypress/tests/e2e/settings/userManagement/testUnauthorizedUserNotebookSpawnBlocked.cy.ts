import { LDAP_CONTRIBUTOR_USER } from '../../../../utils/e2eUsers';
import { header } from '../../../../pages/components/Header';
import {
  restoreDefaultGroupsConfig,
  updateGroupsConfig,
} from '../../../../utils/oc_commands/groupConfig';

describe('Verify Unauthorized User Is Not Able To Spawn Jupyter Notebook', () => {
  before(() => {
    // Restrict dashboard access to rhods-admins members only.
    // Matches the original test which cleared all user groups then selected rhods-admins before saving.
    // Admin groups are left at their default (rhods-admins) so cluster admin access is preserved.
    cy.step('Set user (allowed) groups to rhods-admins only');
    updateGroupsConfig('rhods-admins', 'rhods-admins');
  });

  after(() => {
    cy.step('Restore default groups configuration');
    restoreDefaultGroupsConfig();
  });

  it(
    'Verify that the Non-admin user does not have access to Dashboard or Jupyter Notebooks',
    // Note - this test should not be executed alongside Smoke/Sanity as it has the potential to cause breakages within those tests
    { tags: ['@Destructive', '@ODS-1680', '@Dashboard', '@NonConcurrent'] },
    () => {
      cy.step('Log into the application as a Non-admin user');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      cy.step('Verify that the Dashboard is not accessible');
      header.findUnauthorizedErrorSection().should('be.visible');
      header.findUnauthorizedErrorTitle().should('exist');

      cy.step('Verify that Jupyter Notebooks are also not accessible');
      cy.visit(`/notebook-controller/spawner`);
      header.findUnauthorizedErrorSection().should('be.visible');
      header.findUnauthorizedErrorTitle().should('exist');
    },
  );
});
