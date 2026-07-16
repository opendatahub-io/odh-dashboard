import { TableRow } from '~/__tests__/cypress/cypress/pages/components/table';

class AgentDeploymentTableRow extends TableRow {
  findName(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('agent-runtime-name');
  }

  findNamespace(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('agent-runtime-namespace');
  }

  findStatusLabel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('agent-runtime-status-label');
  }

  findEndpointViewButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('agent-runtime-endpoint-view');
  }

  findViewDetailsAction(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findKebabAction('View details');
  }

  findRestartAction(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findKebabAction('Restart');
  }

  findStopAction(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findKebabAction('Stop');
  }

  findDeleteAction(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findKebabAction('Delete');
  }
}

class AgentDeploymentsPage {
  visit(namespace?: string) {
    const url = namespace ? `/deployments/${namespace}` : '/deployments';
    cy.visit(url);
    this.wait();
  }

  private wait() {
    cy.findByTestId('agent-ops-project-selector').should('exist');
    cy.testA11y();
  }

  findTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-runtimes-table');
  }

  findEmptyState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-deployments-empty-state');
  }

  findSelectProjectState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-deployments-select-project');
  }

  findFilterInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-runtimes-filter-input');
  }

  findFilterDropdownToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('filter-toolbar-dropdown');
  }

  selectFilterOption(option: 'name' | 'project' | 'status') {
    this.findFilterDropdownToggle().click();
    cy.findByTestId(`filter-toolbar-option-${option}`).click();
  }

  findProjectFilterInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-runtimes-filter-project-input');
  }

  selectStatusFilter(status: 'Ready' | 'Pending' | 'Failed') {
    this.selectFilterOption('status');
    cy.findByTestId('agent-runtimes-filter-status').click();
    cy.findByTestId(status).click();
  }

  findActiveFilterChips(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-testid$="-filter-chip"]');
  }

  findStatusFilterChip(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('status-filter-chip');
  }

  expectSingleStatusFilterChip(label: string) {
    this.findActiveFilterChips().should('have.length', 1);
    this.findStatusFilterChip().should('contain.text', label);
  }

  findLoadingSpinner(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByLabelText('Loading agent deployments');
  }

  findErrorAlert(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('error-empty-state-body');
  }

  findTableRows(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findTable().findAllByTestId(/^agent-runtime-row-/);
  }

  getRow(namespace: string, name: string): AgentDeploymentTableRow {
    return new AgentDeploymentTableRow(() =>
      this.findTable()
        .findByTestId(`agent-runtime-row-${namespace}-${name}`)
        .closest('tr')
        .should('exist'),
    );
  }

  findEndpointsModal(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('agent-runtime-endpoints-modal');
  }

  findEndpointsEmptyState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findEndpointsModal().findByTestId('agent-runtime-endpoints-empty');
  }

  findEndpointField(fieldId: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findEndpointsModal()
      .findByTestId(`agent-runtime-endpoint-${fieldId}`)
      .find('input[readonly]');
  }
}

export const agentDeploymentsPage = new AgentDeploymentsPage();
