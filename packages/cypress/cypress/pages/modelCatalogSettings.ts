import { appChrome } from './appChrome';

class ModelCatalogSettings {
  visit(wait = true) {
    cy.visitWithLogin('/settings/model-resources-operations/model-catalog');
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
    cy.findByTestId('app-page-title').contains('AI catalog settings');
  }

  findNavItem() {
    return appChrome.findNavItem({
      name: 'AI catalog settings',
      rootSection: 'Settings',
      subSection: 'Model resources and operations',
    });
  }

  findEmptyState() {
    return cy.findByTestId('mc-settings-empty-state');
  }

  findAddSourceButton() {
    return cy.findByTestId('add-source-button');
  }
}

export const modelCatalogSettings = new ModelCatalogSettings();
