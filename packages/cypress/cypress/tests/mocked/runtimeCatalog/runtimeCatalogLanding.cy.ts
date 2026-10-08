import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { runtimeCatalogPage } from '../../../pages/runtimeCatalog';
import { runtimeCatalogDetailsPage } from '../../../pages/runtimeCatalogDetails';
import { API_VERSION, setupModelCatalogIntercepts } from '../catalogHelpers';

const setupRuntimeCatalogIntercepts = (): void => {
  cy.intercept(
    'GET',
    `**/model-registry/api/${API_VERSION}/serving_runtime_catalog/serving_runtimes_filter_options*`,
    {
      body: {
        data: {
          filters: {
            hardware: {
              type: 'string',
              values: ['cpu', 'cpu-or-gpu', 'nvidia.com/gpu', 'amd.com/gpu'],
            },
          },
        },
      },
    },
  );

  cy.intercept(
    'GET',
    `**/model-registry/api/${API_VERSION}/serving_runtime_catalog/serving_runtimes*`,
    {
      body: {
        data: {
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
            {
              id: '2',
              name: 'ovms',
              displayName: 'OpenVINO Model Server',
              description: 'Model serving with OpenVINO.',
              versionCount: 1,
              tags: ['predictive-ai', 'cpu'],
            },
            {
              id: '3',
              name: 'triton',
              displayName: 'NVIDIA Triton Inference Server',
              description: 'A high-performance inference serving platform.',
              versionCount: 0,
              tags: ['gpu'],
              capabilities: { supportedAccelerators: ['nvidia.com/gpu'] },
            },
          ],
          size: 3,
          pageSize: 50,
          nextPageToken: '',
        },
      },
    },
  );
};

const runtimeDetailsPath = `/model-registry/api/${API_VERSION}/serving_runtime_catalog/serving_runtimes/1`;

const setupRuntimeCatalogSourceIntercepts = (): void => {
  cy.intercept('GET', `**/model-registry/api/${API_VERSION}/model_catalog/sources*`, {
    body: {
      data: {
        items: [
          {
            id: 'redhat-runtimes',
            name: 'Runtime image library',
            enabled: true,
            status: 'available',
            labels: ['Red Hat'],
          },
        ],
        size: 1,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  });

  cy.intercept('GET', `**/model-registry/api/${API_VERSION}/model_catalog/labels*`, {
    body: {
      data: {
        items: [],
        size: 0,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  });
};

const initIntercepts = (): void => {
  asProductAdminUser();
  cy.interceptOdh(
    'GET /api/config',
    mockDashboardConfig({
      disableModelRegistry: false,
      runtimeCatalog: true,
    }),
  );
  setupModelCatalogIntercepts();
  setupRuntimeCatalogSourceIntercepts();
  setupRuntimeCatalogIntercepts();
};

describe('Runtime image library landing', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('shows search input and sidebar filters', () => {
    runtimeCatalogPage.visit();
    runtimeCatalogPage.findSearchInput().should('exist');
    runtimeCatalogPage.findSidebar().should('exist');
  });

  it('renders runtime cards', () => {
    runtimeCatalogPage.visit();
    runtimeCatalogPage.findCards().should('have.length.greaterThan', 0);
    runtimeCatalogPage.findCard('vllm').should('exist');
    runtimeCatalogPage.findCard('ovms').should('exist');
    runtimeCatalogPage.findCard('triton').should('exist');
  });

  it('shows card name and description', () => {
    runtimeCatalogPage.visit();
    runtimeCatalogPage.findCardName('vllm').should('contain.text', 'vLLM');
    runtimeCatalogPage.findCardDescription('vllm').should('contain.text', 'GPU-accelerated');
  });

  it('shows Latest badge when versionCount > 0 and hides when 0', () => {
    runtimeCatalogPage.visit();
    runtimeCatalogPage.findCardLatestBadge('vllm').should('exist');
    runtimeCatalogPage.findCardLatestBadge('ovms').should('exist');
    runtimeCatalogPage.findCardLatestBadge('triton').should('not.exist');
  });

  it('shows hardware label in card footer', () => {
    runtimeCatalogPage.visit();
    runtimeCatalogPage.findCardHardware('vllm').should('contain.text', 'NVIDIA GPU');
    runtimeCatalogPage.findCardHardware('ovms').should('contain.text', 'CPU');
  });

  it('opens runtime details using the BFF ID instead of the runtime name', () => {
    cy.intercept(
      { method: 'GET', pathname: runtimeDetailsPath },
      {
        body: { data: { id: '1', name: 'vllm', displayName: 'vLLM' } },
      },
    ).as('runtimeDetails');
    cy.intercept(
      { method: 'GET', pathname: `${runtimeDetailsPath}/versions` },
      {
        body: { data: { items: [], size: 0, pageSize: 1, nextPageToken: '' } },
      },
    );

    runtimeCatalogPage.visit();
    runtimeCatalogPage.openCardDetails('vllm');

    cy.location('pathname').should(
      'eq',
      '/settings/model-resources-operations/model-deployment-settings/serving-runtime-catalog/1',
    );
    cy.wait('@runtimeDetails');
    runtimeCatalogDetailsPage.findHeading('vLLM').should('be.visible');
  });

  it('does not offer navigation for a runtime without a BFF ID', () => {
    cy.intercept(
      {
        method: 'GET',
        pathname: `/model-registry/api/${API_VERSION}/serving_runtime_catalog/serving_runtimes`,
      },
      {
        body: {
          data: {
            items: [{ name: 'idless', displayName: 'Runtime without ID' }],
            size: 1,
            pageSize: 50,
            nextPageToken: '',
          },
        },
      },
    );

    runtimeCatalogPage.visit();
    runtimeCatalogPage.findCardDetailLink('idless').should('be.disabled');
  });
});
