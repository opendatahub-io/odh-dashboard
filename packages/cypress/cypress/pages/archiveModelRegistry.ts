import { TableRow } from './components/table';

class ArchiveModelRegistryTableRow extends TableRow {
  findName() {
    return this.find().findByTestId('model-name');
  }
}

class ArchiveModelRegistry {
  visit() {
    const preferredModelRegistry = 'modelregistry-sample';
    cy.visitWithLogin(`/ai-hub/registry/${preferredModelRegistry}/registered-models/archive`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    cy.findByTestId('app-page-title').contains('Archived models');
    cy.testA11y();
  }

  findTable() {
    return cy.findByTestId('registered-models-archive-table');
  }

  getRow(name: string) {
    return new ArchiveModelRegistryTableRow(() =>
      this.findTable().find(`[data-label="Model name"]`).contains(name).parents('tr'),
    );
  }
}

export const archiveModelRegistry = new ArchiveModelRegistry();
