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

  const namespace = Cypress.env('AGENT_OPS_NAMESPACE') as string;
  const filterTest = namespace ? it : it.skip;

  filterTest(
    'should display table toolbar and support filter interactions when a project is selected',
    { tags: ['@Dashboard', '@AgentOps', '@Featureflagged'] },
    () => {
      cy.fixture('e2e/agentOps/agentRuntimes.yaml').then((testData) => {
        cy.step('Visit the agents deployments page for the configured namespace');
        agentRuntimesPage.visit(namespace);

        cy.step('Verify the project selector shows the current namespace');
        agentRuntimesPage.findProjectSelector().should('exist');

        cy.step('Verify the table or no-deployments empty state renders');
        cy.get('body').then(($body) => {
          const hasTable = $body.find('[data-testid="agent-runtimes-table"]').length > 0;

          if (!hasTable) {
            agentRuntimesPage.findNoDeploymentsEmptyState().should('exist');
            return;
          }

          cy.step('Verify the filter toolbar is present');
          agentRuntimesPage.findFilterToolbar().should('exist');

          cy.step('Type a search term in the name filter');
          agentRuntimesPage.findNameFilterInput().type(testData.filterSearchTerm);

          cy.step('Clear the name filter');
          agentRuntimesPage.findNameFilterInput().clear();

          cy.step('Switch the filter dropdown to Status');
          agentRuntimesPage.findFilterDropdownToggle().click();
          agentRuntimesPage.findFilterOption(testData.filterOptionStatus).click();

          cy.step('Select Pending from the status filter');
          agentRuntimesPage.findStatusFilterDropdown().click();
          agentRuntimesPage.findStatusOption(testData.statusPending).click();

          cy.step('Clear all filters');
          agentRuntimesPage.findClearAllFiltersButton().click();

          cy.step('Switch the filter dropdown back to Status and select Ready');
          agentRuntimesPage.findFilterDropdownToggle().click();
          agentRuntimesPage.findFilterOption(testData.filterOptionStatus).click();
          agentRuntimesPage.findStatusFilterDropdown().click();
          agentRuntimesPage.findStatusOption(testData.statusReady).click();

          cy.step('Clear all filters again');
          agentRuntimesPage.findClearAllFiltersButton().click();
        });
      });
    },
  );
});
