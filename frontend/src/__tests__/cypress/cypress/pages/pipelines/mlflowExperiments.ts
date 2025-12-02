class MLflowExperimentsPage {
  visit() {
    cy.visitWithLogin('/develop-train/experiments-mlflow');
    this.wait();
  }

  private wait() {
    cy.findByTestId('mlflow-iframe');
    cy.testA11y();
  }

  findMlflowIframe() {
    return cy.findByTestId('mlflow-iframe');
  }
}

export const mlflowExperimentsPage = new MLflowExperimentsPage();
