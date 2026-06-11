import { aiAssetsPage } from '~/__tests__/cypress/cypress/pages/aiAssetsPage';
import { setupAgentProfilesIntercepts } from '~/__tests__/cypress/cypress/support/helpers/agentProfiles/agentProfilesTestHelpers';

const TEST_NAMESPACE = 'mock-test-namespace-2';
const AGENT_PROFILE_PARAMS = { agentProfileManagement: 'true' };

describe('AI Assets - Agent Profiles', () => {
  beforeEach(() => {
    setupAgentProfilesIntercepts({ namespace: TEST_NAMESPACE });
    aiAssetsPage.visit(TEST_NAMESPACE, AGENT_PROFILE_PARAMS);
    aiAssetsPage.switchToAgentProfilesTab();
    cy.wait('@listAgentProfiles');
  });

  it(
    'should display the agent profiles table with name, description, and last modified columns',
    { tags: ['@GenAI', '@AgentProfiles', '@AIAssets'] },
    () => {
      cy.step('Verify the table is visible');
      cy.findByTestId('agent-profiles-table').should('be.visible');

      cy.step('Verify profile rows are displayed');
      cy.findByTestId('agent-profiles-table').should('contain.text', 'Coding assistant');
      cy.findByTestId('agent-profiles-table').should('contain.text', 'Expense report assistant');

      cy.step('Verify description is shown');
      cy.findByTestId('agent-profiles-table').should(
        'contain.text',
        'Code review and explanation with GitHub tools',
      );

      cy.step('Verify Try in Playground button is present');
      cy.findByTestId('try-in-playground-test-uuid-1').should('be.visible');
    },
  );

  it('should filter profiles by name', { tags: ['@GenAI', '@AgentProfiles', '@AIAssets'] }, () => {
    cy.step('Type a name filter');
    cy.findByTestId('agent-profiles-search-input').type('Coding{enter}');

    cy.step('Verify only matching profile is shown');
    cy.findByTestId('agent-profiles-table').should('contain.text', 'Coding assistant');
    cy.findByTestId('agent-profiles-table').should('not.contain.text', 'Expense report');

    cy.step('Clear the filter via the chip close button');
    cy.findByRole('button', { name: 'Remove Name filter' }).click();
    cy.findByTestId('agent-profiles-table').should('contain.text', 'Expense report assistant');
  });

  it(
    'should open and cancel the edit modal',
    { tags: ['@GenAI', '@AgentProfiles', '@AIAssets'] },
    () => {
      cy.step('Open the kebab menu for the first profile');
      cy.findByTestId('agent-profile-kebab-test-uuid-1').click();

      cy.step('Click Edit');
      cy.findByTestId('edit-agent-profile-test-uuid-1').click();

      cy.step('Verify the edit modal is open and pre-filled');
      cy.findByTestId('edit-agent-profile-modal').should('be.visible');
      cy.findByTestId('edit-agent-profile-name').should('have.value', 'Coding assistant');
      cy.findByTestId('edit-agent-profile-description').should(
        'have.value',
        'Code review and explanation with GitHub tools',
      );

      cy.step('Cancel and verify modal closes');
      cy.findByRole('button', { name: 'Cancel' }).click();
      cy.findByTestId('edit-agent-profile-modal').should('not.exist');
    },
  );

  it(
    'should save name and description changes via the edit modal',
    { tags: ['@GenAI', '@AgentProfiles', '@AIAssets'] },
    () => {
      cy.step('Open the kebab menu and click Edit');
      cy.findByTestId('agent-profile-kebab-test-uuid-1').click();
      cy.findByTestId('edit-agent-profile-test-uuid-1').click();

      cy.step('Wait for full profile fetch');
      cy.wait('@getAgentProfile');

      cy.step('Update the name');
      cy.findByTestId('edit-agent-profile-name').clear();
      cy.findByTestId('edit-agent-profile-name').type('Updated Name');

      cy.step('Save');
      cy.findByTestId('edit-agent-profile-save-button').click();
      cy.wait('@updateAgentProfile').then((interception) => {
        expect(interception.request.body).to.have.nested.property(
          'spec.displayName',
          'Updated Name',
        );
      });

      cy.step('Verify modal closes');
      cy.findByTestId('edit-agent-profile-modal').should('not.exist');
    },
  );

  it(
    'should open and confirm the delete modal',
    { tags: ['@GenAI', '@AgentProfiles', '@AIAssets'] },
    () => {
      cy.step('Open the kebab menu and click Delete');
      cy.findByTestId('agent-profile-kebab-test-uuid-1').click();
      cy.findByTestId('delete-agent-profile-test-uuid-1').click();

      cy.step('Verify the delete confirmation modal is open');
      cy.findByRole('dialog').should('be.visible');
      cy.findByRole('dialog').should('contain.text', 'Coding assistant');

      cy.step('Confirm deletion');
      cy.findByTestId('delete-agent-profile-confirm-button').click();
      cy.wait('@deleteAgentProfile');

      cy.step('Verify modal closes after deletion');
      cy.findByTestId('delete-agent-profile-modal').should('not.exist');
    },
  );
});

describe('AI Assets - Agent Profiles (empty state)', () => {
  beforeEach(() => {
    setupAgentProfilesIntercepts({ namespace: TEST_NAMESPACE, empty: true });
    aiAssetsPage.visit(TEST_NAMESPACE, AGENT_PROFILE_PARAMS);
    aiAssetsPage.switchToAgentProfilesTab();
    cy.wait('@listAgentProfiles');
  });

  it(
    'should display the empty state when no profiles exist',
    { tags: ['@GenAI', '@AgentProfiles', '@AIAssets'] },
    () => {
      cy.step('Verify empty state is shown');
      cy.findByTestId('empty-state').should('be.visible');
      cy.findByText('No agent profiles').should('be.visible');
    },
  );
});
