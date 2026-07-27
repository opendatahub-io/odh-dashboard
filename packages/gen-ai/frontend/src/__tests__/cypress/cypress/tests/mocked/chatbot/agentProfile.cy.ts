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

describe('Agent Profile - Playground (Mocked)', () => {
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

      cy.step('Profile is now active — Save button available, URL has profileId');
      cy.findByTestId('save-agent-profile-modal').should('not.exist');
      cy.location('search').should('include', `agentProfileId=${NEW_PROFILE_ID}`);

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

      cy.step('Wait for profile to load');
      cy.wait('@getAgentProfile');

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

        cy.step('Click Load agent button for the first profile');
        cy.findByTestId(`load-agent-profile-button-${firstProfile.profileId}`).click();

        cy.step('Load modal closes and agentProfileId appears in URL');
        cy.findByTestId('load-agent-profile-modal').should('not.exist');
        cy.location('search').should('include', `agentProfileId=${firstProfile.profileId}`);

        cy.step('Profile is fetched and applied');
        cy.wait('@getAgentProfile');
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
});
