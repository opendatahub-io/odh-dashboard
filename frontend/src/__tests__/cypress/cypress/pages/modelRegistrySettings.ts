import { appChrome } from './appChrome';

class ModelRegistrySettings {
  visit(wait = true) {
    cy.visit('/modelRegistrySettings');
    if (wait) {
      this.wait();
    }
  }

  navigate() {
    this.findNavItem().click();
    this.wait();
  }

  private wait() {
    this.findHeading();
    cy.testA11y();
  }

  private findHeading() {
    cy.findByTestId('app-page-title').should('exist');
    cy.findByTestId('app-page-title').contains('Model Registry Settings');
  }

  findNavItem() {
    return appChrome.findNavItem('Model registry settings', 'Settings');
  }
}

export const modelRegistrySettings = new ModelRegistrySettings();
