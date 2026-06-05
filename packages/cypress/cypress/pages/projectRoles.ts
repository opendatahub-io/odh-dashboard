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
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  findRolesTab() {
    return cy.findByTestId('roles-tab');
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
}

export const projectRoles = new ProjectRolesTab();
