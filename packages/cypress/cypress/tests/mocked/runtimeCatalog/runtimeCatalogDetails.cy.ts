import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { runtimeCatalogDetailsPage } from '../../../pages/runtimeCatalogDetails';
import { asProductAdminUser, asProjectEditUser } from '../../../utils/mockUsers';
import { pageNotfound } from '../../../pages/pageNotFound';
import { getClipboardContent, stubClipboard } from '../../../utils/clipboardUtils';

const settingsUrl = '/settings/model-resources-operations/model-deployment-settings';
const runtimeId = 'catalog-vllm-0-6-2';
const servingRuntimeYaml = `# Example only. Not deployable.
apiVersion: serving.kserve.io/v1alpha1
kind: ServingRuntime
metadata:
  name: cuda-vllm
`;
const llmAcceleratorYaml = `# Example only. Not deployable.
apiVersion: serving.kserve.io/v1alpha1
kind: LLMInferenceServiceConfig
metadata:
  name: cuda-vllm
`;

const setupRuntimeCatalog = (enabled = true): void => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ runtimeCatalog: enabled }));
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.K_SERVE]: { managementState: 'Managed' },
      },
    }),
  );
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
};

describe('Runtime image library details', () => {
  beforeEach(() => {
    asProductAdminUser();
    setupRuntimeCatalog();
  });

  it('displays the runtime details and catalog data', () => {
    runtimeCatalogDetailsPage.visit(runtimeId);
    runtimeCatalogDetailsPage.findHeading('CUDA vLLM 0.6.2').should('be.visible');
    runtimeCatalogDetailsPage.findHeading('Description').should('be.visible');
    runtimeCatalogDetailsPage.findHeading('Details').should('be.visible');
    runtimeCatalogDetailsPage.findText('A GPU runtime for vLLM model serving').should('be.visible');
    runtimeCatalogDetailsPage.findText('0.6.2').should('be.visible');
    runtimeCatalogDetailsPage.findText('safetensors, huggingface').should('be.visible');
    runtimeCatalogDetailsPage.findText('October 1, 2026').should('be.visible');
    runtimeCatalogDetailsPage.findAllText('N/A').should('have.length', 2);
    runtimeCatalogDetailsPage
      .findContainerImageInput()
      .should('have.value', 'registry.example.com/mock/vllm:0.6.2');
    runtimeCatalogDetailsPage.findButton('Create').should('be.disabled');
    runtimeCatalogDetailsPage.findButton('Install').should('not.exist');
    runtimeCatalogDetailsPage
      .findTemplatePanel('Serving runtime template')
      .should('contain.text', '# Example only. Not deployable.');
    cy.testA11y();
  });

  it('copies the container image', () => {
    runtimeCatalogDetailsPage.visit(runtimeId);
    stubClipboard('copiedImage');

    runtimeCatalogDetailsPage.copyContainerImage();
    getClipboardContent('copiedImage')
      .its(0)
      .should('equal', 'registry.example.com/mock/vllm:0.6.2');
    cy.testA11y();
  });

  it('shows both configuration tabs and copies the selected YAML', () => {
    runtimeCatalogDetailsPage.visit(runtimeId);
    runtimeCatalogDetailsPage.findHeading('Available configurations').should('be.visible');
    runtimeCatalogDetailsPage.findText(/kind: ServingRuntime/).should('be.visible');

    stubClipboard('copiedYaml');
    runtimeCatalogDetailsPage.copySelectedYaml();
    getClipboardContent('copiedYaml').its(0).should('equal', servingRuntimeYaml);

    runtimeCatalogDetailsPage.selectConfigurationTab('LLM accelerator configuration');
    runtimeCatalogDetailsPage.findText(/kind: LLMInferenceServiceConfig/).should('be.visible');
    runtimeCatalogDetailsPage.copySelectedYaml();
    getClipboardContent('copiedYaml').its(1).should('equal', llmAcceleratorYaml);
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
    runtimeCatalogDetailsPage.visit('unknown-runtime');
    runtimeCatalogDetailsPage.findHeading('Runtime image not found').should('be.visible');
    cy.testA11y();
  });
});
