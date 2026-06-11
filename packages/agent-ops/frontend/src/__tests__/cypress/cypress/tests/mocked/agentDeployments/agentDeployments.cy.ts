import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockAgentRuntime, mockAgentRuntimesList } from '~/__mocks__/mockAgentRuntime';
import type { AgentRuntime } from '~/app/types/agentRuntimes';
import { agentDeploymentsPage } from '~/__tests__/cypress/cypress/pages/agentDeployments';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';

const TEST_NAMESPACE = 'agent-ops-demo';

const mockAllRuntimes = (): AgentRuntime[] => [
  mockAgentRuntime({
    name: 'sample-support-agent',
    namespace: TEST_NAMESPACE,
    status: 'Ready',
    type: 'agent',
  }),
  mockAgentRuntime({
    name: 'pending-agent',
    namespace: TEST_NAMESPACE,
    status: 'Pending',
    type: 'agent',
    endpointUrl: '',
  }),
  mockAgentRuntime({
    name: 'failed-agent',
    namespace: TEST_NAMESPACE,
    status: 'Failed',
    type: 'agent',
    endpointUrl: '',
  }),
  mockAgentRuntime({
    name: 'sample-tool',
    namespace: TEST_NAMESPACE,
    status: 'Stopped',
    type: 'tool',
  }),
];

const initIntercepts = ({
  runtimes = mockAllRuntimes(),
  namespaces = [mockNamespace({ name: TEST_NAMESPACE })],
}: {
  runtimes?: AgentRuntime[];
  namespaces?: ReturnType<typeof mockNamespace>[];
} = {}) => {
  cy.interceptApi(
    'GET /api/:apiVersion/namespaces',
    {
      path: {
        apiVersion: CLIENT_API_VERSION,
      },
    },
    namespaces,
  );

  cy.interceptApi(
    'GET /api/:apiVersion/agents/runtimes',
    {
      path: {
        apiVersion: CLIENT_API_VERSION,
      },
    },
    mockAgentRuntimesList(runtimes),
  ).as('getAgentRuntimes');
};

describe('Agent Deployments', () => {
  it('should display row data and status labels', () => {
    initIntercepts();
    agentDeploymentsPage.visit(TEST_NAMESPACE);

    agentDeploymentsPage.findTable().should('be.visible');
    agentDeploymentsPage.findTableRows().should('have.length', 4);

    const readyRow = agentDeploymentsPage.getRow(TEST_NAMESPACE, 'sample-support-agent');
    readyRow.findName().should('contain.text', 'sample-support-agent');
    readyRow.findNamespace().should('contain.text', TEST_NAMESPACE);
    readyRow.findStatusLabel().should('contain.text', 'Ready');
    readyRow.findEndpointViewButton().should('exist').and('not.be.disabled');

    const pendingRow = agentDeploymentsPage.getRow(TEST_NAMESPACE, 'pending-agent');
    pendingRow.findStatusLabel().should('contain.text', 'Pending');
    pendingRow.findEndpointViewButton().should('be.disabled');

    const failedRow = agentDeploymentsPage.getRow(TEST_NAMESPACE, 'failed-agent');
    failedRow.findStatusLabel().should('contain.text', 'Failed');
    failedRow.findEndpointViewButton().should('be.disabled');

    const stoppedRow = agentDeploymentsPage.getRow(TEST_NAMESPACE, 'sample-tool');
    stoppedRow.findStatusLabel().should('contain.text', 'Stopped');
  });

  it('should show empty state when no agents are deployed', () => {
    initIntercepts({ runtimes: [] });
    agentDeploymentsPage.visit(TEST_NAMESPACE);

    agentDeploymentsPage
      .findEmptyState()
      .should('be.visible')
      .and('contain.text', 'No agent deployments');
  });

  it('should show select-project state when no namespace is selected and no runtimes exist', () => {
    initIntercepts({ runtimes: [] });
    agentDeploymentsPage.visit();

    agentDeploymentsPage
      .findSelectProjectState()
      .should('be.visible')
      .and('contain.text', 'Select a project');
  });

  it('should show loading spinner while runtimes are being fetched', () => {
    cy.intercept(
      {
        method: 'GET',
        pathname: `/agent-ops/api/${CLIENT_API_VERSION}/agents/runtimes`,
      },
      (req) => {
        req.reply({ delay: 60000, body: { data: mockAgentRuntimesList([]) } });
      },
    );

    agentDeploymentsPage.visit(TEST_NAMESPACE);
    agentDeploymentsPage.findLoadingSpinner().should('exist');
  });

  it('should show error alert when runtimes fail to load', () => {
    cy.intercept(
      {
        method: 'GET',
        pathname: `/agent-ops/api/${CLIENT_API_VERSION}/agents/runtimes`,
      },
      {
        statusCode: 500,
        body: { error: 'Internal Server Error' },
      },
    ).as('getAgentRuntimesFailed');

    agentDeploymentsPage.visit(TEST_NAMESPACE);
    cy.wait('@getAgentRuntimesFailed');
    agentDeploymentsPage.findErrorAlert().should('exist');
  });

  it('should filter deployments by name', () => {
    initIntercepts();
    agentDeploymentsPage.visit(TEST_NAMESPACE);
    agentDeploymentsPage.findTable().should('be.visible');

    agentDeploymentsPage.findFilterInput().type('pending');
    agentDeploymentsPage.findTableRows().should('have.length', 1);
    agentDeploymentsPage
      .getRow(TEST_NAMESPACE, 'pending-agent')
      .findName()
      .should('contain.text', 'pending-agent');

    agentDeploymentsPage.findFilterInput().clear().type('nonexistent-xyz');
    agentDeploymentsPage.findTableRows().should('have.length', 0);
  });

  it('should open endpoints modal from the View link', () => {
    initIntercepts();
    agentDeploymentsPage.visit(TEST_NAMESPACE);

    agentDeploymentsPage
      .getRow(TEST_NAMESPACE, 'sample-support-agent')
      .findEndpointViewButton()
      .click();

    agentDeploymentsPage.findEndpointsModal().should('be.visible');
    agentDeploymentsPage
      .findEndpointUrlInput()
      .should(
        'have.value',
        'http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080',
      );
  });

  it('should show View details row action', () => {
    initIntercepts();
    agentDeploymentsPage.visit(TEST_NAMESPACE);

    const row = agentDeploymentsPage.getRow(TEST_NAMESPACE, 'sample-support-agent');
    row.findKebab().click();
    row.findViewDetailsAction().should('be.visible');
  });
});
