import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { agentRuntimesPage } from '../../../pages/agentRuntimes';

describe('Agent Runtimes list page', () => {
  it(
    'should display the Agents nav item and load the deployments page when agentOps flag is enabled',
    { tags: ['@Dashboard', '@AgentOps', '@Featureflagged'] },
    () => {
      cy.step('Log into the application with agentOps feature flag enabled');
      cy.visitWithLogin('/?devFeatureFlags=agentOps=true', HTPASSWD_CLUSTER_ADMIN_USER);

      cy.step('Verify Agents nav item is visible under AI hub');
      agentRuntimesPage.findNavItem().should('be.visible');

      cy.step('Navigate to the Agents page');
      agentRuntimesPage.findNavItem().click();
      cy.url().should('include', '/ai-hub/agents');

      cy.step('Verify the Agents page title is displayed');
      agentRuntimesPage.findPageTitle().should('be.visible').and('contain.text', 'Agents');

      cy.step('Verify the project selector is displayed');
      agentRuntimesPage.findProjectSelector().should('exist');
    },
  );

  it(
    'should display table toolbar and support filter interactions when a project is selected',
    { tags: ['@Dashboard', '@AgentOps', '@Featureflagged'] },
    () => {
      const namespace = Cypress.env('AGENT_OPS_NAMESPACE') as string;

      if (!namespace) {
        cy.log('Skipping: AGENT_OPS_NAMESPACE not set in test-variables.yml');
        return;
      }

      cy.step('Visit the agents deployments page for the configured namespace');
      agentRuntimesPage.visit(namespace);

      cy.step('Verify the project selector shows the current namespace');
      agentRuntimesPage.findProjectSelector().should('exist');

      cy.step('Verify the table or empty state renders');
      agentRuntimesPage.findTable().should('exist');

      cy.step('Verify the filter toolbar is present');
      agentRuntimesPage.findFilterToolbar().should('exist');

      cy.step('Type a search term in the name filter');
      agentRuntimesPage.findNameFilterInput().type('test-agent');

      cy.step('Clear the name filter');
      agentRuntimesPage.findNameFilterInput().clear();

      cy.step('Switch the filter dropdown to Status');
      agentRuntimesPage.findFilterDropdownToggle().click();
      agentRuntimesPage.findFilterOption('status').click();

      cy.step('Select Pending from the status filter');
      agentRuntimesPage.findStatusFilterDropdown().click();
      agentRuntimesPage.findStatusOption('Pending').click();

      cy.step('Clear all filters');
      agentRuntimesPage.findClearAllFiltersButton().click();

      cy.step('Switch the filter dropdown back to Status and select Ready');
      agentRuntimesPage.findFilterDropdownToggle().click();
      agentRuntimesPage.findFilterOption('status').click();
      agentRuntimesPage.findStatusFilterDropdown().click();
      agentRuntimesPage.findStatusOption('Ready').click();

      cy.step('Clear all filters again');
      agentRuntimesPage.findClearAllFiltersButton().click();
    },
  );
});
