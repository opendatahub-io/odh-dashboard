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
    return cy.findByTestId('dashboard-empty-table-state');
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

  findCompareButton() {
    return cy.findByTestId('compare-evaluations-button');
  }

  // PF v6 Checkbox spreads extra props onto <input>, so data-testid is on the <input> directly.
  findEvaluationCheckbox(rowIndex: number) {
    return cy.findByTestId(`evaluation-select-checkbox-${rowIndex}`);
  }

  findStatusCell(rowIndex: number) {
    return this.findEvaluationRow(rowIndex).findByTestId('evaluation-status');
  }

  findStatusLabel(rowIndex: number) {
    return this.findStatusCell(rowIndex).findByTestId('evaluation-status-button');
  }

  clickStatusBadge(rowIndex: number) {
    this.findStatusCell(rowIndex).findByTestId('evaluation-status-button').click();
  }

  findStatusModal() {
    return cy.findByTestId('evaluation-status-modal');
  }

  findStatusModalBadge(state: string) {
    return this.findStatusModal().findByTestId(`status-label-${state}`);
  }

  findStatusDetailHeader() {
    return cy.findByTestId('status-detail-header');
  }

  findBenchmarkWarning(benchmarkId: string) {
    return cy.findByTestId(`benchmark-warning-${benchmarkId}`);
  }
}

export const evaluationsPage = new EvaluationsPage();
