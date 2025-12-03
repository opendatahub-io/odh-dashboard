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
    return cy.findByRole('button', { name: 'Go to Pipeline definitions' });
  }

  findExperimentsButton() {
    return cy.findByRole('button', { name: 'Go to Experiments' });
  }
}

class ElyraRedirect {
  findPipelinesButton() {
    return cy.findByRole('button', { name: 'Go to Pipeline definitions' });
  }
}

class CatalogModelRedirect {
  findModelCatalogButton() {
    return cy.findByRole('button', { name: 'Go to Model Catalog' });
  }
}

export const externalRedirect = new ExternalRedirect();
export const pipelinesSdkRedirect = new PipelinesSdkRedirect();
export const elyraRedirect = new ElyraRedirect();
export const catalogModelRedirect = new CatalogModelRedirect();
