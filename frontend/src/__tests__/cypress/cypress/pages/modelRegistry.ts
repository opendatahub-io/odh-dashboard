import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';

class ModelRegistry {
  landingPage() {
    cy.visit('/');
    this.waitLanding();
  }

  visit(modelRegistry?: string) {
    cy.visit(`/modelRegistry${modelRegistry}`);
    this.wait();
  }

  navigate() {
    appChrome.findNavItem('Model Registry').click();
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').contains('Model Registry');
    cy.testA11y();
  }

  private waitLanding() {
    cy.findByTestId('enabled-application').should('be.visible');
  }

  shouldBeEmpty() {
    cy.findByTestId('empty-state-title').should('exist');
    return this;
  }

  tabEnabled() {
    appChrome.findNavItem('Model Registry').should('exist');
    return this;
  }

  tabDisabled() {
    appChrome.findNavItem('Model Registry').should('not.exist');
    return this;
  }
}

export const modelRegistry = new ModelRegistry();
