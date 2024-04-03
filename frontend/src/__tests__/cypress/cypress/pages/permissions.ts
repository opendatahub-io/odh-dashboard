import { Contextual } from './components/Contextual';
import { TableRow } from './components/table';

class PermissionsTableRow extends TableRow {}

class PermissionsTab {
  visit(projectName: string) {
    cy.visit(`/projects/${projectName}?section=permissions`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  findAddUserButton() {
    return cy.findByTestId('add-button User');
  }

  findAddGroupButton() {
    return cy.findByTestId('add-button Group');
  }

  getUserTable() {
    return new PermissionTable(() => cy.findByTestId('project-sharing-table User'));
  }

  getGroupTable() {
    return new PermissionTable(() => cy.findByTestId('project-sharing-table Group'));
  }
}

class PermissionTable extends Contextual<HTMLElement> {
  findRows() {
    return this.find().find(`[data-label=Username]`);
  }

  findAddInput() {
    return this.find().findByTestId('project-sharing-name-input');
  }

  findEditInput(id: string) {
    return this.find().findByTestId(['project-sharing-name-input', id]);
  }

  getTableRow(name: string) {
    return new PermissionsTableRow(() =>
      this.find().find(`[data-label=Username]`).contains(name).parents('tr'),
    );
  }

  findTableHeaderButton(name: string) {
    return this.find().find('thead').findByRole('button', { name });
  }

  selectPermission(id: string, name: string) {
    return this.find()
      .findByTestId(['project-sharing-name-input', id])
      .parents('tr')
      .findByRole('button', { name: 'Options menu' })
      .findSelectOption(name)
      .click();
  }

  findSaveNewButton() {
    return this.find().findByTestId(['save-new-button']);
  }

  findEditSaveButton(id: string) {
    return this.find().findByTestId(['save-button', id]);
  }
}

export const permissions = new PermissionsTab();
