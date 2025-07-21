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

  findBreadcrumbModelEvaluationRuns() {
    return cy.findByTestId('breadcrumb-model-evaluation-runs');
  }

  findBreadcrumbStartEvaluationRun() {
    return cy.findByTestId('breadcrumb-start-evaluation-run');
  }

  // Evaluation run verification methods
  shouldHaveEvaluationRunInTable(evaluationName: string) {
    // Search specifically within the table using the data-label attribute
    // Wait for the table to be visible first
    cy.get('table').should('be.visible');

    // Use a more specific selector that finds the exact row containing the evaluation name
    cy.get('tr').contains(evaluationName).should('be.visible');

    // Also verify the specific data-label element contains the text
    cy.get('[data-label="Evaluation"]').should('contain.text', evaluationName);
    return this;
  }

  shouldHaveModelNameInTable(modelName: string) {
    // Search specifically within the table using the data-label attribute
    cy.get('[data-label="Model"]').should('contain.text', modelName);
    return this;
  }

  shouldHaveEvaluationRunStatus() {
    cy.get('[data-testid="evaluation-run-status"]').should('exist');
    return this;
  }

  shouldHaveEvaluationRunStartTime() {
    cy.get('body').should('contain.text', 'Started');
    return this;
  }

  shouldHaveEvaluationRunActionsMenu() {
    // Look for the kebab menu button (three dots menu) in the table row
    cy.get('button[aria-label="Kebab toggle"]').should('exist');
    return this;
  }

  findProjectSelectorMenuList() {
    return cy.findByTestId('project-selector-menuList');
  }

  findAllProjectsOption() {
    return this.findProjectSelectorMenuList().find('button').contains('All projects');
  }

  // New methods for evaluation details page interactions
  findEvaluationRunStatus(timeout?: number) {
    return cy.get('[data-testid="evaluation-run-status"]', { timeout });
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

  findEvaluationTable() {
    return cy.get('table');
  }

  findEvaluationTableRows() {
    return cy.get('[data-label="Evaluation"]');
  }

  // Method to verify evaluation details page
  verifyEvaluationDetailsPage(evaluationName: string, projectName: string) {
    cy.url().should('include', `/modelEvaluations/${projectName}/${evaluationName}`);
    this.findEvaluationDetailsTitle().should('contain.text', evaluationName);
    this.findDownloadJsonButton().should('be.visible').and('not.be.disabled');
    return this;
  }

  // Method to download JSON results
  downloadJsonResults() {
    this.findDownloadJsonButton().click();
    return this;
  }
}

export const lmEvalPage = new LMEvalPage();
