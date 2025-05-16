import { Contextual } from './components/Contextual';
import { TableRow } from './components/table';
import { DeleteModal } from './components/DeleteModal';

class PermissionsTableRow extends TableRow {}

class PermissionsTab {
  visit(projectName: string) {
    cy.visitWithLogin(`/projects/${projectName}?section=permissions`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  findAddUserButton() {
    return cy.findByTestId('add-button user');
  }

  findAddGroupButton() {
    return cy.findByTestId('add-button group');
  }

  getUserTable() {
    return new PermissionTable(() => cy.findByTestId('role-binding-table User'));
  }

  getGroupTable() {
    return new PermissionTable(() => cy.findByTestId('role-binding-table Group'));
  }
}

class RoleBindingPermissionsChangeModal extends DeleteModal {
  findPermissionsChangeModal() {
    return cy.findByTestId('delete-modal');
  }

  findModalCancelButton() {
    return cy.get('button').contains('Cancel');
  }

  findModalInput() {
    return cy.findByTestId('delete-modal-input');
  }

  findModalConfirmButton(action: string) {
    return cy.get('button').contains(action);
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
      .findByTestId(['role-binding-name-input', id])
      .parents('tr')
      .findByRole('button', { name: 'Options menu' })
      .findSelectOption(name)
      .click();
  }

  addGroupName(name: string) {
    const userNameCell = permissions.getGroupTable().find().find('[data-label="Username"]');
    userNameCell.findByRole('button', { name: 'Typeahead menu toggle' }).should('exist').click();
    userNameCell.children().first().type(`${name}`);
    //have to do this at top level `cy` because it goes to top of dom
    cy.findByRole('option', { name: `Select "${name}"` }).click();
  }

  selectAdminOption() {
    permissions
      .getGroupTable()
      .find()
      .find('[data-label="Permission"]')
      .children()
      .first()
      .findSelectOption('Admin Edit the project and manage user access')
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
export const roleBindingPermissionsChangeModal = new RoleBindingPermissionsChangeModal();
