import { mockAIHubNamespaceResponse } from '@odh-dashboard/k8s-core/__mocks__/mockAIHub';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockDsciStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDsciStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockServingRuntimeK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeK8sResource';
import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
import {
  ServingRuntimeAPIProtocol,
  ServingRuntimeModelType,
} from '@odh-dashboard/model-serving/shared';
import YAML from 'js-yaml';
import { runtimeImageInstallPage } from '../../../pages/modelDeploymentSettings/runtimeImageInstall';
import { runtimeCatalogDetailsPage } from '../../../pages/runtimeCatalogDetails';
import { asProductAdminUser, asProjectEditUser } from '../../../utils/mockUsers';
import { pageNotfound } from '../../../pages/pageNotFound';
import { getClipboardContent, stubClipboard } from '../../../utils/clipboardUtils';

const settingsUrl = '/settings/model-resources-operations/model-deployment-settings';
const catalogApiPath = '/model-registry/api/v1/serving_runtime_catalog/serving_runtimes';
const runtimeId = '1';
const runtimeFamily = {
  id: runtimeId,
  name: 'vllm',
  displayName: 'vLLM',
  description: 'GPU-accelerated serving for large language models.',
  supportedModelFormats: [{ name: 'safetensors' }, { name: 'huggingface' }],
  capabilities: { supportedAccelerators: ['nvidia.com/gpu'] },
  publishedDate: '2024-02-01T00:00:00Z',
};
const servingRuntime = mockServingRuntimeK8sResource({
  name: 'mock-vllm-0-6-0',
  namespace: 'opendatahub',
});
servingRuntime.spec.containers[0].image = 'registry.example.com/mock/vllm:0.6.0';
servingRuntime.spec.supportedModelFormats = [{ name: 'safetensors' }];
servingRuntime.spec.protocolVersions = ['v2'];

const servingRuntimeTemplate = JSON.stringify(
  mockServingRuntimeTemplateK8sResource({
    name: 'mock-vllm-0-6-0',
    namespace: 'opendatahub',
    apiProtocol: ServingRuntimeAPIProtocol.REST,
    modelTypes: [ServingRuntimeModelType.GENERATIVE],
    supportedModelFormats: [{ name: 'safetensors' }],
    objects: [servingRuntime],
  }),
);
const llmInferenceServiceConfig =
  '{"apiVersion":"serving.kserve.io/v1alpha2","kind":"LLMInferenceServiceConfig","metadata":{"name":"mock-vllm-0-6-0","labels":{"opendatahub.io/config-type":"accelerator","opendatahub.io/dashboard":"true"}},"spec":{"model":{"uri":"hf://example/mock-model","name":"mock-model"},"template":{"containers":[{"name":"main","resources":{"limits":{"cpu":"4","memory":"16Gi"},"requests":{"cpu":"2","memory":"8Gi"}}}]}}}';
const runtimeVersions = {
  items: [
    {
      id: '102',
      name: 'vllm-0.6.0',
      artifactType: 'serving-runtime-version',
      version: '0.6.0',
      image: 'registry.example.com/mock/vllm:0.6.0',
      createTimeSinceEpoch: '1711929600000',
      supportedModelFormats: [{ name: 'safetensors' }],
      publishedDate: '2024-04-01T00:00:00Z',
      servingRuntimeTemplate,
      llmInferenceServiceConfig,
    },
  ],
  size: 1,
  pageSize: 1,
  nextPageToken: '',
};
const llmInferenceServiceYaml = `apiVersion: serving.kserve.io/v1alpha2
kind: LLMInferenceServiceConfig
metadata:
  name: mock-vllm-0-6-0
  labels:
    opendatahub.io/config-type: accelerator
    opendatahub.io/dashboard: 'true'
spec:
  model:
    uri: hf://example/mock-model
    name: mock-model
  template:
    containers:
      - name: main
        resources:
          limits:
            cpu: '4'
            memory: 16Gi
          requests:
            cpu: '2'
            memory: 8Gi
`;

