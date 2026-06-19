import { TableRow } from './components/table';

class RolesTableRow extends TableRow {
  findNameLink() {
    return this.find().findByTestId('role-name-link');
  }

  findDescription() {
    return this.find().find('[data-label="Description"]');
  }

  findType() {
    return this.find().find('[data-label="Type"]');
  }

  shouldHaveName(name: string) {
    this.findNameLink().should('have.text', name);
    return this;
  }

  findKebabAction(name: string, verify = true): Cypress.Chainable<JQuery<HTMLElement>> {
    const kebabAction = this.find().findKebabAction(name);
    return verify ? kebabAction.should('exist').and('be.visible') : kebabAction;
  }
}

class ProjectRolesTab {
  visit(namespace: string) {
    cy.visitWithLogin(`/projects/${namespace}?section=roles`);
    this.wait();
  }

  visitOverview(namespace: string) {
    cy.visitWithLogin(`/projects/${namespace}?section=overview`);
    this.wait();
  }

  visitCreateRole(namespace: string) {
    cy.visitWithLogin(`/projects/${namespace}/roles/create`);
    cy.findByTestId('create-role-page');
    cy.testA11y();
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  findRolesTab() {
    return cy.findByTestId('roles-tab');
  }

  findRolesTable() {
    return cy.findByTestId('roles-table');
  }

  findCreateRoleButton() {
    return cy.findByTestId('create-role-button');
  }

  findCreateRolePage() {
    return cy.findByTestId('create-role-page');
  }

  findCreateRoleForm() {
    return cy.findByTestId('create-role-form');
  }

  findRoleNameInput() {
    return cy.findByTestId('role-name');
  }

  findDescriptionTextarea() {
    return cy.findByTestId('role-description');
  }

  findAddLabelButton() {
    return cy.findByTestId('role-add-label');
  }

  findLabelKeyInput(index: number) {
    return cy.findByTestId(`role-label-key-${index}`);
  }

  findLabelValueInput(index: number) {
    return cy.findByTestId(`role-label-value-${index}`);
  }

  findLabelRemoveButton(index: number) {
    return cy.findByTestId(`role-label-remove-${index}`);
  }

  findPermissionsEmptyState() {
    return cy.findByTestId('permissions-empty-state');
  }

  findAddRuleButton() {
    return cy.findByTestId('role-add-rule');
  }

  findImportTemplateButton() {
    return cy.findByTestId('role-import-template');
  }

  findSelectRoleTemplateButton() {
    return cy.findByTestId('select-role-template-button');
  }

  findSubmitButton() {
    return cy.findByTestId('create-role-submit');
  }

  findCancelButton() {
    return cy.findByTestId('create-role-cancel');
  }

  findSearchInput() {
    return cy.findByTestId('roles-table-search').find('input');
  }

  findEmptyState() {
    return cy.findByTestId('no-roles-empty-state');
  }

  findEmptyFilterState() {
    return cy.findByTestId('dashboard-empty-table-state');
  }

  findPreviewYAMLModal() {
    return cy.findByTestId('preview-yaml-modal');
  }

  findPreviewYAMLCloseButton() {
    return cy.findByTestId('preview-yaml-close-button');
  }

  findSubmitErrorAlert() {
    return cy.findByTestId('create-role-error-alert');
  }

  findConfirmModal() {
    return cy.findByTestId('create-role-confirm-modal');
  }

  findConfirmCreateButton() {
    return cy.findByTestId('confirm-create-button');
  }

  findConfirmCancelButton() {
    return cy.findByTestId('confirm-cancel-button');
  }

  findConfirmModalErrorAlert() {
    return cy.findByTestId('error-message-alert');
  }

  findAddRuleModal() {
    return cy.findByTestId('add-rule-modal');
  }

  findRuleApiGroupsToggle() {
    return cy.findByTestId('rule-api-groups-toggle');
  }

  findRuleResourceTypesToggle() {
    return cy.findByTestId('rule-resource-types-toggle');
  }

  findVerbCheckbox(verb: string) {
    return cy.findByTestId('add-rule-modal').findByTestId(`verb-checkbox-${verb}`);
  }

  findRuleSaveButton() {
    return cy.findByTestId('modal-submit-button');
  }

  getRow(name: string) {
    return new RolesTableRow(() =>
      this.findRolesTable().findAllByTestId('role-name-link').contains(name).parents('tr'),
    );
  }

  findTableHeaderButton(name: string | RegExp) {
    return this.findRolesTable().find('thead').findByRole('button', { name });
  }
}

export const projectRoles = new ProjectRolesTab();
