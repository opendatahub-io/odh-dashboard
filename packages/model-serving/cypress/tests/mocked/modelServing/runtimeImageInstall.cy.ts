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

const initialize = ({
  modelServingEnabled = true,
  acceleratorEnabled = true,
}: { modelServingEnabled?: boolean; acceleratorEnabled?: boolean } = {}) => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: { [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' } },
    }),
  );
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelServing: !modelServingEnabled,
      disableKServe: false,
      disableLLMd: false,
      vLLMDeploymentOnMaaS: acceleratorEnabled,
    }),
  );
  cy.interceptOdh('GET /api/cluster-settings', {
    userTrackingEnabled: false,
    cullerTimeout: 31536000,
    pvcSize: 20,
    modelServingPlatformEnabled: { kServe: true, LLMd: true },
  });
};

const visitInstallWithActionData = () => {
  const actionData = mockRuntimeImageActionData();
  runtimeImageInstallPage.visitInstallDirectly(actionData.runtimeImageId);
  runtimeImageInstallPage.loadActionDataRouterState(actionData);
};

const runtimeDetailsRoute =
  '/settings/model-resources-operations/model-deployment-settings/serving-runtime-catalog/preview-vllm-0-6-0';

type RuntimeImageInstallActionDataForTest = {
  runtimeImageId: string;
  runtimeImageName: string;
  cancelReturnRoute: string;
  libraryReturnRoute: string;
  deploymentResources: {
    servingRuntimeTemplate?: string;
    llmInferenceServiceConfig?: string;
  };
};

const mockRuntimeImageActionData = (): RuntimeImageInstallActionDataForTest => {
  const llmInferenceServiceConfig = mockLLMInferenceServiceConfigK8sResource({
    name: 'vllm-0-6-0',
    displayName: 'vLLM 0.6.0',
    runtimeVersion: '0.6.0',
  });
  const firstContainer = llmInferenceServiceConfig.spec?.template?.containers?.[0];
  if (!firstContainer) {
    throw new Error('Expected the mock LLM inference service config to contain a container.');
  }
  firstContainer.image = 'quay.io/example/vllm:0.6.0';

  return {
    runtimeImageId: 'preview-vllm-0-6-0',
    runtimeImageName: 'vLLM 0.6.0',
    cancelReturnRoute: runtimeDetailsRoute,
    libraryReturnRoute:
      '/settings/model-resources-operations/model-deployment-settings/serving-runtime-catalog',
    deploymentResources: {
      servingRuntimeTemplate: JSON.stringify(
        mockServingRuntimeTemplateK8sResource({
          name: 'vllm-0-6-0',
          displayName: 'vLLM 0.6.0',
          apiProtocol: ServingRuntimeAPIProtocol.REST,
          modelTypes: [ServingRuntimeModelType.GENERATIVE],
        }),
      ),
      llmInferenceServiceConfig: JSON.stringify(llmInferenceServiceConfig),
    },
  };
};

describe('Runtime image Install extension navigation', () => {
  it('should not mount the install page when model serving is disabled', () => {
    asProductAdminUser();
    initialize({ modelServingEnabled: false });
    runtimeImageInstallPage.visitInstallDirectly('preview-vllm-0-6-0');
    pageNotfound.findPage().should('exist');
    runtimeImageInstallPage.findPageTitle('vLLM 0.6.0').should('not.exist');
    runtimeImageInstallPage.findInvalidDataAlert().should('not.exist');
  });

  it('should not allow a non-admin user to open the route', () => {
    asProjectEditUser();
    initialize();
    runtimeImageInstallPage.visitInstallDirectly('preview-vllm-0-6-0');
    pageNotfound.findPage().should('exist');
    runtimeImageInstallPage.findInvalidDataAlert().should('not.exist');
  });

  it('should handle a runtime image with no supported resources', () => {
    asProductAdminUser();
    initialize();
    runtimeImageInstallPage.visitInstallDirectly('empty-preview');
    runtimeImageInstallPage.loadNoResourceRouterState(runtimeDetailsRoute);
    runtimeImageInstallPage.findNoResourcesMessage().should('exist');
    runtimeImageInstallPage.findReturn().click();
    cy.url().should('include', '/serving-runtime-catalog/preview-vllm-0-6-0');
  });

  it('should show an actionable unavailable state on direct navigation without router data', () => {
    asProductAdminUser();
    initialize();
    runtimeImageInstallPage.visitInstallDirectly('preview-vllm-0-6-0');
    runtimeImageInstallPage.findInvalidDataAlert().should('exist');
    runtimeImageInstallPage.findReturn().click();
    cy.url().should('include', '/general-settings');
  });

  it('should hide the LLM install target when its feature gate is inactive', () => {
    asProductAdminUser();
    initialize({ acceleratorEnabled: false });
    visitInstallWithActionData();
    runtimeImageInstallPage.findAcceleratorRadio().should('not.exist');
    runtimeImageInstallPage.findServingRuntimeRadio().should('exist');
  });

  it('should create a prefilled LLM accelerator config and redirect to its list', () => {
    asProductAdminUser();
    initialize();
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
    visitInstallWithActionData();
    runtimeImageInstallPage.findAcceleratorRadio().check();
    runtimeImageInstallPage.findNext().click();
    llmAcceleratorConfigurations.findNameInput().should('have.value', 'vLLM 0.6.0');
    llmAcceleratorConfigurations.findVersionInput().should('have.value', '0.6.0');
    cy.testA11y();
    llmAcceleratorConfigurations.findSubmitButton().should('be.enabled').click();
    cy.wait('@createAcceleratorConfig').then(({ request }) => {
      expect(request.body.apiVersion).to.equal('serving.kserve.io/v1alpha2');
      expect(request.body.kind).to.equal('LLMInferenceServiceConfig');
      expect(request.body.metadata).to.include({
        name: 'vllm-0-6-0',
        namespace: 'opendatahub',
      });
      expect(request.body.metadata.annotations).to.include({
        'openshift.io/display-name': 'vLLM 0.6.0',
        'opendatahub.io/runtime-version': '0.6.0',
      });
      expect(request.body.metadata.labels).to.include({
        'opendatahub.io/dashboard': 'true',
        'opendatahub.io/config-type': 'accelerator',
      });
      expect(request.body.spec.model).to.deep.equal({
        uri: 'hf://test/model',
        name: 'test-model',
      });
      expect(request.body.spec.template.containers[0]).to.include({
        name: 'main',
        image: 'quay.io/example/vllm:0.6.0',
      });
    });
    cy.url().should('include', '/llm-accelerator-configurations');
    llmAcceleratorConfigurations.getRowByName('vllm-0-6-0').find().should('exist');
  });

  it('should install a prefilled Serving runtime template and redirect to its list', () => {
    asProductAdminUser();
    initialize();
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

    visitInstallWithActionData();
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
