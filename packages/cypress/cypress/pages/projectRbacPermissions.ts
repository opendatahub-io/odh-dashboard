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

  getUsersTable() {
    return new SubjectRolesTable(() => cy.findByTestId('permissions-user-roles-table'));
  }

  getGroupsTable() {
    return new SubjectRolesTable(() => cy.findByTestId('permissions-group-roles-table'));
  }
}

export const projectRbacPermissions = new ProjectRbacPermissionsTab();
