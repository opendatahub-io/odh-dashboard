import {
  mockDashboardConfig,
  mockK8sResourceList,
  mockProjectK8sResource,
} from '@odh-dashboard/internal/__mocks__';
import {
  mockMcpDeployment,
  mockMcpDeploymentList,
} from '@odh-dashboard/model-registry/mocks/mockMcpDeployment';
import { mcpDeploymentsPage } from '../../../pages/mcpDeployments';
import { ProjectModel } from '../../../utils/models';

const MCP_DEPLOYMENTS_BFF = '**/model-registry/api/v1/mcp_deployments';
const MR_API_VERSION = 'v1';

const initIntercepts = () => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ mcpCatalog: true }));
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: 'mcp-servers', displayName: 'mcp-servers' }),
    ]),
  );
  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/user',
    { path: { apiVersion: MR_API_VERSION } },
    { data: { userId: 'user@example.com', clusterAdmin: true } },
  );
  cy.interceptOdh(
    'GET /model-registry/api/:apiVersion/namespaces',
    { path: { apiVersion: MR_API_VERSION } },
    { data: [{ metadata: { name: 'mcp-servers' } }] },
  );
  cy.intercept('GET', `${MCP_DEPLOYMENTS_BFF}*`, {
    data: mockMcpDeploymentList({
      items: [
        mockMcpDeployment({ name: 'kubernetes-mcp' }),
        mockMcpDeployment({ name: 'slack-mcp' }),
      ],
      size: 2,
    }),
  });
};

describe('MCP server deployment delete', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should delete a deployment via kebab action and confirmation modal', () => {
    cy.intercept('DELETE', `${MCP_DEPLOYMENTS_BFF}/kubernetes-mcp*`, {
      statusCode: 204,
      body: '',
    }).as('deleteMcpDeployment');

    mcpDeploymentsPage.visit();

    mcpDeploymentsPage.findTableRows().should('have.length', 2);
    mcpDeploymentsPage.getRow('kubernetes-mcp').findKebabAction('Delete').click();

    const modal = mcpDeploymentsPage.findDeleteModal();
    modal.shouldBeVisible();
    modal.find().should('contain.text', 'Delete MCP server deployment?');
    modal.find().should('contain.text', 'kubernetes-mcp');

    modal.findSubmitButton().should('be.disabled');
    modal.findInput().type('kubernetes-mcp');
    modal.findSubmitButton().should('be.enabled').click();

    cy.wait('@deleteMcpDeployment');
    modal.shouldNotExist();
  });

  it('should close the modal on Cancel without deleting', () => {
    cy.intercept('DELETE', `${MCP_DEPLOYMENTS_BFF}/kubernetes-mcp*`, {
      statusCode: 204,
      body: '',
    }).as('deleteMcpDeployment');

    mcpDeploymentsPage.visit();

    mcpDeploymentsPage.findTableRows().should('have.length', 2);
    mcpDeploymentsPage.getRow('kubernetes-mcp').findKebabAction('Delete').click();

    const modal = mcpDeploymentsPage.findDeleteModal();
    modal.shouldBeVisible();
    modal.findCancelButton().click();

    modal.shouldNotExist();
    cy.get('@deleteMcpDeployment.all').should('have.length', 0);
    mcpDeploymentsPage.findTableRows().should('have.length', 2);
  });

  it('should show an inline error when deletion fails and keep the modal open', () => {
    cy.intercept('DELETE', `${MCP_DEPLOYMENTS_BFF}/kubernetes-mcp*`, {
      forceNetworkError: true,
    }).as('deleteMcpDeploymentFailed');

    mcpDeploymentsPage.visit();

    mcpDeploymentsPage.findTableRows().should('have.length', 2);
    mcpDeploymentsPage.getRow('kubernetes-mcp').findKebabAction('Delete').click();

    const modal = mcpDeploymentsPage.findDeleteModal();
    modal.shouldBeVisible();
    modal.findInput().type('kubernetes-mcp');
    modal.findSubmitButton().should('be.enabled').click();

    cy.wait('@deleteMcpDeploymentFailed');

    modal.shouldBeVisible();
    modal.findErrorAlert().should('be.visible');
    modal.findErrorAlert().should('contain.text', 'Error deleting kubernetes-mcp');
    modal.findSubmitButton().should('be.enabled');
  });
});
