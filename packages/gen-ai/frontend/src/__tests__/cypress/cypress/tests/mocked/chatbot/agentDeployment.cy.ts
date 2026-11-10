import { aiAssetsPage } from '~/__tests__/cypress/cypress/pages/aiAssetsPage';
import { chatbotPage } from '~/__tests__/cypress/cypress/pages/chatbotPage';
import {
  mockAgentDeployment,
  mockAgentDeploymentCreateResponse,
  mockAgentDeployments,
  mockAgentProfiles,
} from '~/__tests__/cypress/cypress/__mocks__';
import {
  interceptExistingAgentProfile,
  setupPlaygroundBase,
} from '~/__tests__/cypress/cypress/support/helpers/agentProfiles/agentProfilePlaygroundHelpers';

const TEST_NAMESPACE = 'mock-test-namespace-2';
const PROFILE_ID = 'test-uuid-1';
const PROFILE_NAME = 'Coding assistant';
const DEPLOYMENT_NAME = 'coding-assistant-1';

describe('Agent deployment - Playground and AI Assets (Mocked)', () => {
  it(
    'should create a deployment, show it in Playground, and list it in AI Assets',
    { tags: ['@GenAI', '@AgentProfiles', '@AgentDeployments', '@Chatbot', '@AIAssets'] },
    () => {
      const deployment = mockAgentDeployment({
        name: DEPLOYMENT_NAME,
        namespace: TEST_NAMESPACE,
        agentProfileId: PROFILE_ID,
      });
      let deploymentCreated = false;
      let deploymentDetailRequestCount = 0;

      setupPlaygroundBase(TEST_NAMESPACE);
      interceptExistingAgentProfile(PROFILE_ID, PROFILE_NAME, TEST_NAMESPACE);
      cy.interceptGenAi('GET /api/v1/agent-deployments', (request) => {
        request.reply(
          deploymentCreated ? mockAgentDeployments([deployment]) : mockAgentDeployments(),
        );
      }).as('listAgentDeployments');
      cy.interceptGenAi('POST /api/v1/agent-deployments', (request) => {
        deploymentCreated = true;
        request.reply(
          mockAgentDeploymentCreateResponse({
            sandboxName: DEPLOYMENT_NAME,
            namespace: TEST_NAMESPACE,
            routeUrl: deployment.routeUrl,
            agentProfileId: PROFILE_ID,
          }),
        );
      }).as('createAgentDeployment');
      cy.interceptGenAi('GET /api/v1/agent-deployments/*', (request) => {
        deploymentDetailRequestCount += 1;
        request.reply({
          data: {
            ...deployment,
            state: deploymentDetailRequestCount === 1 ? 'creating' : 'ready',
          },
        });
      }).as('getAgentDeployment');
      cy.interceptGenAi('GET /api/v1/agent-profiles', mockAgentProfiles()).as('listAgentProfiles');

      cy.step('Open the saved agent in Playground');
      chatbotPage.visit(TEST_NAMESPACE, { agentProfileId: PROFILE_ID });
      cy.wait('@getAgentProfile');
      cy.wait('@listAgentDeployments');
      cy.wait('@listAgentDeployments');

      cy.step('Create an agent deployment');
      cy.findByTestId('header-kebab-menu-toggle').click();
      cy.findByTestId('deploy-agent-menu-item').click();
      cy.findByTestId('deploy-agent-modal').should('be.visible');
      cy.findByTestId('deploy-agent-name-input').should('have.value', DEPLOYMENT_NAME);
      cy.findByTestId('deploy-agent-submit-button').click();
      cy.wait('@updateAgentProfile');
      cy.wait('@createAgentDeployment').then((interception) => {
        expect(interception.request.body).to.deep.equal({
          name: DEPLOYMENT_NAME,
          agentProfileId: PROFILE_ID,
        });
      });
      cy.wait('@getAgentDeployment').its('response.body.data.state').should('equal', 'creating');
      cy.wait('@getAgentDeployment').its('response.body.data.state').should('equal', 'ready');

      cy.step('Verify the deployment can be viewed in Playground');
      cy.findByTestId('agent-deployed-label').should('be.visible').and('contain.text', 'Deployed');
      cy.findByTestId('agent-deployed-label').click();
      cy.findByTestId('agent-deployments-modal').should('be.visible');
      cy.findByTestId(`agent-deployment-tab-${DEPLOYMENT_NAME}`).should('be.visible');
      cy.findByLabelText(`API endpoint for ${DEPLOYMENT_NAME}`)
        .find('input')
        .should('have.value', 'https://coding-assistant-1.apps.example.com/v1/responses');

      cy.step('Verify the deployment appears for its agent in AI Assets');
      aiAssetsPage.visit(TEST_NAMESPACE);
      aiAssetsPage.switchToAgentProfilesTab();
      cy.wait('@listAgentProfiles');
      cy.wait('@listAgentDeployments');
      cy.findByTestId(`agent-profile-row-${PROFILE_ID}`).within(() => {
        cy.findByTestId(`view-agent-endpoints-${PROFILE_ID}`).should('be.visible');
      });
      cy.findByTestId('agent-deployment-filter-deployed').click();
      cy.findByTestId('agent-deployment-filter-deployed')
        .find('button')
        .should('have.attr', 'aria-pressed', 'true');
      cy.findByTestId(`agent-profile-row-${PROFILE_ID}`).should('be.visible');
      cy.findByTestId('agent-profile-row-test-uuid-2').should('not.exist');
    },
  );
});
