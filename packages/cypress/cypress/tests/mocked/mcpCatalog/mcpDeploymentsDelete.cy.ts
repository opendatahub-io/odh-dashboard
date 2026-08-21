import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockDscStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDscStatus';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import { mockDsciStatus } from '@odh-dashboard/plugin-core/__mocks__/mockDsciStatus';
import {
  mockMcpDeployment,
  mockMcpDeploymentList,
} from '@odh-dashboard/model-registry/mocks/mockMcpDeployment';
import { mcpDeploymentsPage } from '../../../pages/mcpDeployments';
import { asProductAdminUser } from '../../../utils/mockUsers';
import { ProjectModel } from '../../../utils/models';

const MCP_DEPLOYMENTS_BFF = '**/model-registry/api/v1/mcp_deployments';
const MR_API_VERSION = 'v1';

const initIntercepts = () => {
  asProductAdminUser();

  cy.interceptOdh('GET /api/config', mockDashboardConfig({ mcpCatalog: true }));
  cy.interceptOdh('GET /api/dsc/status', mockDscStatus({}));
  cy.interceptOdh('GET /api/dsci/status', mockDsciStatus({}));

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

  cy.intercept('GET', '**/model-registry/api/v1/namespaces*', {
    body: { data: [{ name: 'mcp-servers' }] },
  });

  cy.intercept('GET', `${MCP_DEPLOYMENTS_BFF}*`, {
    data: mockMcpDeploymentList({
      items: [
        mockMcpDeployment({ name: 'kubernetes-mcp' }),
        mockMcpDeployment({ name: 'slack-mcp' }),
      ],
      size: 2,
    }),
  });

  cy.intercept('GET', '**/model-registry/api/v1/mcp_catalog/mcp_servers*', {
    body: { data: { items: [], size: 0, pageSize: 5, nextPageToken: '' } },
  });
};

describe('MCP server deployment delete', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should delete a deployment via kebab action and confirmation modal', () => {
    cy.intercept('DELETE', `${MCP_DEPLOYMENTS_BFF}/kubernetes-mcp*`, {
      statusCode: 204,
    }).as('deleteMcpDeployment');

    mcpDeploymentsPage.visit('mcp-servers');

    mcpDeploymentsPage.findTableRows().should('have.length', 2);
    mcpDeploymentsPage.getRow('kubernetes-mcp').findKebabAction('Delete').click();

    const modal = mcpDeploymentsPage.findDeleteModal();
    modal.shouldBeVisible();
    modal.find().should('contain.text', 'Delete MCP server deployment?');
    modal.find().should('contain.text', 'kubernetes-mcp');
    // This deployment is catalog-sourced (no registryServer), so no cascade cleanup applies.
    modal.findCascadeCleanupAlert().should('not.exist');

    modal.findSubmitButton().should('be.disabled');
    modal.findInput().type('kubernetes-mcp');
    modal.findSubmitButton().should('be.enabled').click();

    cy.wait('@deleteMcpDeployment');
    modal.shouldNotExist();
  });

  it('should close the modal on Cancel without deleting', () => {
    cy.intercept('DELETE', `${MCP_DEPLOYMENTS_BFF}/kubernetes-mcp*`, {
      statusCode: 204,
    }).as('deleteMcpDeployment');

    mcpDeploymentsPage.visit('mcp-servers');

    mcpDeploymentsPage.findTableRows().should('have.length', 2);
    mcpDeploymentsPage.getRow('kubernetes-mcp').findKebabAction('Delete').click();

    const modal = mcpDeploymentsPage.findDeleteModal();
    modal.shouldBeVisible();
    modal.findCancelButton().click();

    modal.shouldNotExist();
    cy.get('@deleteMcpDeployment.all').should('have.length', 0);
    mcpDeploymentsPage.findTableRows().should('have.length', 2);
  });

  it('should show the cascade cleanup alert for a registry-sourced deployment', () => {
    cy.intercept('GET', `${MCP_DEPLOYMENTS_BFF}*`, {
      data: mockMcpDeploymentList({
        items: [
          mockMcpDeployment({
            name: 'kubernetes-mcp',
            registryServer: 'io.github.example/kubernetes-mcp',
          }),
        ],
        size: 1,
      }),
    });
    cy.intercept('DELETE', `${MCP_DEPLOYMENTS_BFF}/kubernetes-mcp*`, {
      statusCode: 204,
    }).as('deleteMcpDeployment');

    mcpDeploymentsPage.visit('mcp-servers');
    mcpDeploymentsPage.getRow('kubernetes-mcp').findKebabAction('Delete').click();

    const modal = mcpDeploymentsPage.findDeleteModal();
    modal.shouldBeVisible();
    modal
      .findCascadeCleanupAlert()
      .should('contain.text', 'Cascade cleanup')
      .and('contain.text', 'access binding in the MCP registry');

    modal.findInput().type('kubernetes-mcp');
    modal.findSubmitButton().click();

    cy.wait('@deleteMcpDeployment');
    modal.shouldNotExist();
  });

  it('should show an inline error when deletion fails and keep the modal open', () => {
    cy.intercept('DELETE', `${MCP_DEPLOYMENTS_BFF}/kubernetes-mcp*`, {
      forceNetworkError: true,
    }).as('deleteMcpDeploymentFailed');

    mcpDeploymentsPage.visit('mcp-servers');

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
