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
}

class ProjectRbacPermissionsTab {
  visit(projectName: string) {
    projectDetails.visitSection(projectName, 'permissions');
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

  findAddUserButton() {
    return cy.findByTestId('add-user-button');
  }

  findAddGroupButton() {
    return cy.findByTestId('add-group-button');
  }

  findAddRow(subjectKind: 'user' | 'group') {
    return cy.findByTestId(`permissions-add-${subjectKind}-row`);
  }

  findAddRowSubjectTypeaheadToggle(subjectKind: 'user' | 'group') {
    return cy.findByTestId(`permissions-add-${subjectKind}-subject-typeahead-toggle`);
  }

  findAddRowSubjectInput(subjectKind: 'user' | 'group') {
    return this.findAddRowSubjectTypeaheadToggle(subjectKind).find('input');
  }

  findAddRowRoleSelectToggle(subjectKind: 'user' | 'group') {
    return cy.findByTestId(`permissions-add-${subjectKind}-role-select-toggle`);
  }

  findAddRowSaveButton(subjectKind: 'user' | 'group') {
    return cy.findByTestId(`permissions-add-${subjectKind}-save`);
  }

  findAddRowCancelButton(subjectKind: 'user' | 'group') {
    return cy.findByTestId(`permissions-add-${subjectKind}-cancel`);
  }

  findAddRowSaveError(subjectKind: 'user' | 'group') {
    return cy.findByTestId(`permissions-add-${subjectKind}-save-error`);
  }

  // For PatternFly typeahead, options are rendered in a popper and not in the table DOM subtree.
  // Keep this as a simple global query by role (more consistent than wiring ids into the component).
  findTypeaheadOption(optionLabel: string | RegExp) {
    return cy.findByRole('option', { name: optionLabel, hidden: true });
  }

  findTypeaheadOptions(optionLabel: string | RegExp) {
    return cy.findAllByRole('option', { name: optionLabel, hidden: true });
  }

  selectAddRowSubject(subjectKind: 'user' | 'group', subjectName: string) {
    const name = subjectName.trim();

    // Typing will open the popper menu and filter options.
    this.findAddRowSubjectInput(subjectKind).clear().type(name);

    // Click whichever option (existing or creatable) contains the typed text.
    // Use `contains` to handle text split across nested elements.
    return cy.contains('[role="option"], [role="menuitem"]', name).first().click();
  }

  selectAddRowRole(subjectKind: 'user' | 'group', roleRefKey: string) {
    this.findAddRowRoleSelectToggle(subjectKind).click();
    // SimpleSelect renders a non-clickable list-item wrapper for each option. Click the inner button.
    return cy.findByTestId(roleRefKey).should('not.be.disabled').find('button').click();
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

  findReplaceRoleModal(subjectKind: 'user' | 'group') {
    return cy.findByTestId(`permissions-edit-${subjectKind}-replace-role-modal`);
  }

  findReplaceRoleConfirmButton(subjectKind: 'user' | 'group') {
    return cy.findByTestId(`permissions-edit-${subjectKind}-replace-role-confirm`);
  }

  findReplaceRoleCancelButton(subjectKind: 'user' | 'group') {
    return cy.findByTestId(`permissions-edit-${subjectKind}-replace-role-cancel`);
  }

  getUsersTable() {
    return new SubjectRolesTable(() => cy.findByTestId('permissions-user-roles-table'));
  }

  getGroupsTable() {
    return new SubjectRolesTable(() => cy.findByTestId('permissions-group-roles-table'));
  }
}

export const projectRbacPermissions = new ProjectRbacPermissionsTab();
