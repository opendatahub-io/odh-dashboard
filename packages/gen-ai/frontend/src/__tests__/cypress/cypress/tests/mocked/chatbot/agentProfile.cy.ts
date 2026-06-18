/* eslint-disable camelcase */
import { chatbotPage } from '~/__tests__/cypress/cypress/pages/chatbotPage';
import {
  interceptNewAgentProfile,
  interceptExistingAgentProfile,
} from '~/__tests__/cypress/cypress/support/helpers/agentProfiles/agentProfilePlaygroundHelpers';

// Use mock-test-namespace-2 which has LSD configured and ready in the BFF
const TEST_NAMESPACE = 'mock-test-namespace-2';
const NEW_PROFILE_ID = 'new-profile-uuid-1';
const EXISTING_PROFILE_ID = 'existing-profile-uuid-1';
const AGENT_NAME = 'My Coding Agent';

describe('Agent Profile - Playground (Mocked)', () => {
  beforeEach(() => {
    Cypress.env('_featureFlagParams', 'agentProfileManagement=true');
  });

  afterEach(() => {
    Cypress.env('_featureFlagParams', '');
  });

  it(
    'should save a new profile and verify the same profile is active',
    { tags: ['@GenAI', '@AgentProfile', '@Chatbot'] },
    () => {
      interceptNewAgentProfile(NEW_PROFILE_ID, AGENT_NAME, TEST_NAMESPACE);

      cy.step('Visit playground with agentProfileManagement flag');
      chatbotPage.visit(TEST_NAMESPACE);

      cy.step('Open Save As modal — no profile loaded yet, name is empty');
      cy.findByTestId('save-as-agent-profile-button', { timeout: 10000 }).click();
      cy.findByTestId('save-agent-profile-modal').should('be.visible');
      cy.findByTestId('save-agent-profile-name-input').should('have.value', '');

      cy.step('Fill name and submit');
      cy.findByTestId('save-agent-profile-name-input').type(AGENT_NAME);
      cy.findByTestId('save-agent-profile-submit-button').click();
      cy.wait('@createAgentProfile').then((interception) => {
        expect(interception.request.body.spec.displayName).to.equal(AGENT_NAME);
      });

      cy.step('Profile is now active — Save button replaces Save As, URL has profileId');
      cy.findByTestId('save-agent-profile-modal').should('not.exist');
      cy.location('search').should('include', `agentProfileId=${NEW_PROFILE_ID}`);
      cy.findByTestId('save-agent-profile-button', { timeout: 10000 }).should('be.visible');

      cy.step('Open Save modal — name matches the profile that was just saved');
      cy.findByTestId('save-agent-profile-button').click();
      cy.findByTestId('save-agent-profile-name-input').should('have.value', AGENT_NAME);
      cy.findByRole('button', { name: 'Cancel' }).click();
    },
  );

  it(
    'should update an existing profile via PUT and include resourceVersion',
    { tags: ['@GenAI', '@AgentProfile', '@Chatbot'] },
    () => {
      interceptExistingAgentProfile(EXISTING_PROFILE_ID, AGENT_NAME, TEST_NAMESPACE);

      cy.step('Visit playground with an existing agentProfileId in the URL');
      chatbotPage.visit(TEST_NAMESPACE, { agentProfileId: EXISTING_PROFILE_ID });

      cy.step('Wait for profile to load and Save button to appear');
      cy.wait('@getAgentProfile');
      cy.findByTestId('save-agent-profile-button', { timeout: 10000 }).should('be.visible');

      cy.step('Open Save modal — name is pre-filled from loaded profile');
      cy.findByTestId('save-agent-profile-button').click();
      cy.findByTestId('save-agent-profile-modal').should('be.visible');
      cy.findByTestId('save-agent-profile-name-input').should('have.value', AGENT_NAME);

      cy.step('Submit and verify PUT request includes resourceVersion');
      cy.findByTestId('save-agent-profile-submit-button').click();
      cy.wait('@updateAgentProfile').then((interception) => {
        expect(interception.request.body.spec.displayName).to.equal(AGENT_NAME);
        expect(interception.request.body.resourceVersion).to.equal('rv-1');
      });

      cy.findByTestId('save-agent-profile-modal').should('not.exist');
    },
  );
});
