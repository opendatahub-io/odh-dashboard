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
}

export const projectRoles = new ProjectRolesTab();
