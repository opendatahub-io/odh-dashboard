import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockDsciStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDsciStatus';
import { DataScienceStackComponent } from '@odh-dashboard/plugin-core/areas';
import { asProductAdminUser } from '../../utils/mockUsers';
import { modelCatalog } from '../../pages/modelCatalog/modelCatalog';
import { agentsCatalogPage } from '../../pages/agentsCatalog';
import { mcpCatalogPage } from '../../pages/mcpCatalog';

const API_VERSION = 'v1';
const REGISTRIES_NAMESPACE = 'odh-model-registries';

const setupModelCatalogIntercepts = () => {
  cy.interceptOdh(
    'GET /api/dsc/status',
    mockDscStatus({
      components: {
        [DataScienceStackComponent.MODEL_REGISTRY]: {
          managementState: 'Managed',
          registriesNamespace: REGISTRIES_NAMESPACE,
        },
      },
    }),
  );

  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));

  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/user',
    { path: { apiVersion: API_VERSION } },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
  );

  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/namespaces',
    { path: { apiVersion: API_VERSION } },
    { data: [{ metadata: { name: REGISTRIES_NAMESPACE } }] },
  );

  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/model_registry',
    { path: { apiVersion: API_VERSION } },
    { data: [] },
  );

  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/model_catalog/sources',
    { path: { apiVersion: API_VERSION } },
    {
      data: {
        items: [
          {
            id: 'sample-source',
            name: 'Sample Source',
            enabled: true,
            labels: ['Community'],
            status: 'available',
          },
        ],
        size: 1,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  );

  cy.intercept('GET', `**/model-registry/api/${API_VERSION}/model_catalog/labels*`, {
    body: {
      data: {
        items: [
          {
            name: 'Community',
            displayName: 'Community',
          },
        ],
        size: 1,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  });

  cy.intercept('GET', `**/model-registry/api/${API_VERSION}/model_catalog/models*`, {
    body: {
      data: {
        items: [
          {
            source_id: 'sample-source', // eslint-disable-line camelcase
            name: 'sample-model',
            description: 'Sample model',
            provider: 'provider1',
            license: 'apache-2.0',
            tasks: ['text-generation'],
            customProperties: {},
          },
        ],
        size: 1,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  });

  cy.intercept('GET', `**/model-registry/api/${API_VERSION}/model_catalog/models/filter_options*`, {
    body: {
      data: {
        filters: {},
      },
    },
  });
};

const setupAgentsCatalogIntercepts = () => {
  cy.intercept('GET', `**/model-registry/api/${API_VERSION}/agent_catalog/sources*`, {
    body: {
      data: {
        items: [
          {
            id: 'sample-source',
            name: 'Sample Source',
            enabled: true,
            labels: ['agent_templates'],
          },
        ],
        size: 1,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  });

  cy.intercept('GET', `**/model-registry/api/${API_VERSION}/agent_catalog/labels*`, {
    body: {
      data: {
        items: [
          {
            name: 'agent_templates',
            displayName: 'Agent Templates',
          },
        ],
        size: 1,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  });

  cy.intercept('GET', `**/model-registry/api/${API_VERSION}/agent_catalog/agents*`, {
    body: {
      data: {
        items: [
          {
            source_id: 'sample-source', // eslint-disable-line camelcase
            name: 'sample-agent',
            displayName: 'Sample Agent',
            description: 'Sample agent',
            framework: 'langgraph',
            labels: ['Web search', 'General purpose'],
          },
        ],
        size: 1,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  });
};

const setupMcpCatalogIntercepts = () => {
  cy.intercept('GET', `**/model_catalog/sources*assetType=mcp_servers*`, {
    body: {
      data: {
        items: [
          {
            id: 'sample-source',
            name: 'Sample Source',
            enabled: true,
            status: 'available',
            labels: ['community_mcp_servers'],
          },
        ],
        size: 1,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  });

  cy.intercept('GET', `**/model_catalog/labels*assetType=mcp_servers*`, {
    body: {
      data: {
        items: [
          {
            name: 'community_mcp_servers',
            displayName: 'Community MCP Servers',
          },
        ],
        size: 1,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  });

  cy.intercept('GET', `**/mcp_catalog/mcp_servers?*`, {
    body: {
      data: {
        items: [
          {
            id: 'sample-mcp',
            name: 'Sample MCP',
            description: 'Sample MCP server',
            source_id: 'sample-source', // eslint-disable-line camelcase
          },
        ],
        size: 1,
        pageSize: 10,
        nextPageToken: '',
      },
    },
  });

  cy.intercept('GET', `**/mcp_catalog/mcp_servers/filter_options*`, {
    body: {
      data: {
        filters: {},
      },
    },
  });
};

describe('Catalog search input minimum width regression', () => {
  beforeEach(() => {
    asProductAdminUser();

    cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));
  });

  it('Model Catalog search input should have minimum width of 400px', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableModelRegistry: false,
      }),
    );

    setupModelCatalogIntercepts();

    cy.visitWithLogin('/ai-hub/models/catalog');
    modelCatalog.findSearchInput().should('be.visible').invoke('outerWidth').should('be.gte', 400);
  });

  it('Agents Catalog search input should have minimum width of 400px', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableModelRegistry: false,
        agentsCatalog: true,
      }),
    );

    setupModelCatalogIntercepts();
    setupAgentsCatalogIntercepts();

    cy.visitWithLogin('/ai-hub/agents/catalog');
    agentsCatalogPage
      .findSearchInput()
      .should('be.visible')
      .invoke('outerWidth')
      .should('be.gte', 400);
  });

  it('MCP Catalog search input should have minimum width of 400px', () => {
    cy.interceptOdh(
      'GET /api/config',
      mockDashboardConfig({
        disableModelRegistry: false,
        mcpCatalog: true,
      }),
    );

    setupModelCatalogIntercepts();
    setupMcpCatalogIntercepts();

    cy.visitWithLogin('/ai-hub/mcp-servers/catalog');
    mcpCatalogPage
      .findSearchInput()
      .should('be.visible')
      .invoke('outerWidth')
      .should('be.gte', 400);
  });
});
