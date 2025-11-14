import { Contextual } from './components/Contextual';
import { TableRow } from './components/table';

class PermissionsTableRow extends TableRow {}

class UsersTab extends Contextual<HTMLElement> {
  findAddUserButton() {
    return this.find().findByTestId('add-button user');
  }

  findAddGroupButton() {
    return this.find().findByTestId('add-button group');
  }

  getUserTable() {
    return new PermissionTable(() => this.find().findByTestId('role-binding-table User'));
  }

  getGroupTable() {
    return new PermissionTable(() => this.find().findByTestId('role-binding-table Group'));
  }
}

class ProjectsTab extends Contextual<HTMLElement> {
  findAddProjectButton() {
    return this.find().findByTestId('add-button project');
  }

  getProjectTable() {
    return new PermissionTable(() => this.find().findByTestId('role-binding-table Group'));
  }
}

class MRPermissions {
  visit(mrName: string, wait = true) {
    cy.visitWithLogin(`/settings/model-resources-operations/model-registry/permissions/${mrName}`);
    if (wait) {
      this.wait();
    }
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  findProjectTab() {
    return cy.findByTestId('projects-tab');
  }

  getUsersContent() {
    return new UsersTab(() => cy.findByTestId('users-tab-content'));
  }

  getProjectsContent() {
    return new ProjectsTab(() => cy.findByTestId('projects-tab-content'));
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

  findNameSelect() {
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

export const modelRegistryPermissions = new MRPermissions();
