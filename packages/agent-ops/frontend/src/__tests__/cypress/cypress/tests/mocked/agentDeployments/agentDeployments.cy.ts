import { mockNamespace } from '~/__mocks__/mockNamespace';
import {
  mockAgentRuntime,
  mockAgentRuntimeDetail,
  mockAgentRuntimesList,
} from '~/__mocks__/mockAgentRuntime';
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

  runtimes.forEach((runtime) => {
    cy.interceptApi(
      'GET /api/:apiVersion/agents/runtimes/:namespace/:name',
      {
        path: {
          apiVersion: CLIENT_API_VERSION,
          namespace: runtime.namespace,
          name: runtime.name,
        },
      },
      mockAgentRuntimeDetail({
        name: runtime.name,
        namespace: runtime.namespace,
        runtime,
        agentCard:
          runtime.endpointUrl.trim() === '' ? null : mockAgentRuntimeDetail({ runtime }).agentCard,
      }),
    ).as(`getAgentRuntimeDetail-${runtime.namespace}-${runtime.name}`);
  });
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
    pendingRow.findEndpointViewButton().should('exist').and('not.be.disabled');

    const failedRow = agentDeploymentsPage.getRow(TEST_NAMESPACE, 'failed-agent');
    failedRow.findStatusLabel().should('contain.text', 'Failed');
    failedRow.findEndpointViewButton().should('exist').and('not.be.disabled');

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

  it('should show select-project state when no namespace is selected and no projects exist', () => {
    initIntercepts({ runtimes: [], namespaces: [] });
    agentDeploymentsPage.visit();

    agentDeploymentsPage
      .findSelectProjectState()
      .should('be.visible')
      .and('contain.text', 'Select a project');
  });

  it('should redirect to the active project when no namespace is selected', () => {
    const preferredNamespace = 'preferred-project';
    initIntercepts({
      runtimes: [
        mockAgentRuntime({
          name: 'other-agent',
          namespace: 'other-project',
          status: 'Ready',
          type: 'agent',
        }),
      ],
      namespaces: [
        mockNamespace({ name: preferredNamespace }),
        mockNamespace({ name: 'other-project' }),
      ],
    });
    agentDeploymentsPage.visit();

    cy.url().should('include', `/deployments/${preferredNamespace}`);
    agentDeploymentsPage.findEmptyState().should('be.visible');
  });

  it('should show loading spinner while runtimes are being fetched', () => {
    cy.interceptApi(
      'GET /api/:apiVersion/namespaces',
      {
        path: {
          apiVersion: CLIENT_API_VERSION,
        },
      },
      [mockNamespace({ name: TEST_NAMESPACE })],
    );

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
    cy.interceptApi(
      'GET /api/:apiVersion/namespaces',
      {
        path: {
          apiVersion: CLIENT_API_VERSION,
        },
      },
      [mockNamespace({ name: TEST_NAMESPACE })],
    );

    cy.intercept(
      {
        method: 'GET',
        pathname: `/agent-ops/api/${CLIENT_API_VERSION}/agents/runtimes`,
      },
      {
        statusCode: 500,
        body: { error: 'Internal Server Error' },
      },
    );

    agentDeploymentsPage.visit(TEST_NAMESPACE);
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
      .findEndpointField('cluster-url')
      .should('have.value', 'http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080');
    agentDeploymentsPage
      .findEndpointField('local-url')
      .should(
        'have.value',
        'http://sample-support-agent.agent-ops-demo.svc.cluster.local:8080/.well-known/agent-card.json',
      );
    agentDeploymentsPage
      .findEndpointField('external-production-endpoint')
      .should(
        'have.value',
        'https://sample-support-agent.apps.example.com/.well-known/agent-card.json',
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
