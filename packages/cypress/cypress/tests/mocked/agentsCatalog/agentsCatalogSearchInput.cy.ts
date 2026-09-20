import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { agentsCatalogPage } from '../../../pages/agentsCatalog';
import { API_VERSION, setupModelCatalogIntercepts } from '../catalogHelpers';

const setupAgentsCatalogIntercepts = () => {
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

describe('Agents Catalog search input minimum width regression', () => {
  beforeEach(() => {
    asProductAdminUser();
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

    agentsCatalogPage.visit();
    agentsCatalogPage
      .findSearchInput()
      .should('be.visible')
      .invoke('outerWidth')
      .should('be.gte', 400);
  });
});