const setupRuntimeCatalog = (enabled = true): void => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ runtimeCatalog: enabled }));
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
        [DataScienceStackComponent.MODEL_REGISTRY]: { managementState: 'Managed' },
      },
    }),
  );

  cy.interceptOdh(
    'GET /api/aihub',
    mockAIHubNamespaceResponse({ instancesNamespace: 'odh-model-registries' }),
  );

  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));
  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/user',
    { path: { apiVersion: 'v1' } },
    {
      data: { userId: 'user@example.com', clusterAdmin: true },
    },
  );
  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/namespaces',
    { path: { apiVersion: 'v1' } },
    {
      data: [{ metadata: { name: 'odh-model-registries' } }],
    },
  );
  cy.intercept(
    { method: 'GET', pathname: `${catalogApiPath}/${runtimeId}` },
    { data: runtimeFamily },
  );
  cy.intercept(
    { method: 'GET', pathname: `${catalogApiPath}/${runtimeId}/versions` },
    { data: runtimeVersions },
  ).as('runtimeVersions');
};

describe('Runtime image library details', () => {
  beforeEach(() => {
    asProductAdminUser();
    setupRuntimeCatalog();
  });

  it('displays the runtime details and catalog data', () => {
    runtimeCatalogDetailsPage.visit(runtimeId);
    cy.wait('@runtimeVersions').its('request.query').should('deep.include', {
      namespace: 'odh-model-registries',
      orderBy: 'CREATE_TIME',
      sortOrder: 'DESC',
      pageSize: '1',
    });
    runtimeCatalogDetailsPage.findHeading('vLLM').should('be.visible');
    runtimeCatalogDetailsPage.findHeading('Description').should('be.visible');
    runtimeCatalogDetailsPage.findHeading('Details').should('be.visible');
    runtimeCatalogDetailsPage.findText(runtimeFamily.description).should('be.visible');
    runtimeCatalogDetailsPage.findText('nvidia.com/gpu').should('be.visible');
    runtimeCatalogDetailsPage.findText('April 1, 2024').should('be.visible');
    runtimeCatalogDetailsPage
      .findContainerImageInput()
      .should('have.value', 'registry.example.com/mock/vllm:0.6.0');
    runtimeCatalogDetailsPage.findLink('Install').should('be.visible');
    runtimeCatalogDetailsPage.findServingRuntimeTab().should('be.visible');
    runtimeCatalogDetailsPage
      .findServingRuntimePanel()
      .should('contain.text', 'kind: ServingRuntime');
    cy.testA11y();
  });

  it('installs the catalog ServingRuntime through the details action', () => {
    cy.interceptOdh(
      'GET /api/templates/:namespace',
      {
        path: { namespace: 'opendatahub' },
        query: { labelSelector: 'opendatahub.io/dashboard=true' },
      },
      mockK8sResourceList([]),
    ).as('existingServingRuntimeTemplates');
    cy.interceptOdh(
      'POST /api/servingRuntimes/',
      { query: { dryRun: 'All' } },
      mockServingRuntimeK8sResource({ name: 'mock-vllm-0-6-0', namespace: 'opendatahub' }),
    ).as('servingRuntimeDryRun');
    cy.interceptOdh(
      'POST /api/templates/',
      mockServingRuntimeTemplateK8sResource({ name: 'installed-vllm-template' }),
    ).as('createServingRuntimeTemplate');

    runtimeCatalogDetailsPage.visit(runtimeId);
    runtimeCatalogDetailsPage.findLink('Install').click();

    cy.location('pathname').should(
      'eq',
      `${settingsUrl}/serving-runtime-catalog/${runtimeId}/install`,
    );
    runtimeImageInstallPage.findPageTitle('vLLM').should('be.visible');
    runtimeImageInstallPage
      .findLibraryBreadcrumb()
      .should('have.attr', 'href', `${settingsUrl}/serving-runtime-catalog`);
    runtimeImageInstallPage
      .findRuntimeDetailsBreadcrumb('vLLM')
      .should('have.attr', 'href', `${settingsUrl}/serving-runtime-catalog/${runtimeId}`);

    runtimeImageInstallPage.findServingRuntimeRadio().should('be.visible').click();
    runtimeImageInstallPage.findNext().click();
    runtimeImageInstallPage.findServingRuntimeEditor().waitForReady();
    runtimeImageInstallPage
      .findServingRuntimeEditor()
      .containsText('name: mock-vllm-0-6-0')
      .should('be.visible');
    runtimeImageInstallPage.findServingRuntimeProtocol().should('contain.text', 'REST');
    runtimeImageInstallPage.findCreate().should('be.enabled').click();

    cy.wait('@existingServingRuntimeTemplates').its('request.query').should('deep.include', {
      labelSelector: 'opendatahub.io/dashboard=true',
    });
    cy.wait('@servingRuntimeDryRun').then(({ request }) => {
      expect(request.query).to.deep.include({ dryRun: 'All' });
      expect(request.body.kind).to.equal('ServingRuntime');
      expect(request.body.metadata.name).to.equal('mock-vllm-0-6-0');
      expect(request.body.metadata.namespace).to.equal('opendatahub');
    });
    cy.wait('@createServingRuntimeTemplate').then(({ request }) => {
      expect(request.method).to.equal('POST');
      expect(request.body.kind).to.equal('Template');
      expect(request.body.metadata.namespace).to.equal('opendatahub');
      expect(request.body.metadata.annotations).to.include({
        'opendatahub.io/apiProtocol': 'REST',
        'opendatahub.io/model-type': '["generative"]',
      });
      expect(request.body.objects[0].kind).to.equal('ServingRuntime');
      expect(request.body.objects[0].metadata.name).to.equal('mock-vllm-0-6-0');
      expect(request.body.objects[0].spec.containers[0].image).to.equal(
        'registry.example.com/mock/vllm:0.6.0',
      );
    });
    cy.location('pathname').should('eq', `${settingsUrl}/serving-runtime-templates`);
  });

  it('copies the container image', () => {
    runtimeCatalogDetailsPage.visit(runtimeId);
    stubClipboard('copiedImage');

    runtimeCatalogDetailsPage.copyContainerImage();
    getClipboardContent('copiedImage')
      .its(0)
      .should('equal', 'registry.example.com/mock/vllm:0.6.0');
    cy.testA11y();
  });

  it('copies the two independent configuration YAML values', () => {
    runtimeCatalogDetailsPage.visit(runtimeId);
    runtimeCatalogDetailsPage.findHeading('Available configurations').should('be.visible');
    runtimeCatalogDetailsPage
      .findServingRuntimePanel()
      .should('contain.text', 'kind: ServingRuntime');

    stubClipboard('copiedYaml');
    runtimeCatalogDetailsPage.copyServingRuntimeYaml();
    getClipboardContent('copiedYaml')
      .its(0)
      .then((copiedYaml) => {
        expect(YAML.load(copiedYaml)).to.deep.equal(JSON.parse(servingRuntimeTemplate));
      });
    runtimeCatalogDetailsPage.selectLlmInferenceServiceTab();
    runtimeCatalogDetailsPage
      .findLlmInferenceServicePanel()
      .should('contain.text', 'kind: LLMInferenceServiceConfig');
    runtimeCatalogDetailsPage.copyLlmInferenceServiceYaml();
    getClipboardContent('copiedYaml').its(1).should('equal', llmInferenceServiceYaml);
    cy.testA11y();
  });

  it('does not expose details when the feature flag is disabled', () => {
    setupRuntimeCatalog(false);
    runtimeCatalogDetailsPage.visit(runtimeId);
    cy.location('pathname').should('eq', `${settingsUrl}/general-settings`);
    runtimeCatalogDetailsPage.findPage().should('not.exist');
    cy.testA11y();
  });

  it('does not expose details to a non-admin user', () => {
    asProjectEditUser();
    runtimeCatalogDetailsPage.visit(runtimeId);
    pageNotfound.findPage().should('exist');
    cy.testA11y();
  });

  it('shows not found for an unknown runtime', () => {
    cy.intercept(
      { method: 'GET', pathname: `${catalogApiPath}/unknown-runtime` },
      { statusCode: 404, body: { error: { code: '404', message: 'Runtime not found' } } },
    );
    cy.intercept(
      { method: 'GET', pathname: `${catalogApiPath}/unknown-runtime/versions` },
      { statusCode: 404, body: { error: { code: '404', message: 'Runtime not found' } } },
    );
    runtimeCatalogDetailsPage.visit('unknown-runtime');
    runtimeCatalogDetailsPage.findHeading('Runtime image not found').should('be.visible');
    cy.testA11y();
  });

  it('shows a controlled error when the runtime request fails', () => {
    cy.intercept(
      { method: 'GET', pathname: `${catalogApiPath}/${runtimeId}` },
      { statusCode: 500, body: { error: { code: '500', message: 'Catalog unavailable' } } },
    );
    runtimeCatalogDetailsPage.visit(runtimeId);
    runtimeCatalogDetailsPage
      .findHeading('Danger alert: Unable to load runtime image')
      .should('be.visible');
    cy.testA11y();
  });
});
