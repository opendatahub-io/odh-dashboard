import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { asProductAdminUser, asProjectEditUser } from '../../../utils/mockUsers';
import { pageNotfound } from '../../../pages/pageNotFound';

const settingsUrl = '/settings/model-resources-operations/model-deployment-settings';
const catalogUrl = `${settingsUrl}/serving-runtime-catalog`;
const runtimeId = 'catalog-vllm-0-6-2';
const detailsUrl = `${catalogUrl}/${runtimeId}`;

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
    cy.visitWithLogin(detailsUrl);
    cy.findByRole('heading', { name: 'CUDA vLLM 0.6.2' }).should('be.visible');
    cy.findByRole('heading', { name: 'Description' }).should('be.visible');
    cy.findByRole('heading', { name: 'Details' }).should('be.visible');
    cy.findByText('A GPU runtime for vLLM model serving').should('be.visible');
    cy.findByText('0.6.2').should('be.visible');
    cy.findByText('safetensors, huggingface').should('be.visible');
    cy.findByText('October 1, 2026').should('be.visible');
    cy.findAllByText('N/A').should('have.length', 2);
    cy.findByTestId('runtime-container-image-copy')
      .findByRole('textbox')
      .should('have.value', 'registry.example.com/mock/vllm:0.6.2');
    cy.findByRole('button', { name: 'Create' }).should('be.disabled');
    cy.findByRole('button', { name: 'Install' }).should('not.exist');
    cy.findByRole('tabpanel', { name: 'Serving runtime template' })
      .findByText(/# Example only\. Not deployable\./)
      .should('be.visible');
    cy.testA11y();
  });

  it('copies the container image', () => {
    cy.visitWithLogin(detailsUrl);
    cy.window().then((window) => {
      cy.stub(window.navigator.clipboard, 'writeText').as('clipboardWrite');
    });

    cy.findByRole('button', { name: 'Copy container image' }).click();
    cy.get('@clipboardWrite')
      .its('firstCall.args.0')
      .should('equal', 'registry.example.com/mock/vllm:0.6.2');
    cy.testA11y();
  });

  it('shows both configuration tabs and copies the selected YAML', () => {
    cy.visitWithLogin(detailsUrl);
    cy.findByRole('heading', { name: 'Available configurations' }).should('be.visible');
    cy.findByText(/kind: ServingRuntime/).should('be.visible');

    cy.window().then((window) => {
      cy.stub(window.navigator.clipboard, 'writeText').as('clipboardWrite');
    });
    cy.findByRole('button', { name: 'Copy to clipboard' }).click();
    cy.get('@clipboardWrite').its('firstCall.args.0').should('include', 'kind: ServingRuntime');

    cy.findByRole('tab', { name: 'LLM accelerator configuration' }).click();
    cy.findByText(/kind: LLMInferenceServiceConfig/).should('be.visible');
    cy.findByRole('button', { name: 'Copy to clipboard' }).click();
    cy.get('@clipboardWrite')
      .its('secondCall.args.0')
      .should('include', 'kind: LLMInferenceServiceConfig');
    cy.testA11y();
  });

  it('does not expose details when the feature flag is disabled', () => {
    setupRuntimeCatalog(false);
    cy.visitWithLogin(detailsUrl);
    cy.location('pathname').should('eq', `${settingsUrl}/general-settings`);
    cy.findByTestId('runtime-catalog-details').should('not.exist');
    cy.testA11y();
  });

  it('does not expose details to a non-admin user', () => {
    asProjectEditUser();
    cy.visitWithLogin(detailsUrl);
    pageNotfound.findPage().should('exist');
    cy.testA11y();
  });

  it('shows not found for an unknown runtime', () => {
    cy.visitWithLogin(`${catalogUrl}/unknown-runtime`);
    cy.findByRole('heading', { name: 'Runtime image not found' }).should('be.visible');
    cy.testA11y();
  });
});
