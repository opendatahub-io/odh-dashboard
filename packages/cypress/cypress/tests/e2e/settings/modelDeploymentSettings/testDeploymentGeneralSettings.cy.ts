import { LDAP_CONTRIBUTOR_USER, LDAP_CLUSTER_ADMIN_USER } from '../../../../utils/e2eUsers';
import { generalSettingsPage } from '../../../../pages/modelDeploymentSettings/generalSettings';
import { pageNotfound } from '../../../../pages/pageNotFound';
import type { DashboardConfig } from '../../../../types';
import { validateModelServingPlatforms } from '../../../../utils/modelDeploymentSettingsUtils';
import { retryableBefore } from '../../../../utils/retryableHooks';

describe('Verify Model Deployment General Settings access and model-serving controls', () => {
  let dashboardConfig: DashboardConfig;

  retryableBefore(() => {
    // Retrieve the dashboard configuration to validate the model-serving switch against
    return cy.getDashboardConfig().then((config) => {
      dashboardConfig = config as DashboardConfig;
      cy.log('Dashboard Config:', JSON.stringify(dashboardConfig, null, 2));
    });
  });

  it(
    'Admin should access Model Deployment General Settings and see the model-serving switch matching OpenShift configuration',
    {
      tags: [
        '@Smoke',
        '@SmokeSet2',
        '@ODS-1216',
        '@Dashboard',
        '@ci-dashboard-regression-tags',
        '@SettingsCI',
      ],
    },
    () => {
      cy.step('Log into the application as admin');
      cy.visitWithLogin('/', LDAP_CLUSTER_ADMIN_USER);

      // Validate the model-serving platform switch on the General settings tab based on the
      // OpenShift 'get OdhDashboardConfig' configuration. validateModelServingPlatforms
      // navigates to the tab itself before asserting.
      cy.step('Validate Model Serving Platforms display and are checked');
      validateModelServingPlatforms(dashboardConfig);
    },
  );

  it(
    'Test User - should not have access rights to view the Model Deployment Settings tab',
    {
      tags: [
        '@Smoke',
        '@SmokeSet2',
        '@ODS-1216',
        '@Dashboard',
        '@ci-dashboard-regression-tags',
        '@SettingsCI',
      ],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

      cy.step('Navigate to the Model Deployment General Settings tab');
      cy.visitWithLogin(
        '/settings/model-resources-operations/model-deployment-settings/general-settings',
        LDAP_CONTRIBUTOR_USER,
      );

      pageNotfound.findPage().should('exist');

      generalSettingsPage.findNavItem().should('not.exist');
    },
  );
});
