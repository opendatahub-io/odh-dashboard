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

  navigateToEvaluationForm(projectName?: string) {
    // Verify we can see the test project in the dropdown
    if (projectName) {
      this.selectProjectByName(projectName);
    }
    this.findEvaluateModelButton().should('exist').click();
    if (projectName) {
      cy.url().should('include', `/modelEvaluations/${projectName}/evaluate`);
    } else {
      cy.url().should('include', '/evaluate');
    }
    this.findLMEvaluationForm().should('exist');
    return this;
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

  switchToAllProjectsView() {
    // Wait for the project selector to be visible and clickable
    this.findProjectSelector().should('be.visible').click();

    // Wait for the dropdown menu to appear
    cy.findByTestId('project-selector-menuList').should('be.visible');

    // Look for the "All projects" option and click it
    cy.get('[data-testid="project-selector-menuList"]')
      .find('button')
      .contains('All projects')
      .should('be.visible')
      .click();

    this.findProjectSelector().should('contain.text', 'All projects');
    return this;
  }

  // Wait for evaluation run to reach a specific status and verify it exists
  waitForEvaluationRun(
    evaluationName: string,
    expectedStatus: string | string[],
    modelName?: string,
    timeout = 60000, // 60 seconds by default
  ) {
    // Wait for the table to be visible and loaded
    cy.get('table').should('be.visible');

    // Wait for the evaluation run to appear in the table first
    // Use a more specific approach to handle multiple entries with same name
    cy.get('tr').contains(evaluationName).should('be.visible');

    // Convert expectedStatus to array for consistent handling
    const expectedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];

    // Poll for status change using Cypress's built-in retry mechanism
    cy.get('body', { timeout }).should(($body: JQuery<HTMLElement>) => {
      // Find all rows containing the evaluation name
      const evaluationRows = $body.find(`tr:contains("${evaluationName}")`);

      // Check if status matches any of the expected statuses
      const statusText = evaluationRows.text();
      const hasExpectedStatus = expectedStatuses.some((status) => statusText.includes(status));

      // Use Cypress assertions instead of throwing errors
      expect(evaluationRows.length).to.be.greaterThan(0);
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(hasExpectedStatus).to.be.true;
    });

    // Verify the evaluation run exists with all required elements
    this.shouldHaveEvaluationRunInTable(evaluationName);
    if (modelName) {
      this.shouldHaveModelNameInTable(modelName);
    }
    this.shouldHaveEvaluationRunStatus();
    this.shouldHaveEvaluationRunStartTime();
    this.shouldHaveEvaluationRunActionsMenu();

    return this;
  }
}

export const lmEvalPage = new LMEvalPage();
