class EvaluationsPage {
  visit(namespace: string) {
    cy.visit(`/evaluation/${namespace}`);
    this.waitForLoad();
  }

  visitInvalidProject(namespace: string) {
    cy.visit(`/evaluation/${namespace}`);
    this.waitForLoad();
  }

  visitNoProjects() {
    cy.visit('/evaluation/any');
    this.waitForLoad();
  }

  visitRoot() {
    cy.visit('/evaluation');
  }

  private waitForLoad() {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findTitle() {
    return cy.findByTestId('app-page-title');
  }

  findEmptyState() {
    return cy.findByTestId('eval-hub-empty-state');
  }

  findEmptyStateBody() {
    return cy.findByTestId('eval-hub-empty-state-body');
  }

  findCreateEvaluationButton() {
    return cy.findByTestId('create-evaluation-button');
  }

  findEvaluationsTable() {
    return cy.findByTestId('evaluations-table');
  }

  findEvaluationsTableToolbar() {
    return cy.findByTestId('evaluations-table-toolbar');
  }

  findFilterTypeToggle() {
    return cy.findByTestId('filter-type-toggle');
  }

  findFilterTextField() {
    return cy.findByTestId('filter-toolbar-text-field');
  }

  findUnavailableEmptyState() {
    return cy.findByTestId('evalhub-unavailable-empty-state');
  }

  findEmptyFilterState() {
    return cy.findByTestId('evaluations-empty-filter-state');
  }

  findClearFiltersButton() {
    return cy.findByTestId('clear-filters-button');
  }

  findProjectSelector() {
    return cy.findByTestId('eval-hub-project-selector');
  }

  findNoProjectsState() {
    return cy.findByTestId('eval-hub-no-projects');
  }

  findInvalidProjectState() {
    return cy.findByTestId('eval-hub-invalid-project');
  }

  findEvaluationRow(rowIndex: number) {
    return cy.findByTestId(`evaluation-row-${rowIndex}`);
  }

  findEvaluationLink(rowIndex: number) {
    return cy.findByTestId(`evaluation-link-${rowIndex}`);
  }
}

export const evaluationsPage = new EvaluationsPage();
