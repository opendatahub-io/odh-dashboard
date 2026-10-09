import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockServingRuntimeK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeK8sResource';
import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
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
import { llmAcceleratorConfigurations } from '@odh-dashboard/cypress/cypress/pages/modelDeploymentSettings/llmAcceleratorConfigurations';
import { pageNotfound } from '@odh-dashboard/cypress/cypress/pages/pageNotFound';

const acceleratorConfigModel = {
  apiGroup: 'serving.kserve.io',
  apiVersion: 'v1alpha2',
  kind: 'LLMInferenceServiceConfig',
  plural: 'llminferenceserviceconfigs',
};

const initialize = (runtimeCatalogFlagEnabled: boolean, acceleratorEnabled = true) => {
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
      disableLLMd: false,
      vLLMDeploymentOnMaaS: acceleratorEnabled,
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

  it('should hide the LLM install target when its feature gate is inactive', () => {
    asProductAdminUser();
    initialize(true, false);
    cy.visitWithLogin(
      '/settings/model-resources-operations/model-deployment-settings/general-settings',
    );
    runtimeImageInstallPage.findInstallButton().click();
    runtimeImageInstallPage.findAcceleratorRadio().should('not.exist');
    runtimeImageInstallPage.findServingRuntimeRadio().should('exist');
  });

  it('should create a prefilled LLM accelerator config and redirect to its list', () => {
    asProductAdminUser();
    initialize(true);
    const createdConfig = mockLLMInferenceServiceConfigK8sResource({
      name: 'vllm-0-6-0',
      displayName: 'vLLM 0.6.0',
      runtimeVersion: '0.6.0',
    });
    cy.interceptK8s('POST', { model: acceleratorConfigModel }, createdConfig).as(
      'createAcceleratorConfig',
    );
    cy.interceptK8sList(
      { model: acceleratorConfigModel, ns: 'opendatahub' },
      mockK8sResourceList([createdConfig]),
    );
    cy.visitWithLogin(
      '/settings/model-resources-operations/model-deployment-settings/general-settings',
    );
    runtimeImageInstallPage.findInstallButton().click();
    runtimeImageInstallPage.findAcceleratorRadio().check();
    runtimeImageInstallPage.findNext().click();
    llmAcceleratorConfigurations.findNameInput().should('have.value', 'vLLM 0.6.0');
    llmAcceleratorConfigurations.findVersionInput().should('have.value', '0.6.0');
    llmAcceleratorConfigurations.findYAMLCodeEditor().waitForReady();
    llmAcceleratorConfigurations.findYAMLCodeEditor().containsText('LLMInferenceServiceConfig');
    cy.testA11y();
    llmAcceleratorConfigurations.findSubmitButton().should('be.enabled').click();
    cy.wait('@createAcceleratorConfig').then(({ request }) => {
      expect(request.body).to.containSubset({
        apiVersion: 'serving.kserve.io/v1alpha2',
        kind: 'LLMInferenceServiceConfig',
        metadata: {
          name: 'vllm-0-6-0',
          namespace: 'opendatahub',
          annotations: {
            'openshift.io/display-name': 'vLLM 0.6.0',
            'opendatahub.io/runtime-version': '0.6.0',
          },
          labels: {
            'opendatahub.io/dashboard': 'true',
            'opendatahub.io/config-type': 'accelerator',
          },
        },
        spec: {
          template: {
            containers: [{ name: 'main', image: 'quay.io/example/vllm:0.6.0' }],
          },
        },
      });
    });
    cy.url().should('include', '/llm-accelerator-configurations');
    llmAcceleratorConfigurations.getRowByName('vllm-0-6-0').find().should('exist');
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
});
