import { mockNamespace } from '~/__mocks__/mockNamespace';
import {
  mockAgentRuntime,
  mockAgentRuntimeDetail,
  mockAgentRuntimesList,
  mockSparseAgentRuntimeDetail,
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
    status: 'pending',
    type: 'agent',
    endpointUrl: '',
    ports: [],
  }),
  mockAgentRuntime({
    name: 'failed-agent',
    namespace: TEST_NAMESPACE,
    status: 'failed',
    type: 'agent',
    endpointUrl: '',
    ports: [],
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
    const sparseRuntime =
      runtime.endpointUrl?.trim() === '' && runtime.ports.length === 0
        ? mockSparseAgentRuntimeDetail({
            name: runtime.name,
            namespace: runtime.namespace,
            runtime,
            workloadStatus: runtime.status,
            conditions:
              runtime.status === 'failed'
                ? [
                    {
                      type: 'Ready',
                      status: 'False',
                      reason: 'ReconcilerError',
                      message: 'Sandbox reconciliation failed.',
                      lastTransitionTime: '2026-05-12T16:00:03.214610Z',
                    },
                  ]
                : undefined,
          })
        : mockAgentRuntimeDetail({
            name: runtime.name,
            namespace: runtime.namespace,
            runtime,
            agentCard: mockAgentRuntimeDetail({ runtime }).agentCard,
          });

    cy.interceptApi(
      'GET /api/:apiVersion/agents/runtimes/:namespace/:name',
      {
        path: {
          apiVersion: CLIENT_API_VERSION,
          namespace: runtime.namespace,
          name: runtime.name,
        },
      },
      sparseRuntime,
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
    pendingRow.findEndpointViewButton().should('exist').and('be.disabled');

    const failedRow = agentDeploymentsPage.getRow(TEST_NAMESPACE, 'failed-agent');
    failedRow.findStatusLabel().should('contain.text', 'Failed');
    failedRow.findEndpointViewButton().should('exist').and('be.disabled');

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
    cy.findByTestId('deploy-agent-button').should('be.visible').and('be.enabled');
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

  it('should filter deployments by status', () => {
    initIntercepts();
    agentDeploymentsPage.visit(TEST_NAMESPACE);
    agentDeploymentsPage.findTable().should('be.visible');

    agentDeploymentsPage.selectStatusFilter('Pending');
    agentDeploymentsPage.expectSingleStatusFilterChip('Pending');
    agentDeploymentsPage.findTableRows().should('have.length', 1);
    agentDeploymentsPage
      .getRow(TEST_NAMESPACE, 'pending-agent')
      .findStatusLabel()
      .should('contain.text', 'Pending');

    agentDeploymentsPage.expectSingleStatusFilterChip('Pending');
    agentDeploymentsPage.selectStatusFilter('Failed');
    agentDeploymentsPage.expectSingleStatusFilterChip('Failed');
    agentDeploymentsPage.findTableRows().should('have.length', 1);
    agentDeploymentsPage
      .getRow(TEST_NAMESPACE, 'failed-agent')
      .findStatusLabel()
      .should('contain.text', 'Failed');

    agentDeploymentsPage.expectSingleStatusFilterChip('Failed');
    agentDeploymentsPage.selectStatusFilter('Ready');
    agentDeploymentsPage.expectSingleStatusFilterChip('Ready');
    agentDeploymentsPage.findTableRows().should('have.length', 1);
    agentDeploymentsPage
      .getRow(TEST_NAMESPACE, 'sample-support-agent')
      .findStatusLabel()
      .should('contain.text', 'Ready');
  });

  it('should filter deployments by project', () => {
    initIntercepts();
    agentDeploymentsPage.visit(TEST_NAMESPACE);
    agentDeploymentsPage.findTable().should('be.visible');

    agentDeploymentsPage.selectFilterOption('project');
    agentDeploymentsPage.findProjectFilterInput().type(TEST_NAMESPACE);
    agentDeploymentsPage.findTableRows().should('have.length', 4);

    agentDeploymentsPage.findProjectFilterInput().clear().type('nonexistent-project');
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

  it('should show pending-specific empty state in endpoints modal', () => {
    initIntercepts();
    agentDeploymentsPage.visit(TEST_NAMESPACE);

    agentDeploymentsPage.getRow(TEST_NAMESPACE, 'pending-agent').findEndpointViewButton().click();

    agentDeploymentsPage.findEndpointsModal().should('be.visible');
    agentDeploymentsPage.findEndpointsEmptyState().should('be.visible');
    agentDeploymentsPage
      .findEndpointsEmptyState()
      .should(
        'contain.text',
        'Endpoints appear when the agent Sandbox is Ready and the cluster Service is available. Check back shortly.',
      );
  });

  it('should show failed-specific empty state in endpoints modal', () => {
    initIntercepts();
    agentDeploymentsPage.visit(TEST_NAMESPACE);

    agentDeploymentsPage.getRow(TEST_NAMESPACE, 'failed-agent').findEndpointViewButton().click();

    agentDeploymentsPage.findEndpointsModal().should('be.visible');
    agentDeploymentsPage.findEndpointsEmptyState().should('be.visible');
    agentDeploymentsPage
      .findEndpointsEmptyState()
      .should(
        'contain.text',
        'This agent is not healthy. Open the agent detail page to review conditions and resolve deployment issues.',
      );
  });

  it('should show View details row action', () => {
    initIntercepts();
    agentDeploymentsPage.visit(TEST_NAMESPACE);

    const row = agentDeploymentsPage.getRow(TEST_NAMESPACE, 'sample-support-agent');
    row.findKebab().click();
    row.findViewDetailsAction().should('be.visible');
  });

  it('should stop a ready deployment from the row kebab menu', () => {
    const runtimes = mockAllRuntimes();

    initIntercepts({ runtimes });
    cy.intercept(
      {
        method: 'POST',
        pathname: `/agent-ops/api/${CLIENT_API_VERSION}/agents/runtimes/${TEST_NAMESPACE}/sample-support-agent/stop`,
      },
      {
        statusCode: 200,
        body: {
          data: {
            success: true,
            name: 'sample-support-agent',
            namespace: TEST_NAMESPACE,
            action: 'stop',
            message: 'Agent stop completed successfully',
          },
        },
      },
    ).as('stopAgent');

    agentDeploymentsPage.visit(TEST_NAMESPACE);
    cy.wait('@getAgentRuntimes');

    cy.intercept('GET', `/agent-ops/api/${CLIENT_API_VERSION}/agents/runtimes*`, (req) => {
      req.reply({
        body: {
          data: mockAgentRuntimesList(
            runtimes.map((runtime) =>
              runtime.name === 'sample-support-agent' ? { ...runtime, status: 'Stopped' } : runtime,
            ),
          ),
        },
      });
    }).as('getAgentRuntimesAfterStop');

    const row = agentDeploymentsPage.getRow(TEST_NAMESPACE, 'sample-support-agent');
    row.findKebab().click();
    row.findStopAction().click();
    cy.wait('@stopAgent');
    cy.wait('@getAgentRuntimesAfterStop');
    row.findStatusLabel().should('contain.text', 'Stopped');
  });

  it('should restart a stopped deployment from the row kebab menu', () => {
    const runtimes = mockAllRuntimes();

    initIntercepts({ runtimes });
    cy.intercept(
      {
        method: 'POST',
        pathname: `/agent-ops/api/${CLIENT_API_VERSION}/agents/runtimes/${TEST_NAMESPACE}/sample-tool/start`,
      },
      {
        statusCode: 200,
        body: {
          data: {
            success: true,
            name: 'sample-tool',
            namespace: TEST_NAMESPACE,
            action: 'start',
            message: 'Agent start completed successfully',
          },
        },
      },
    ).as('startAgent');

    agentDeploymentsPage.visit(TEST_NAMESPACE);
    cy.wait('@getAgentRuntimes');

    cy.intercept('GET', `/agent-ops/api/${CLIENT_API_VERSION}/agents/runtimes*`, (req) => {
      req.reply({
        body: {
          data: mockAgentRuntimesList(
            runtimes.map((runtime) =>
              runtime.name === 'sample-tool' ? { ...runtime, status: 'Ready' } : runtime,
            ),
          ),
        },
      });
    }).as('getAgentRuntimesAfterStart');

    const row = agentDeploymentsPage.getRow(TEST_NAMESPACE, 'sample-tool');
    row.findKebab().click();
    row.findRestartAction().click();
    cy.wait('@startAgent');
    cy.wait('@getAgentRuntimesAfterStart');
    row.findStatusLabel().should('contain.text', 'Ready');
  });

  it('should open delete confirmation modal and delete a deployment on confirm', () => {
    let runtimes = mockAllRuntimes();

    initIntercepts({ runtimes });
    cy.intercept(
      {
        method: 'DELETE',
        pathname: `/agent-ops/api/${CLIENT_API_VERSION}/agents/runtimes/${TEST_NAMESPACE}/failed-agent`,
      },
      { statusCode: 204 },
    ).as('deleteAgent');

    agentDeploymentsPage.visit(TEST_NAMESPACE);
    cy.wait('@getAgentRuntimes');

    cy.intercept('GET', `/agent-ops/api/${CLIENT_API_VERSION}/agents/runtimes*`, (req) => {
      runtimes = runtimes.filter((runtime) => runtime.name !== 'failed-agent');
      req.reply({ body: { data: mockAgentRuntimesList(runtimes) } });
    }).as('getAgentRuntimesAfterDelete');

    const row = agentDeploymentsPage.getRow(TEST_NAMESPACE, 'failed-agent');
    row.findKebab().click();
    row.findDeleteAction().click();
    agentDeploymentsPage.findDeleteModal().should('be.visible');
    agentDeploymentsPage.findDeleteModal().should('contain.text', 'failed-agent');
    agentDeploymentsPage.findDeleteModalConfirm().click();
    cy.wait('@deleteAgent');
    cy.wait('@getAgentRuntimesAfterDelete');
    agentDeploymentsPage.findTableRows().should('have.length', 3);
    cy.findByTestId(`agent-runtime-row-${TEST_NAMESPACE}-failed-agent`).should('not.exist');
  });

  it('should not delete a deployment when Cancel is clicked in the delete modal', () => {
    initIntercepts();
    agentDeploymentsPage.visit(TEST_NAMESPACE);

    const row = agentDeploymentsPage.getRow(TEST_NAMESPACE, 'failed-agent');
    row.findKebab().click();
    row.findDeleteAction().click();
    agentDeploymentsPage.findDeleteModal().should('be.visible');
    agentDeploymentsPage.findDeleteModalCancel().click();
    agentDeploymentsPage.findDeleteModal().should('not.exist');
    agentDeploymentsPage.findTableRows().should('have.length', 4);
  });
});
