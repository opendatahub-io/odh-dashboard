class NewEvaluationRunPage {
  visit(namespace: string) {
    cy.visit(`/evaluation/${namespace}/create`);
    this.waitForLoad();
  }

  private waitForLoad() {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findTitle() {
    return cy.findByTestId('app-page-title');
  }

  findStandardisedBenchmarksCard() {
    return cy.findByTestId('standardised-benchmarks-card');
  }

  findCollectionsCard() {
    return cy.findByTestId('evaluation-collections-card');
  }
}

export const newEvaluationRunPage = new NewEvaluationRunPage();
