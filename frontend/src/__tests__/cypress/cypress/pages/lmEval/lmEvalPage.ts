class LMEvalPage {
  visit(projectName?: string, wait = true) {
    if (projectName) {
      cy.visitWithLogin(`/modelEvaluations/${projectName}`);
    } else {
      cy.visitWithLogin('/modelEvaluations');
    }
    if (wait) {
      this.wait();
    }
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  private wait() {
    this.findPageTitle().should('exist');
    this.findPageTitle().should('contain.text', 'Model evaluation runs');
    cy.testA11y();
  }

  findEmptyStateTitle() {
    return cy.findByTestId('empty-state-title');
  }

  findEmptyStateBody() {
    return cy.findByTestId('empty-state-body');
  }

  findEvaluateModelButton() {
    return cy.findByTestId('evaluate-model-button');
  }

  filterByName(name: string) {
    cy.findByRole('textbox', { name: 'Filter by name' }).type(name);
  }

  findCreateProjectButton() {
    return cy.findByTestId('create-data-science-project');
  }

  findProjectSelector() {
    return cy.findByTestId('project-selector-toggle');
  }

  findLMEvaluationForm() {
    return cy.findByTestId('lmEvaluationForm');
  }

  selectProjectByName(name: string) {
    this.findProjectSelector().click();
    cy.findByTestId('project-selector-search').type(name);
    cy.findByTestId('project-selector-menuList')
      .contains('button', name)
      .should('be.visible')
      .click();
  }

  selectAllProjects() {
    this.findProjectSelector().click();
    this.findProjectSelectorMenuList().should('be.visible');
    this.findAllProjectsOption().should('be.visible').click();
    this.findProjectSelector().should('contain.text', 'All projects');
  }

  findBreadcrumb() {
    return cy.findByRole('navigation', { name: 'Breadcrumb' });
  }

  findBreadcrumbItem(name: string) {
    return this.findBreadcrumb().findByText(name);
  }

  // Evaluation run finder methods
  findEvaluationTable() {
    return cy.get('table');
  }

  findEvaluationRow(evaluationName: string, timeout?: number) {
    const getOptions = timeout ? { timeout } : {};
    return cy
      .get('tr', getOptions)
      .contains(evaluationName, getOptions)
      .parents('tr', getOptions)
      .first(getOptions);
  }

  findEvaluationDataLabel(dataLabel: string) {
    return cy.get(`[data-label="${dataLabel}"]`);
  }

  findEvaluationRunStatus() {
    return cy.get('[data-testid="evaluation-run-status"]');
  }

  findEvaluationRunStartTime() {
    return cy.get('[data-testid="evaluation-run-start-time"]');
  }

  findEvaluationRunActionsMenu() {
    return cy.get('button[aria-label="Kebab toggle"]');
  }

  findProjectSelectorMenuList() {
    return cy.findByTestId('project-selector-menuList');
  }

  findAllProjectsOption() {
    return this.findProjectSelectorMenuList().find('button').contains('All projects');
  }

  findEvaluationRunLink(evaluationName: string) {
    return cy.get(`[data-testid="lm-eval-link-${evaluationName}"]`);
  }

  findDownloadJsonButton() {
    return cy.get('button').contains('Download JSON');
  }

  findEvaluationDetailsTitle() {
    return cy.get('h1');
  }

  findEvaluationTableRows() {
    return cy.get('[data-label="Evaluation"]');
  }
}

export const lmEvalPage = new LMEvalPage();
