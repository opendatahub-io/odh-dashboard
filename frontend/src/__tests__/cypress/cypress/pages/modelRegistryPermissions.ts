import { Contextual } from './components/Contextual';
import { TableRow } from './components/table';

class PermissionsTableRow extends TableRow {}

class UsersTab {
  visit(mrName: string, wait = true) {
    cy.visitWithLogin(`/modelRegistrySettings/permissions/${mrName}`);
    if (wait) {
      this.wait();
    }
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
    return new PermissionTable(() => cy.findByTestId('role-binding-table User'));
  }

  getGroupTable() {
    return new PermissionTable(() => cy.findByTestId('role-binding-table Group'));
  }
}

class PermissionTable extends Contextual<HTMLElement> {
  findRows() {
    return this.find().find(`[data-label=Username]`);
  }

  findAddInput() {
    return this.find().findByTestId('role-binding-name-input');
  }

  findEditInput(id: string) {
    return this.find().findByTestId(['role-binding-name-input', id]);
  }

  findGroupSelect() {
    return this.find().get(`[aria-label="Type to filter"]`);
  }

  getTableRow(name: string) {
    return new PermissionsTableRow(() =>
      this.find().find(`[data-label=Username]`).contains(name).parents('tr'),
    );
  }

  findTableHeaderButton(name: string) {
    return this.find().find('thead').findByRole('button', { name });
  }

  findSaveNewButton() {
    return this.find().findByTestId(['save-new-button']);
  }

  findEditSaveButton(id: string) {
    return this.find().findByTestId(['save-button', id]);
  }
}

export const usersTab = new UsersTab();
