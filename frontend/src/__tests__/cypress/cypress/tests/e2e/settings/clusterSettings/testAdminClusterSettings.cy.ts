import {
  HTPASSWD_CLUSTER_ADMIN_USER,
  LDAP_CONTRIBUTOR_USER,
} from '~/__tests__/cypress/cypress/utils/e2eUsers';
import { clusterSettings } from '~/__tests__/cypress/cypress/pages/clusterSettings';
import { pageNotfound } from '~/__tests__/cypress/cypress/pages/pageNotFound';
import type { DashboardConfig, NotebookControllerConfig } from '~/__tests__/cypress/cypress/types';
import {
  validateModelServingPlatforms,
  validatePVCSize,
  validateStopIdleNotebooks,
  validateNotebookPodTolerations,
} from '~/__tests__/cypress/cypress/utils/clusterSettingsUtils';

describe('Verify that only the Cluster Admin can access Cluster Settings', () => {
  let dashboardConfig: DashboardConfig;
  let notebookControllerConfig: NotebookControllerConfig;

  before(() => {
    // Retrieve the dashboard configuration
    cy.getDashboardConfig().then((config) => {
      dashboardConfig = config as DashboardConfig;
      cy.log('Dashboard Config:', JSON.stringify(dashboardConfig, null, 2));
    });
    // Retrieve the Notebook controller configuration
    cy.getNotebookControllerConfig().then((config) => {
      notebookControllerConfig = config as NotebookControllerConfig;
      cy.log('Controller Config:', JSON.stringify(notebookControllerConfig, null, 2));
    });
  });

  it('Admin should access Cluster Settings and see UI fields matching OpenShift configurations', () => {
    // Authentication and navigation
    cy.step('Log into the application');
    cy.visitWithLogin('/', HTPASSWD_CLUSTER_ADMIN_USER);

    cy.step('Navigate to Cluster Settings');
    clusterSettings.visit();

    // Validate model serving displays based on OpenShift command to 'get OdhDashboardConfig' to validate configuration
    cy.step('Validate Model Serving Platforms display and are checked');
    validateModelServingPlatforms(dashboardConfig);

    // Validate pvc size based on OpenShift command to 'get OdhDashboardConfig' to validate configuration
    cy.step('Validate PVC Size displays and default displays');
    validatePVCSize(dashboardConfig);

    // Validate Stop idle notebooks based on OpenShift command to 'notebook-controller' to validate configuration
    cy.step('Validate Stop idle notebooks displays and fields are enabled/disabled');
    validateStopIdleNotebooks(notebookControllerConfig);

    // Validate notebook pod tolerations displays based on OpenShift command to 'get OdhDashboardConfig' to validate configuration
    cy.step('Validate Notebook pod tolerations displays and fields are enabled/disabled');
    validateNotebookPodTolerations(dashboardConfig);
  });
  it('Test User - should not have access rights to view the Cluster Settings tab', () => {
    cy.step('Log into the application');
    cy.visitWithLogin('/', LDAP_CONTRIBUTOR_USER);

    cy.step('Navigate to the Cluster Settings');
    clusterSettings.visit(false);

    pageNotfound.findPage().should('exist');

    clusterSettings.findNavItem().should('not.exist');
  });
});
