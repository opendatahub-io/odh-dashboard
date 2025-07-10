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
}

export const lmEvalPage = new LMEvalPage();
