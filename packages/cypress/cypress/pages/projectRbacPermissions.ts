import { Contextual } from './components/Contextual';
import { TableRow } from './components/table';
import { projectDetails } from './projects';

class SubjectRolesTable extends Contextual<HTMLElement> {
  findNameCell(name: string) {
    return this.find().find('[data-label="Name"]').contains(name).closest('td');
  }

  getRowByName(name: string) {
    return new TableRow(() => this.findNameCell(name).parents('tr'));
  }

  findRoleCellButtons() {
    return this.find().findAllByTestId('role-link');
  }

  findRoleLink(name: string) {
    return this.find().findByRole('button', { name });
  }

  findRoleLinkInRow(rowName: string, roleName: string) {
    return this.getRowByName(rowName).find().findByRole('button', { name: roleName });
  }

  getRowByRoleLink(roleName: string) {
    return new TableRow(() => this.findRoleLink(roleName).parents('tr'));
  }

  findManageRolesAction(rowName: string) {
    return this.getRowByName(rowName).findKebabAction('Manage roles');
  }

  findTableHeaderButton(name: string | RegExp) {
    return this.find().find('thead').findByRole('button', { name });
  }

  clickColumnSort(name: string | RegExp) {
    return this.findTableHeaderButton(name).click();
  }
}

class RoleDetailsModal extends Contextual<HTMLElement> {
  findAssigneesTab() {
    return this.find().findByRole('tab', { name: /Assignees/i });
  }

  clickAssigneesTab() {
    return this.findAssigneesTab().click();
  }

  getRulesTable() {
    return new RoleRulesTable(() => this.find().findByTestId('role-rules-table'));
  }

  getAssigneesTable() {
    // Table content may be rendered outside the modal subtree by PF Tabs internals.
    // Keep this query global for stability.
    return new RoleAssigneesTable(() => cy.findByTestId('role-assignees-table'));
  }
}

class RoleRulesTable extends Contextual<HTMLElement> {
  findHeaderSortButton(name: string | RegExp) {
    return this.find().find('thead').findByRole('button', { name });
  }

  clickHeaderSort(name: string | RegExp) {
    return this.findHeaderSortButton(name).click();
  }

  findFirstBodyRow() {
    return this.find().find('tbody tr').first();
  }
}
class RoleAssigneesTable extends Contextual<HTMLElement> {
  findHeaderSortButton(name: string | RegExp) {
    return this.find().find('thead').findByRole('button', { name });
  }

  clickHeaderSort(name: string | RegExp) {
    return this.findHeaderSortButton(name).click();
  }

  findFirstBodyRow() {
    return this.find().find('tbody tr').first();
  }
}

class ProjectRbacPermissionsTab {
  visit(projectName: string) {
    projectDetails.visitSection(projectName, 'permissions');
  }

  findAssignRolesButton() {
    return cy.findByTestId('permissions-assign-roles-button');
  }

  findAssignRolesPage() {
    return cy.findByTestId('project-permissions-assign-roles-page');
  }

  findAssignRolesSubjectReadonly() {
    return cy.findByTestId('assign-roles-subject-readonly');
  }

  findAssignRolesSubjectTypeahead() {
    return cy.findByTestId('assign-roles-subject-typeahead-toggle');
  }

  findAssignRolesSubjectClearButton() {
    return this.findAssignRolesSubjectTypeahead().find('button[aria-label="Clear input value"]');
  }

  findAssignRolesSubjectKindRadio(kind: 'user' | 'group') {
    return cy.findByTestId(`assign-roles-subject-kind-${kind}`);
  }

  findAssignRolesSaveButton() {
    return cy.findByTestId('assign-roles-save');
  }

  findAssignRolesBreadcrumbProjects() {
    return cy.findByTestId('assign-roles-breadcrumb-projects');
  }

  findAssignRolesBreadcrumbProject() {
    return cy.findByTestId('assign-roles-breadcrumb-project');
  }

  findUsersTable() {
    return this.getUsersTable().find();
  }

  findGroupsTable() {
    return this.getGroupsTable().find();
  }

  findEmptyTableState() {
    return cy.findByTestId('dashboard-empty-table-state');
  }

  findSubjectScopeDropdown() {
    return cy.findByTestId('permissions-subject-scope-dropdown-toggle');
  }

