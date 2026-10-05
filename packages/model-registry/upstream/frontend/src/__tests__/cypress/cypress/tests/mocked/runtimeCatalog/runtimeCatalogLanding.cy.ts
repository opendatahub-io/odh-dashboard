import { runtimeCatalog } from '~/__tests__/cypress/cypress/pages/runtimeCatalog';
import { MODEL_CATALOG_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';
import { initRuntimeCatalogIntercepts, mockServingRuntimeList } from './runtimeCatalogTestUtils';

describe('Runtime image library landing', () => {
  beforeEach(() => {
    initRuntimeCatalogIntercepts();
  });

  it('shows page title, description, and section heading', () => {
    runtimeCatalog.visit();
    runtimeCatalog.findSectionTitle().should('contain.text', 'Runtime image library');
    runtimeCatalog.findSectionDescription().should('be.visible');
  });

  it('shows search input and sidebar filters', () => {
    runtimeCatalog.visit();
    runtimeCatalog.findSearchInput().should('exist');
    runtimeCatalog.findSidebar().should('exist');
    runtimeCatalog.findFilter('hardware').should('contain.text', 'Hardware');
  });

  it('renders runtime cards with expected content', () => {
    runtimeCatalog.visit();
    runtimeCatalog.findCards().should('have.length', 3);
    runtimeCatalog.findCard('vllm').should('exist');
    runtimeCatalog.findCard('ovms').should('exist');
    runtimeCatalog.findCard('triton').should('exist');
  });

  it('shows card icon, name, and description', () => {
    runtimeCatalog.visit();
    runtimeCatalog.findCardIcon('vllm').should('exist');
    runtimeCatalog.findCardName('vllm').should('contain.text', 'vLLM');
    runtimeCatalog.findCardDescription('vllm').should('contain.text', 'GPU-accelerated');
  });

  it('shows Latest badge when versionCount > 0 and hides when 0', () => {
    runtimeCatalog.visit();
    runtimeCatalog.findCardLatestBadge('vllm').should('exist');
    runtimeCatalog.findCardLatestBadge('ovms').should('exist');
    runtimeCatalog.findCardLatestBadge('triton').should('not.exist');
  });

  it('shows hardware label in card footer', () => {
    runtimeCatalog.visit();
    runtimeCatalog.findCardHardware('vllm').should('contain.text', 'NVIDIA GPU');
    runtimeCatalog.findCardHardware('ovms').should('contain.text', 'CPU');
  });

  it('card detail link navigates to details route', () => {
    runtimeCatalog.visit();
    runtimeCatalog
      .findCardDetailLink('vllm')
      .should('have.attr', 'href')
      .and('contain', '/serving-runtime-catalog/vllm');
  });
});

describe('Runtime image library search', () => {
  beforeEach(() => {
    initRuntimeCatalogIntercepts();
  });

  it('filters cards when search is submitted', () => {
    cy.interceptApi(
      `GET /api/:apiVersion/serving_runtime_catalog/serving_runtimes`,
      { path: { apiVersion: MODEL_CATALOG_API_VERSION } },
      mockServingRuntimeList({
        items: [
          {
            id: '1',
            name: 'vllm',
            displayName: 'vLLM',
            description: 'GPU-accelerated serving for large language models.',
            versionCount: 2,
            tags: ['llm', 'gpu'],
            capabilities: { supportedAccelerators: ['nvidia.com/gpu'] },
          },
        ],
        size: 1,
      }),
    ).as('searchRuntimes');

    runtimeCatalog.visit();
    runtimeCatalog.findSearchInput().type('vllm{enter}');
    runtimeCatalog.findCards().should('have.length', 1);
    runtimeCatalog.findCard('vllm').should('exist');
  });
});

describe('Runtime image library empty state', () => {
  it('shows empty state when no runtimes match filters', () => {
    initRuntimeCatalogIntercepts();

    cy.interceptApi(
      `GET /api/:apiVersion/serving_runtime_catalog/serving_runtimes`,
      { path: { apiVersion: MODEL_CATALOG_API_VERSION } },
      { items: [], size: 0, pageSize: 50, nextPageToken: '' },
    );

    runtimeCatalog.visit();
    runtimeCatalog.findEmptyState().should('exist');
    runtimeCatalog.findEmptyState().should('contain.text', 'No results found');
  });
});

describe('Runtime image library error state', () => {
  it('shows error alert when runtime list API fails', () => {
    initRuntimeCatalogIntercepts();

    cy.intercept(
      {
        method: 'GET',
        pathname: `/model-registry/api/${MODEL_CATALOG_API_VERSION}/serving_runtime_catalog/serving_runtimes`,
      },
      { statusCode: 500, body: { error: 'Internal Server Error' } },
    );

    cy.on('uncaught:exception', () => false);
    runtimeCatalog.visit();
    cy.contains('Failed to load runtime images').should('be.visible');
  });

  // TODO: filter options error should not block the gallery from loading.
  // Add a test once RuntimeCatalogGalleryView handles filterOptionsLoadError gracefully.
});
