import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockServingRuntimeK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeK8sResource';
import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import {
  ServingRuntimeAPIProtocol,
  ServingRuntimeModelType,
} from '@odh-dashboard/model-serving/shared';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import {
  asProductAdminUser,
  asProjectEditUser,
} from '@odh-dashboard/cypress/cypress/utils/mockUsers';
import { runtimeImageInstallPage } from '@odh-dashboard/cypress/cypress/pages/modelDeploymentSettings/runtimeImageInstall';
import { pageNotfound } from '@odh-dashboard/cypress/cypress/pages/pageNotFound';

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

  it('should not allow a non-admin user to open the route', () => {
    asProjectEditUser();
    initialize(true);
    runtimeImageInstallPage.visitInstallDirectly();
    pageNotfound.findPage().should('exist');
    runtimeImageInstallPage.findInvalidDataAlert().should('not.exist');
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

  it('should install a prefilled Serving runtime template and redirect to its list', () => {
    asProductAdminUser();
    initialize(true);
    const template = mockServingRuntimeTemplateK8sResource({
      name: 'vllm-0-6-0',
      modelTypes: [ServingRuntimeModelType.GENERATIVE],
    });
    cy.interceptOdh(
      'GET /api/templates/:namespace',
      {
        path: { namespace: 'opendatahub' },
        query: { labelSelector: 'opendatahub.io/dashboard=true' },
      },
      mockK8sResourceList([]),
    ).as('existingTemplates');
    cy.interceptOdh(
      'POST /api/servingRuntimes/',
      { query: { dryRun: 'All' } },
      mockServingRuntimeK8sResource({ name: 'vllm-0-6-0' }),
    ).as('dryRunServingRuntime');
    cy.interceptOdh('POST /api/templates/', template).as('createTemplate');

    cy.visitWithLogin(
      '/settings/model-resources-operations/model-deployment-settings/general-settings',
    );
    runtimeImageInstallPage.findInstallButton().click();
    runtimeImageInstallPage.findServingRuntimeRadio().check();
    runtimeImageInstallPage.findNext().click();
    runtimeImageInstallPage.findServingRuntimeEditor().waitForReady();
    cy.testA11y();
    runtimeImageInstallPage.findServingRuntimeEditor().containsText('vllm-0-6-0');
    runtimeImageInstallPage
      .findServingRuntimeProtocol()
      .should('contain.text', ServingRuntimeAPIProtocol.REST);
    runtimeImageInstallPage
      .findServingRuntimeModelTypes()
      .should('contain.text', 'Select model types');
    runtimeImageInstallPage.findCreate().should('be.enabled').click();
    cy.wait('@existingTemplates');
    cy.wait('@dryRunServingRuntime');
    cy.wait('@createTemplate').then(({ request }) => {
      expect(request.body.kind).to.equal('Template');
      expect(request.body.objects[0].kind).to.equal('ServingRuntime');
      expect(request.body.metadata.annotations).to.include({
        'opendatahub.io/modelServingSupport': '["single"]',
        'opendatahub.io/model-type': JSON.stringify([ServingRuntimeModelType.GENERATIVE]),
        'opendatahub.io/apiProtocol': ServingRuntimeAPIProtocol.REST,
      });
    });
    cy.url().should('include', '/serving-runtime-templates');
  });

  // TODO LLM accelerator Step 2 browser coverage belongs to RHOAIENG-96640.
});
