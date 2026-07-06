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

  it('should display skills from agent card under the description', () => {
    interceptDetail();
    agentDeploymentDetailPage.visit(TEST_NAMESPACE, TEST_AGENT);

    agentDeploymentDetailPage.findSkillsSection().should('be.visible');
    agentDeploymentDetailPage
      .findSkillCard('code-generation')
      .should('contain.text', 'Code generation')
      .and('contain.text', 'ID: code-generation')
      .and('contain.text', 'Generate or refactor code from natural language prompts')
      .and('contain.text', 'development')
      .and('contain.text', 'Add unit tests for the auth module');
    agentDeploymentDetailPage
      .findSkillCard('code-generation')
      .should('not.contain.text', 'Input: text/plain');
    agentDeploymentDetailPage
      .findSkillCard('repository-analysis')
      .should('contain.text', 'Repository analysis')
      .and('contain.text', 'Input: text/plain · Output: text/plain');
  });

  it('should hide skills section when agent card has no skills', () => {
    interceptDetail(
      mockAgentRuntimeDetail({
        agentCard: mockAgentCardDetail({ skills: [] }),
      }),
    );
    agentDeploymentDetailPage.visit(TEST_NAMESPACE, TEST_AGENT);

    cy.findByTestId('agent-capabilities-skills').should('not.exist');
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
