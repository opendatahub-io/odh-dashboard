import { Contextual } from './components/Contextual';
import { projectDetails } from './projects';

class SubjectRolesTable extends Contextual<HTMLElement> {
  findNameCell(name: string) {
    return this.find().find('[data-label="Name"]').contains(name).closest('td');
  }

  findRoleCellButtons() {
    return this.find().findAllByTestId('role-link');
  }

  findRoleLink(name: string) {
    return this.find().findByRole('button', { name });
  }
}

class ProjectRbacPermissionsTab {
  visit(projectName: string) {
    projectDetails.visitSection(projectName, 'permissions');
  }

  findSubjectScopeDropdown() {
    return cy.findByTestId('permissions-subject-scope-dropdown-toggle');
  }

  selectSubjectScope(scopeKey: 'all' | 'user' | 'group') {
    this.findSubjectScopeDropdown().click();
    // SimpleSelect uses the option key as data-testid by default
    return cy.document().findByTestId(scopeKey).click();
  }

  findFilterTypeDropdown() {
    return cy.findByTestId('permissions-filter-toolbar-dropdown');
  }

  selectFilterType(label: 'Name' | 'Role') {
    this.findFilterTypeDropdown().click();
    return cy.document().findByRole('menuitem', { name: label }).click();
  }

  findNameFilterInput() {
    return cy.findByTestId('permissions-filter-name-input');
  }

  findRoleFilterInput() {
    return cy.findByTestId('permissions-filter-role-input');
  }

  findClearAllFiltersButton() {
    return cy.findByTestId('clear-filters-button');
  }

  findAddUserButton() {
    return cy.findByTestId('add-user-button');
  }

  findAddGroupButton() {
    return cy.findByTestId('add-group-button');
  }

  getUsersTable() {
    return new SubjectRolesTable(() => cy.findByTestId('permissions-user-roles-table'));
  }

  getGroupsTable() {
    return new SubjectRolesTable(() => cy.findByTestId('permissions-group-roles-table'));
  }
}

export const projectRbacPermissions = new ProjectRbacPermissionsTab();
