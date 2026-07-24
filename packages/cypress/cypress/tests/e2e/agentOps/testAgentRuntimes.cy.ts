import * as yaml from 'js-yaml';
import { LDAP_ADMIN_USER } from '../../../utils/e2eUsers';
import { agentRuntimesPage } from '../../../pages/agentRuntimes';
import { retryableBefore } from '../../../utils/retryableHooks';
import { verifyOpenShiftProjectExists } from '../../../utils/oc_commands/project';
import type { AgentRuntimesTestData } from '../../../types';

describe('Agent Runtimes list page', () => {
  let testData: AgentRuntimesTestData;
  let skipFilterTest = false;

  retryableBefore(() => {
    cy.fixture('e2e/agentOps/agentRuntimes.yaml', 'utf8').then((yamlContent: string) => {
      testData = yaml.load(yamlContent) as AgentRuntimesTestData;

      verifyOpenShiftProjectExists(testData.projectResourceName).then((exists) => {
        if (!exists) {
          cy.log(
            `Project '${testData.projectResourceName}' not found; skipping namespace-scoped filter test.`,
          );
          skipFilterTest = true;
        }
      });
    });
  });

  it(
    'should display the Agents nav item and load the deployments page when agentOps flag is enabled',
    { tags: ['@Dashboard', '@AgentOps', '@Featureflagged'] },
    () => {
      cy.step('Log into the application with agentOps feature flag enabled');
      cy.visitWithLogin('/?devFeatureFlags=agentOps=true', LDAP_ADMIN_USER);

      cy.step('Verify Agents nav item is visible under AI hub');
      agentRuntimesPage.findNavItem().should('be.visible');

      cy.step('Navigate to the Agents page');
      agentRuntimesPage.findNavItem().click();

      cy.step('Verify the Agents page title is displayed');
      agentRuntimesPage
        .findPageTitle()
        .should('be.visible')
        .and('contain.text', testData.pageTitle);

      cy.step('Verify the project selector is displayed and opens a project list');
      agentRuntimesPage.findProjectSelector().should('exist');
      agentRuntimesPage.findProjectSelectorToggle().click();
      agentRuntimesPage.findProjectSelectorMenu().should('be.visible');
      agentRuntimesPage.findProjectSelectorToggle().click();
    },
  );

  it(
    'should display table toolbar and support filter interactions when a project is selected',
    { tags: ['@Dashboard', '@AgentOps', '@Featureflagged'] },
    function filterInteractionsWhenProjectSelected() {
      if (skipFilterTest) {
        this.skip();
      }

      cy.step('Visit the agents deployments page for the configured namespace');
      agentRuntimesPage.visit(testData.projectResourceName);

      cy.step('Verify the project selector shows the current namespace');
      agentRuntimesPage.findProjectSelector().should('exist');

      cy.step('Verify the table or no-deployments empty state renders');
      agentRuntimesPage.hasDeploymentsTable().then((hasTable) => {
        if (!hasTable) {
          agentRuntimesPage.findNoDeploymentsEmptyState().should('exist');
          return;
        }

        cy.step('Verify the filter toolbar is present');
        agentRuntimesPage.findFilterToolbar().should('exist');

        cy.step('Type a search term in the name filter and verify the filter chip renders it');
        agentRuntimesPage.findNameFilterInput().type(testData.filterSearchTerm);
        agentRuntimesPage.findNameFilterChip().should('contain.text', testData.filterSearchTerm);

        cy.step('Clear the name filter and verify its filter chip is removed');
        agentRuntimesPage.clearNameFilter();
        agentRuntimesPage.findNameFilterChip().should('not.exist');

        cy.step('Switch the filter dropdown to Status');
        agentRuntimesPage.findFilterDropdownToggle().click();
        agentRuntimesPage.findFilterOption(testData.filterOptionStatus).click();

        cy.step('Select Pending from the status filter and verify the filter chip renders it');
        agentRuntimesPage.findStatusFilterDropdown().click();
        agentRuntimesPage.findStatusOption(testData.statusPending).click();
        agentRuntimesPage.findStatusFilterChip().should('contain.text', testData.statusPending);

        cy.step('Clear all filters and verify the status filter chip is removed');
        agentRuntimesPage.findClearAllFiltersButton().click();
        agentRuntimesPage.findStatusFilterChip().should('not.exist');

        cy.step('Switch the filter dropdown back to Status and select Ready');
        agentRuntimesPage.findFilterDropdownToggle().click();
        agentRuntimesPage.findFilterOption(testData.filterOptionStatus).click();
        agentRuntimesPage.findStatusFilterDropdown().click();
        agentRuntimesPage.findStatusOption(testData.statusReady).click();
        agentRuntimesPage.findStatusFilterChip().should('contain.text', testData.statusReady);

        cy.step('Clear all filters again and verify the status filter chip is removed');
        agentRuntimesPage.findClearAllFiltersButton().click();
        agentRuntimesPage.findStatusFilterChip().should('not.exist');
      });
    },
  );
});
