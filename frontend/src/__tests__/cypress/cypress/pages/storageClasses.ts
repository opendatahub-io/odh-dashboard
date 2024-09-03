import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';

class StorageClassesPage {
  visit() {
    cy.visitWithLogin('/storageClasses');
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').contains('Storage classes');
    cy.testA11y();
  }

  findNavItem() {
    return appChrome.findNavItem('Storage classes', 'Settings');
  }

  findEmptyState() {
    return cy.findByTestId('storage-classes-empty-state');
  }
}

export const storageClassesPage = new StorageClassesPage();
