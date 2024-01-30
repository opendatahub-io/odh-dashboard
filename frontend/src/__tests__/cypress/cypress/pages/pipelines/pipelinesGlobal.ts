import { pipelinesTable } from '~/__tests__/cypress/cypress/pages/pipelines';

class PipelinesGlobal {
  visit(projectName: string) {
    cy.visitWithLogin(`/pipelines/${projectName}`);
    pipelinesTable.find();
  }

  findImportPipelineButton() {
    return cy.findByRole('button', { name: 'Import pipeline' });
  }

  findUploadVersionButton() {
    cy.findByLabelText('Import pipeline and pipeline version button').click();
    return cy.findByRole('menuitem').get('span').contains('Upload new version');
  }

  findProjectSelect() {
    return cy.findByTestId('project-selector-dropdown');
  }

  selectProjectByName(name: string) {
    this.findProjectSelect().findDropdownItem(name).click();
  }
}

export const pipelinesGlobal = new PipelinesGlobal();