  selectSubjectScope(scopeKey: 'all' | 'user' | 'group') {
    this.findSubjectScopeDropdown().click();
    // SimpleSelect uses the option key as data-testid by default
    return cy.findByTestId(scopeKey).click();
  }

  findFilterTypeDropdown() {
    return cy.findByTestId('permissions-filter-toolbar-dropdown');
  }

  selectFilterType(label: 'Name' | 'Role') {
    this.findFilterTypeDropdown().click();
    return cy.findByRole('menuitem', { name: label }).click();
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

  // For PatternFly typeahead, options are rendered in a popper and not in the table DOM subtree.
  // Keep this as a simple global query by role (more consistent than wiring ids into the component).
  findTypeaheadOption(optionLabel: string | RegExp) {
    return cy.findByRole('option', { name: optionLabel, hidden: true });
  }

  findTypeaheadOptions(optionLabel: string | RegExp) {
    return cy.findAllByRole('option', { name: optionLabel, hidden: true });
  }

  findEditRowRoleSelectToggle(subjectKind: 'user' | 'group') {
    return cy.findByTestId(`permissions-edit-${subjectKind}-role-select-toggle`);
  }

  selectEditRowRole(subjectKind: 'user' | 'group', roleRefKey: string) {
    this.findEditRowRoleSelectToggle(subjectKind).click();
    return cy.findByTestId(roleRefKey).should('not.be.disabled').find('button').click();
  }

  findEditRowSaveButton(subjectKind: 'user' | 'group') {
    return cy.findByTestId(`permissions-edit-${subjectKind}-save`);
  }

  findEditRowCancelButton(subjectKind: 'user' | 'group') {
    return cy.findByTestId(`permissions-edit-${subjectKind}-cancel`);
  }

  getUsersTable() {
    return new SubjectRolesTable(() => cy.findByTestId('permissions-user-roles-table'));
  }

  getGroupsTable() {
    return new SubjectRolesTable(() => cy.findByTestId('permissions-group-roles-table'));
  }

  getRoleDetailsModal() {
    return new RoleDetailsModal(() => cy.findByTestId('role-details-modal'));
  }

  getDiscardChangesModal() {
    return new DiscardChangesModal(() => cy.findByTestId('discard-changes-modal'));
  }

  getNavigationBlockerModal() {
    return new NavigationBlockerModal(() => cy.findByTestId('navigation-blocker-modal'));
  }

  getManageRolesTable() {
    return new ManageRolesTable(() => cy.findByTestId('manage-roles-table'));
  }

  getRoleAssignmentChangesModal() {
    return new RoleAssignmentChangesModal(() => cy.findByTestId('assign-roles-confirm-modal'));
  }
}

class DiscardChangesModal extends Contextual<HTMLElement> {
  findDiscardButton() {
    return this.find().findByTestId('discard-changes-confirm');
  }

  findCancelButton() {
    return this.find().findByTestId('discard-changes-cancel');
  }

  shouldContainMessage(text: string | RegExp) {
    return this.find().contains(text);
  }
}

class NavigationBlockerModal extends Contextual<HTMLElement> {
  findDiscardButton() {
    return this.find().findByTestId('confirm-discard-changes');
  }

  findCancelButton() {
    return this.find().findByTestId('cancel-discard-changes');
  }
}

class ManageRolesTable extends Contextual<HTMLElement> {
  findRoleRow(roleName: string) {
    return this.find().find('[data-label="Role"]').contains(roleName).closest('tr');
  }

  findRoleCheckbox(roleName: string) {
    return this.findRoleRow(roleName).find('input[type="checkbox"]');
  }

  toggleRole(roleName: string) {
    return this.findRoleCheckbox(roleName).click();
  }
}

class RoleAssignmentChangesModal extends Contextual<HTMLElement> {
  findSaveButton() {
    return this.find().findByTestId('assign-roles-confirm-save');
  }

  findCancelButton() {
    return this.find().findByTestId('assign-roles-confirm-cancel');
  }

  findCustomRoleWarning() {
    return this.find().findByTestId('assign-roles-confirm-custom-role-warning');
  }

  findError() {
    return this.find().findByTestId('assign-roles-confirm-error');
  }

  findAssigningSection() {
    return this.find().findByTestId('assign-roles-confirm-assigning-section');
  }

  findUnassigningSection() {
    return this.find().findByTestId('assign-roles-confirm-unassigning-section');
  }
}

export const projectRbacPermissions = new ProjectRbacPermissionsTab();
