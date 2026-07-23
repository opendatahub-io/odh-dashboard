import { appChrome } from './appChrome';

class AgentRuntimesPage {
  navigate(): void {
    appChrome.findNavItem({ name: 'Agents', rootSection: 'AI hub' }).click();
    this.wait();
  }

  visit(namespace?: string): void {
    const basePath = namespace
      ? `/ai-hub/agents/deployments/${namespace}`
      : '/ai-hub/agents/deployments';
    cy.visitWithLogin(`${basePath}?devFeatureFlags=agentOps=true`);
    this.wait();
  }

  private wait(): void {
    this.findPageTitle().should('exist');
    cy.testA11y();
  }

  findNavItem(): Cypress.Chainable<JQuery<HTMLElement>> {
    return appChrome.findNavItem({ name: 'Agents', rootSection: 'AI hub' });
  }

  findPageTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('app-tab-page-title');
  }

  findDeploymentsTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('tab', { name: 'Deployments' });
  }

  findProjectSelector(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-ops-project-selector');
  }

  findProjectSelectorToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('project-selector-toggle');
  }

  findProjectSelectorMenu(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('project-selector-menu');
  }

  findSelectProjectEmptyState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-deployments-select-project');
  }

  findAccessDeniedState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-deployments-access-denied');
  }

  findTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-runtimes-table');
  }

  findFilterToolbar(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-runtimes-table-toolbar');
  }

  findFilterDropdownToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('filter-toolbar-dropdown');
  }

  findFilterOption(option: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`filter-toolbar-option-${option}`);
  }

  findNameFilterInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-runtimes-filter-input');
  }

  findStatusFilterDropdown(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-runtimes-filter-status');
  }

  findStatusOption(status: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(status);
  }

  findClearAllFiltersButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('button', { name: 'Clear all filters' });
  }

  findNameFilterChip(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('name-filter-chip');
  }

  findStatusFilterChip(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('status-filter-chip');
  }

  findTableRow(namespace: string, name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`agent-runtime-row-${namespace}-${name}`);
  }

  findKebabActions(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-runtime-actions');
  }

  findModalSubmitButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('modal-submit-button');
  }

  findEmptyTableState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('dashboard-empty-table-state');
  }

  findNoDeploymentsEmptyState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-deployments-empty-state');
  }

  hasDeploymentsTable(): Cypress.Chainable<boolean> {
    // Retries against the DOM until either the table or the empty state has rendered,
    // so this can't resolve while the runtimes fetch is still in flight.
    return cy
      .get('[data-testid="agent-runtimes-table"], [data-testid="agent-deployments-empty-state"]', {
        timeout: 10000,
      })
      .then(($el) => $el.is('[data-testid="agent-runtimes-table"]'));
  }
}

export const agentRuntimesPage = new AgentRuntimesPage();
