import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import {
  asProductAdminUser,
  asProjectEditUser,
} from '@odh-dashboard/cypress/cypress/utils/mockUsers';
import { runtimeImageInstallPage } from '@odh-dashboard/cypress/cypress/pages/modelDeploymentSettings/runtimeImageInstall';

const initialize = (runtimeCatalogFlagEnabled: boolean) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: { [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' } },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelServing: false,
      disableKServe: false,
      runtimeCatalog: runtimeCatalogFlagEnabled,
    }),
  );
  cy.interceptOdh('GET /api/cluster-settings', {
    userTrackingEnabled: false,
    cullerTimeout: 31536000,
    pvcSize: 20,
    modelServingPlatformEnabled: { kServe: true, LLMd: true },
  });
};

// TODO replace this with an import from test fixtures once packages/model-serving/src/components/runtimeImageInstall/mockRuntimeImageActionData.ts moves into packages/model-serving/src/__mocks__.
// It is needed in production code temporarily as placeholder data.
const placeholderRuntimeImageName = 'vLLM 0.6.0';

describe('Runtime image Install extension navigation', () => {
  it('should not expose the install button when the area is disabled', () => {
    asProductAdminUser();
    initialize(false);
    // TODO this is a placeholder, RHOAIENG-96642 will replace the install extension point on General Settings with one on the runtime library details page and we'll make the test go there
    cy.visitWithLogin(
      '/settings/model-resources-operations/model-deployment-settings/general-settings',
    );
    runtimeImageInstallPage.findInstallButton().should('not.exist');
  });

  it('should open install page even if no install target extension is available', () => {
    asProductAdminUser();
    initialize(true);
    // TODO this is a placeholder, RHOAIENG-96642 will replace the install extension point on General Settings with one on the runtime library details page and we'll make the test go there
    cy.visitWithLogin(
      '/settings/model-resources-operations/model-deployment-settings/general-settings',
    );
    runtimeImageInstallPage.findInstallButton().should('exist').click();
    cy.url().should('include', '/placeholder-runtime-library-details-page/install');
    runtimeImageInstallPage.findServingRuntimeRadio().should('not.exist');
    runtimeImageInstallPage.findAcceleratorRadio().should('not.exist');
    runtimeImageInstallPage.findUnavailableMessage().should('exist');
    runtimeImageInstallPage.findNext().should('not.exist');
    cy.testA11y();
  });

  // TODO tests that open the install wizard with install target extensions available will be added in https://redhat.atlassian.net/browse/RHOAIENG-96639 and https://redhat.atlassian.net/browse/RHOAIENG-96640

  it('should not allow a non-admin user to open the route', () => {
    asProjectEditUser();
    initialize(true);
    runtimeImageInstallPage.visitInstallDirectly();
    runtimeImageInstallPage.findPageTitle(placeholderRuntimeImageName).should('not.exist');
  });

  it('should handle a runtime image with no supported resources', () => {
    asProductAdminUser();
    initialize(true);
    runtimeImageInstallPage.visitInstallDirectly();
    // TODO this return route is a placeholder, RHOAIENG-96642 will replace the install extension point on General Settings with one on the runtime library details page and we'll make the test go there
    runtimeImageInstallPage.loadNoResourceRouterState(
      '/settings/model-resources-operations/model-deployment-settings/general-settings',
    );
    runtimeImageInstallPage.findNoResourcesMessage().should('exist');
    runtimeImageInstallPage.findReturn().click();
    cy.url().should('include', '/general-settings');
  });

  it('should show an actionable unavailable state on direct navigation without router data', () => {
    asProductAdminUser();
    initialize(true);
    runtimeImageInstallPage.visitInstallDirectly();
    runtimeImageInstallPage.findInvalidDataAlert().should('exist');
    runtimeImageInstallPage.findReturn().click();
    cy.url().should('include', '/general-settings');
  });
});
