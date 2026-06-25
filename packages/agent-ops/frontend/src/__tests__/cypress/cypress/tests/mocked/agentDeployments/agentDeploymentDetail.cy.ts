import { mockAgentCardDetail, mockAgentRuntimeDetail } from '~/__mocks__/mockAgentRuntime';
import { agentDeploymentDetailPage } from '~/__tests__/cypress/cypress/pages/agentDeploymentDetail';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';

const TEST_NAMESPACE = 'agent-ops-demo';
const TEST_AGENT = 'sample-support-agent';

const detailPathname = `/agent-ops/api/${CLIENT_API_VERSION}/agents/runtimes/${TEST_NAMESPACE}/${TEST_AGENT}`;

const interceptDetail = (detail = mockAgentRuntimeDetail()) => {
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
  );
};

describe('Agent deployment detail', () => {
  it('should display agent title, description, and details sidebar', () => {
    interceptDetail();
    agentDeploymentDetailPage.visit(TEST_NAMESPACE, TEST_AGENT);
    agentDeploymentDetailPage.findTitle().should('contain.text', TEST_AGENT);
    agentDeploymentDetailPage.findStatusLabel().should('contain.text', 'Ready');
    agentDeploymentDetailPage
      .findDescription()
      .should('contain.text', 'Customer support agent that triages tickets and drafts responses.');
    agentDeploymentDetailPage.findAgentDetailsCard().should('be.visible');
    cy.findByTestId('agent-card-version').should('contain.text', '1.0.0');
    cy.findByTestId('agent-card-provider').should('contain.text', 'Red Hat OpenShift AI');
  });

  it('should show agent details at full width when description is absent', () => {
    interceptDetail(
      mockAgentRuntimeDetail({
        description: '',
        agentCard: mockAgentCardDetail({ description: '' }),
      }),
    );
    agentDeploymentDetailPage.visit(TEST_NAMESPACE, TEST_AGENT);

    agentDeploymentDetailPage.findDescriptionCard().should('not.exist');
    agentDeploymentDetailPage.findAgentDetailsCard().should('be.visible');
  });

  it('should show loading state while detail is being fetched', () => {
    cy.intercept(
      {
        method: 'GET',
        pathname: detailPathname,
      },
      (req) => {
        req.reply({ delay: 60000, body: { data: mockAgentRuntimeDetail() } });
      },
    );

    cy.visit(`/deployments/${TEST_NAMESPACE}/${TEST_AGENT}`);
    agentDeploymentDetailPage.findLoadingState().should('be.visible');
  });

  it('should show access denied when detail returns 403', () => {
    cy.intercept(
      {
        method: 'GET',
        pathname: detailPathname,
      },
      {
        statusCode: 403,
        body: { error: 'Forbidden' },
      },
    );

    cy.visit(`/deployments/${TEST_NAMESPACE}/${TEST_AGENT}`);
    agentDeploymentDetailPage
      .findAccessDeniedState()
      .should('be.visible')
      .and('contain.text', 'Access permissions needed');
  });

  it('should show not found when detail returns 404', () => {
    cy.intercept(
      {
        method: 'GET',
        pathname: detailPathname,
      },
      {
        statusCode: 404,
        body: { error: 'Not Found' },
      },
    );

    cy.visit(`/deployments/${TEST_NAMESPACE}/${TEST_AGENT}`);
    agentDeploymentDetailPage
      .findNotFoundState()
      .should('be.visible')
      .and('contain.text', 'Agent not found');
  });

  it('should show error state when detail fails to load', () => {
    cy.intercept(
      {
        method: 'GET',
        pathname: detailPathname,
      },
      {
        statusCode: 500,
        body: { error: 'Internal Server Error' },
      },
    );

    cy.visit(`/deployments/${TEST_NAMESPACE}/${TEST_AGENT}`);
    agentDeploymentDetailPage
      .findErrorState()
      .should('be.visible')
      .and('contain.text', 'Error loading agent');
  });
});
