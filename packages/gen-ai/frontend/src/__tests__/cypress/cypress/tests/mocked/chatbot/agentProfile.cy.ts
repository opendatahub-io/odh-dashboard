import { chatbotPage } from '~/__tests__/cypress/cypress/pages/chatbotPage';
import {
  interceptNewAgentProfile,
  interceptExistingAgentProfile,
} from '~/__tests__/cypress/cypress/support/helpers/agentProfiles/agentProfilePlaygroundHelpers';
import { mockAgentProfiles } from '~/__tests__/cypress/cypress/__mocks__';

// Use mock-test-namespace-2 which has LSD configured and ready in the BFF
const TEST_NAMESPACE = 'mock-test-namespace-2';
const NEW_PROFILE_ID = 'new-profile-uuid-1';
const EXISTING_PROFILE_ID = 'existing-profile-uuid-1';
const AGENT_NAME = 'My Coding Agent';

// localStorage key used by OpenAgentProfileModal to persist the "don't show again" preference
const DISMISSED_KEY = 'gen-ai-agent-open-modal-dismissed';

describe('Agent Profile - Playground (Mocked)', () => {
  beforeEach(() => {
    // Ensure the open-agent modal always appears by clearing the dismissed preference
    cy.clearLocalStorage(DISMISSED_KEY);
  });

  it(
    'should save a new profile and verify the same profile is active',
    { tags: ['@GenAI', '@AgentProfile', '@Chatbot'] },
    () => {
      interceptNewAgentProfile(NEW_PROFILE_ID, AGENT_NAME, TEST_NAMESPACE);

      cy.step('Visit playground (no agentProfileId — no modal)');
      chatbotPage.visit(TEST_NAMESPACE);

      cy.step('Open Save As modal via kebab menu — no profile loaded yet, name is empty');
      chatbotPage.openKebabAndClickItem('save-as-agent-profile-button');
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

      cy.step('Open-agent modal appears after Save As sets the profileId in the URL');
      chatbotPage.findOpenAgentModal().should('be.visible');
      chatbotPage.clickOpenAgentEdit();
      chatbotPage.findOpenAgentModal().should('not.exist');

      cy.step('Open Save modal via kebab — name matches the profile that was just saved');
      chatbotPage.openKebabAndClickItem('save-agent-profile-button');
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

      cy.step('Wait for profile to load, then dismiss open-agent modal via Edit');
      cy.wait('@getAgentProfile');
      chatbotPage.findOpenAgentModal().should('be.visible', { timeout: 10000 });
      chatbotPage.clickOpenAgentEdit();
      chatbotPage.findOpenAgentModal().should('not.exist');

      cy.step('Open Save modal via kebab — name is pre-filled from loaded profile');
      chatbotPage.openKebabAndClickItem('save-agent-profile-button');
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

  describe('Load Agent Profile Modal', () => {
    // Derive values from fixture so tests stay in sync with mock data automatically
    const profileList = mockAgentProfiles();
    const firstProfile = profileList.data.profiles[0];

    beforeEach(() => {
      cy.interceptGenAi('GET /api/v1/agent-profiles', profileList).as('listAgentProfiles');
      interceptExistingAgentProfile(
        firstProfile.profileId,
        firstProfile.displayName,
        TEST_NAMESPACE,
      );
      chatbotPage.visit(TEST_NAMESPACE);
    });

    it(
      'should open the load modal and show the profile list when Load is clicked',
      { tags: ['@GenAI', '@AgentProfile', '@Chatbot'] },
      () => {
        cy.step('Click Load via kebab menu');
        chatbotPage.openKebabAndClickItem('load-agent-profile-button');

        cy.step('Modal is visible and profiles are listed');
        cy.findByTestId('load-agent-profile-modal').should('be.visible');
        cy.wait('@listAgentProfiles');
        cy.findByTestId('load-agent-profile-modal').should('contain.text', 'Coding assistant');
        cy.findByTestId('load-agent-profile-modal').should(
          'contain.text',
          'Expense report assistant',
        );
      },
    );

    it(
      'should set agentProfileId in the URL and show open-agent modal when a profile row is clicked',
      { tags: ['@GenAI', '@AgentProfile', '@Chatbot'] },
      () => {
        cy.step('Open load modal via kebab');
        chatbotPage.openKebabAndClickItem('load-agent-profile-button');
        cy.wait('@listAgentProfiles');

        cy.step('Click the first profile row');
        cy.findByTestId(`load-agent-profile-row-${firstProfile.profileId}`).click();

        cy.step('Load modal closes and agentProfileId appears in URL');
        cy.findByTestId('load-agent-profile-modal').should('not.exist');
        cy.location('search').should('include', `agentProfileId=${firstProfile.profileId}`);

        cy.step('Open-agent modal appears after profile is fetched');
        cy.wait('@getAgentProfile');
        chatbotPage.findOpenAgentModal().should('be.visible', { timeout: 10000 });
      },
    );

    it(
      'should filter profiles by name in the load modal',
      { tags: ['@GenAI', '@AgentProfile', '@Chatbot'] },
      () => {
        cy.step('Open load modal via kebab');
        chatbotPage.openKebabAndClickItem('load-agent-profile-button');
        cy.wait('@listAgentProfiles');

        cy.step('Type in search box to filter');
        cy.findByTestId('load-agent-profile-search').type('Coding');
        cy.findByTestId('load-agent-profile-modal').should('contain.text', 'Coding assistant');
        cy.findByTestId('load-agent-profile-modal').should(
          'not.contain.text',
          'Expense report assistant',
        );
      },
    );

    it(
      'should close the load modal when Cancel is clicked',
      { tags: ['@GenAI', '@AgentProfile', '@Chatbot'] },
      () => {
        cy.step('Open and then cancel the modal via kebab');
        chatbotPage.openKebabAndClickItem('load-agent-profile-button');
        cy.findByTestId('load-agent-profile-modal').should('be.visible');
        cy.findByRole('button', { name: 'Cancel' }).click();
        cy.findByTestId('load-agent-profile-modal').should('not.exist');
      },
    );
  });

  describe('Open-Agent Modal', () => {
    beforeEach(() => {
      interceptExistingAgentProfile(EXISTING_PROFILE_ID, AGENT_NAME, TEST_NAMESPACE);
      chatbotPage.visit(TEST_NAMESPACE, { agentProfileId: EXISTING_PROFILE_ID });
      cy.wait('@getAgentProfile');
    });

    it(
      'should show the modal with the agent name when a profile is loaded from the URL',
      { tags: ['@GenAI', '@AgentProfile', '@Chatbot'] },
      () => {
        cy.step('Verify modal is visible and contains the agent name');
        chatbotPage.findOpenAgentModal().should('be.visible', { timeout: 10000 });
        chatbotPage.findOpenAgentModal().should('contain.text', AGENT_NAME);

        cy.step('Verify Preview and Edit buttons are present');
        cy.findByTestId('open-agent-profile-preview-button').should('be.visible');
        cy.findByTestId('open-agent-profile-edit-button').should('be.visible');
      },
    );

    it(
      'should enter preview mode and disable settings controls when Preview is clicked',
      { tags: ['@GenAI', '@AgentProfile', '@Chatbot'] },
      () => {
        cy.step('Click Preview to enter read-only mode');
        chatbotPage.findOpenAgentModal().should('be.visible', { timeout: 10000 });
        chatbotPage.clickOpenAgentPreview();
        chatbotPage.findOpenAgentModal().should('not.exist');

        cy.step('Streaming toggle should be disabled in preview mode');
        chatbotPage.findStreamingToggle().should('be.disabled');
      },
    );

    it(
      'should enter edit mode and leave settings controls enabled when Edit is clicked',
      { tags: ['@GenAI', '@AgentProfile', '@Chatbot'] },
      () => {
        cy.step('Click Edit to keep full configuration access');
        chatbotPage.findOpenAgentModal().should('be.visible', { timeout: 10000 });
        chatbotPage.clickOpenAgentEdit();
        chatbotPage.findOpenAgentModal().should('not.exist');

        cy.step('Streaming toggle should be enabled in edit mode');
        chatbotPage.findStreamingToggle().should('not.be.disabled');
      },
    );

    it(
      'should enter preview mode when the modal is closed via the X button',
      { tags: ['@GenAI', '@AgentProfile', '@Chatbot'] },
      () => {
        cy.step('Close modal via X button — enters preview (read-only) mode');
        chatbotPage.findOpenAgentModal().should('be.visible', { timeout: 10000 });
        chatbotPage.clickOpenAgentClose();
        chatbotPage.findOpenAgentModal().should('not.exist');

        cy.step('Streaming toggle should be disabled in preview mode');
        chatbotPage.findStreamingToggle().should('be.disabled');
      },
    );
  });
});
