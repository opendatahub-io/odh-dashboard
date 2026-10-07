import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockDsciStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDsciStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
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
const runtimeVersions = {
  items: [
    {
      id: '101',
      name: 'vllm-0.5.0',
      artifactType: 'serving-runtime-version',
      version: '0.5.0',
      image: 'registry.example.com/mock/vllm:0.5.0',
      publishedDate: '2024-02-01T00:00:00Z',
      template: JSON.stringify({
        apiVersion: 'serving.kserve.io/v1alpha1',
        kind: 'ServingRuntime',
        metadata: { name: 'mock-vllm' },
        spec: {
          containers: [{ name: 'kserve-container', image: 'registry.example.com/mock/vllm:0.5.0' }],
        },
      }),
    },
    {
      id: '102',
      name: 'vllm-0.6.0',
      artifactType: 'serving-runtime-version',
      version: '0.6.0',
      image: 'registry.example.com/mock/vllm:0.6.0',
    },
  ],
  size: 2,
  pageSize: 10,
  nextPageToken: '',
};
const servingRuntimeYaml = `apiVersion: serving.kserve.io/v1alpha1
kind: ServingRuntime
metadata:
  name: mock-vllm
spec:
  containers:
    - name: kserve-container
      image: registry.example.com/mock/vllm:0.5.0
`;

const setupRuntimeCatalog = (enabled = true): void => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ runtimeCatalog: enabled }));
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
        [DataScienceStackComponent.MODEL_REGISTRY]: {
          managementState: 'Managed',
          registriesNamespace: 'odh-model-registries',
        },
      },
    }),
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
  );
};

describe('Runtime image library details', () => {
  beforeEach(() => {
    asProductAdminUser();
    setupRuntimeCatalog();
  });

  it('displays the runtime details and catalog data', () => {
    runtimeCatalogDetailsPage.visit(runtimeId);
    runtimeCatalogDetailsPage.findHeading('vLLM').should('be.visible');
    runtimeCatalogDetailsPage.findHeading('Description').should('be.visible');
    runtimeCatalogDetailsPage.findHeading('Details').should('be.visible');
    runtimeCatalogDetailsPage.findText(runtimeFamily.description).should('be.visible');
    runtimeCatalogDetailsPage.findVersionSelect().should('have.value', '101');
    runtimeCatalogDetailsPage.findText('safetensors, huggingface').should('be.visible');
    runtimeCatalogDetailsPage.findText('nvidia.com/gpu').should('be.visible');
    runtimeCatalogDetailsPage.findText('February 1, 2024').should('be.visible');
    runtimeCatalogDetailsPage.findText('N/A').should('be.visible');
    runtimeCatalogDetailsPage
      .findContainerImageInput()
      .should('have.value', 'registry.example.com/mock/vllm:0.5.0');
    runtimeCatalogDetailsPage.findButton('Install').should('not.exist');
    runtimeCatalogDetailsPage.findServingRuntimeTab().should('be.visible');
    runtimeCatalogDetailsPage
      .findServingRuntimePanel()
      .should('contain.text', 'kind: ServingRuntime');
    cy.testA11y();
  });

  it('copies the container image', () => {
    runtimeCatalogDetailsPage.visit(runtimeId);
    stubClipboard('copiedImage');

    runtimeCatalogDetailsPage.copyContainerImage();
    getClipboardContent('copiedImage')
      .its(0)
      .should('equal', 'registry.example.com/mock/vllm:0.5.0');
    cy.testA11y();
  });

  it('copies the selected serving runtime YAML', () => {
    runtimeCatalogDetailsPage.visit(runtimeId);
    runtimeCatalogDetailsPage.findHeading('Available configurations').should('be.visible');
    runtimeCatalogDetailsPage
      .findServingRuntimePanel()
      .should('contain.text', 'kind: ServingRuntime');

    stubClipboard('copiedYaml');
    runtimeCatalogDetailsPage.copyServingRuntimeYaml();
    getClipboardContent('copiedYaml').its(0).should('equal', servingRuntimeYaml);
    cy.testA11y();
  });

  it('switches to a version without a template', () => {
    runtimeCatalogDetailsPage.visit(runtimeId);
    runtimeCatalogDetailsPage.selectVersion('102');
    runtimeCatalogDetailsPage.findVersionSelect().should('have.value', '102');
    runtimeCatalogDetailsPage
      .findContainerImageInput()
      .should('have.value', 'registry.example.com/mock/vllm:0.6.0');
    runtimeCatalogDetailsPage.findServingRuntimePanel().should('not.exist');
    runtimeCatalogDetailsPage.findHeading('Available configurations').should('not.exist');
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
  });
});
