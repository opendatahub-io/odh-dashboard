import { LDAP_ADMIN_USER, LDAP_CONTRIBUTOR_USER } from '../../../utils/e2eUsers';
import { infrastructurePage } from '../../../pages/infrastructure';
import { isKueueUnmanaged } from '../../../utils/oc_commands/dsc';

describe('GPUaaS Infrastructure Page', () => {
  before(() => {
    cy.step('Verify Kueue is set to Unmanaged in the DataScienceCluster');
    isKueueUnmanaged().should('equal', true);
  });

  it(
    'Verify Infrastructure page is accessible for admin users and displays expected sections',
    { tags: ['@Dashboard', '@GPUaaS', '@Featureflagged'] },
    () => {
      cy.step('Log in as admin user with gpuaas feature flag enabled');
      cy.visitWithLogin('/?devFeatureFlags=gpuaas=true', LDAP_ADMIN_USER);

      cy.step('Verify Infrastructure nav item is visible under Observe & monitor');
      infrastructurePage.findNavItem().should('be.visible');

      cy.step('Click Infrastructure nav item and verify navigation');
      infrastructurePage.findNavItem().click();
      cy.url().should('include', '/observe-and-monitor/infrastructure');

      cy.step('Verify page title and subtitle are displayed');
      infrastructurePage.shouldHavePageTitle();
      infrastructurePage.findPageSubtitle().should('be.visible');

      cy.step('Verify Cluster section is present');
      infrastructurePage.findClusterSection().should('exist');

      cy.step('Verify Hardware usage section is present');
      infrastructurePage.findHardwareUsageSection().should('exist');

      cy.step('Verify Borrowing & lending section is present');
      infrastructurePage.findBorrowingLendingSection().should('exist');

      cy.step('Verify Cluster queue utilization section is present');
      infrastructurePage.findClusterQueueUtilizationSection().should('exist');
    },
  );

  it(
    'Verify Infrastructure page is not accessible for non-admin users',
    { tags: ['@Dashboard', '@GPUaaS', '@Featureflagged'] },
    () => {
      cy.step('Log in as non-admin user with gpuaas feature flag enabled');
      cy.visitWithLogin('/?devFeatureFlags=gpuaas=true', LDAP_CONTRIBUTOR_USER);

      cy.step('Verify Infrastructure nav item is NOT visible');
      infrastructurePage.findNavItem().should('not.exist');

      cy.step('Navigate directly to Infrastructure page URL');
      cy.visitWithLogin(
        '/observe-and-monitor/infrastructure?devFeatureFlags=gpuaas=true',
        LDAP_CONTRIBUTOR_USER,
      );

      cy.step('Verify page does not render for non-admin');
      infrastructurePage.shouldNotFoundPage();
    },
  );
});
