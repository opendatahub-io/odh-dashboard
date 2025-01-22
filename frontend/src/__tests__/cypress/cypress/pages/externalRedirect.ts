class ExternalRedirect {
  visit(path: string) {
    cy.visitWithLogin(path);
    this.wait();
  }

  private wait() {
    cy.findByTestId('redirect-error').should('not.exist');
    cy.testA11y();
  }

  findErrorState() {
    return cy.findByTestId('redirect-error');
  }

  findHomeButton() {
    return cy.findByRole('button', { name: 'Go to Home' });
  }
}

class PipelinesSdkRedirect {
  findPipelinesButton() {
    return cy.findByRole('button', { name: 'Go to Pipelines' });
  }

  findExperimentsButton() {
    return cy.findByRole('button', { name: 'Go to Experiments' });
  }
}

export const externalRedirect = new ExternalRedirect();
export const pipelinesSdkRedirect = new PipelinesSdkRedirect();
