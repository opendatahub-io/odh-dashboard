import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { mcpCatalogPage } from '../../../pages/mcpCatalog';
import { setupModelCatalogIntercepts } from '../catalogHelpers';

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

describe('MCP Catalog search input minimum width regression', () => {
  beforeEach(() => {
    asProductAdminUser();
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

    mcpCatalogPage.visit();
    mcpCatalogPage
      .findSearchInput()
      .should('be.visible')
      .invoke('outerWidth')
      .should('be.gte', 400);
  });
});
