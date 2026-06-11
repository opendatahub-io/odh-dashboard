import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockAgentRuntime, mockAgentRuntimesList } from '~/__mocks__/mockAgentRuntime';
import { mockAgentCard } from '~/__mocks__/mockAgentCard';
import { mockAgentRuntimeDetail } from '~/__mocks__/mockAgentRuntimeDetail';
import type { AgentRuntime } from '~/app/types/agentRuntimes';
import { agentDeploymentDetailPage } from '~/__tests__/cypress/cypress/pages/agentDeploymentDetail';
import { agentDeploymentsPage } from '~/__tests__/cypress/cypress/pages/agentDeployments';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';

const TEST_NAMESPACE = 'agent-ops-demo';
const TEST_AGENT = 'sample-support-agent';

const mockRuntimes = (): AgentRuntime[] => [
  mockAgentRuntime({
    name: TEST_AGENT,
    namespace: TEST_NAMESPACE,
    status: 'Ready',
    type: 'agent',
  }),
];

const initIntercepts = ({
  detail = mockAgentRuntimeDetail(),
  agentCard = mockAgentCard(),
  runtimes = mockRuntimes(),
}: {
  detail?: ReturnType<typeof mockAgentRuntimeDetail>;
  agentCard?: ReturnType<typeof mockAgentCard>;
  runtimes?: AgentRuntime[];
} = {}) => {
  cy.interceptApi(
    'GET /api/:apiVersion/namespaces',
    { path: { apiVersion: CLIENT_API_VERSION } },
    [mockNamespace({ name: TEST_NAMESPACE })],
  );

  cy.interceptApi(
    'GET /api/:apiVersion/agents/runtimes',
    { path: { apiVersion: CLIENT_API_VERSION } },
    mockAgentRuntimesList(runtimes),
  );

  cy.interceptApi(
    'GET /api/:apiVersion/agents/runtimes/:namespace/:name',
    {
      path: {
        apiVersion: CLIENT_API_VERSION,
        namespace: TEST_NAMESPACE,
        name: TEST_AGENT,
      },
    },
    detail,
  ).as('getAgentRuntimeDetail');

  cy.interceptApi(
    'GET /api/:apiVersion/agents/cards/:namespace/:name',
    {
      path: {
        apiVersion: CLIENT_API_VERSION,
        namespace: TEST_NAMESPACE,
        name: TEST_AGENT,
      },
    },
    agentCard,
  ).as('getAgentCard');
};

describe('Agent Deployment Detail', () => {
  it('should navigate from list and display overview fields', () => {
    initIntercepts();
    agentDeploymentsPage.visit(TEST_NAMESPACE);

    const row = agentDeploymentsPage.getRow(TEST_NAMESPACE, TEST_AGENT);
    row.findName().click();

    cy.wait('@getAgentRuntimeDetail');

    agentDeploymentDetailPage.findBreadcrumbName().should('contain.text', TEST_AGENT);
    agentDeploymentDetailPage.findTitle().should('contain.text', TEST_AGENT);
    agentDeploymentDetailPage.findStatusLabel().should('contain.text', 'Ready');
    agentDeploymentDetailPage.findOverviewTab().should('be.visible');
    agentDeploymentDetailPage.findDescription().should('contain.text', 'Customer support agent');
    agentDeploymentDetailPage.findCapabilitiesCard().should('be.visible');
    agentDeploymentDetailPage.findAgentCardCopy().should('exist');
    agentDeploymentDetailPage.findVersion().should('contain.text', '1.2.0');
  });

  it('should load overview when visiting detail URL directly', () => {
    initIntercepts();
    agentDeploymentDetailPage.visit(TEST_NAMESPACE, TEST_AGENT);

    cy.wait('@getAgentRuntimeDetail');
    agentDeploymentDetailPage.findOverviewTab().should('be.visible');
    agentDeploymentDetailPage.findCapabilitiesCard().should('be.visible');
  });

  it('should show not found empty state when detail fetch returns 404', () => {
    initIntercepts({ runtimes: [] });

    cy.intercept(
      {
        method: 'GET',
        pathname: `/agent-ops/api/${CLIENT_API_VERSION}/agents/runtimes/${TEST_NAMESPACE}/missing-agent`,
      },
      {
        statusCode: 404,
        body: {
          error: {
            code: '404',
            message: 'the requested resource could not be found',
          },
        },
      },
    ).as('getAgentRuntimeDetailNotFound');

    agentDeploymentDetailPage.visit(TEST_NAMESPACE, 'missing-agent');
    cy.wait('@getAgentRuntimeDetailNotFound');
    agentDeploymentDetailPage.findNotFoundState().should('be.visible');
    agentDeploymentDetailPage.findBreadcrumbName().should('contain.text', 'missing-agent');
  });

  it('should show error when detail fetch fails with a server error', () => {
    initIntercepts({ runtimes: [] });

    cy.intercept(
      {
        method: 'GET',
        pathname: `/agent-ops/api/${CLIENT_API_VERSION}/agents/runtimes/${TEST_NAMESPACE}/missing-agent`,
      },
      {
        statusCode: 500,
        body: {
          error: {
            code: '500',
            message: 'the server encountered a problem and could not process your request',
          },
        },
      },
    ).as('getAgentRuntimeDetailFailed');

    agentDeploymentDetailPage.visit(TEST_NAMESPACE, 'missing-agent');
    cy.wait('@getAgentRuntimeDetailFailed');
    cy.findByText('Unable to load agent deployment details').should('be.visible');
  });
});
