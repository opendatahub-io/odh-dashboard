class RegisterAndStorePage {
  visit() {
    const preferredModelRegistry = 'modelregistry-sample';
    cy.visitWithLogin(`/ai-hub/registry/${preferredModelRegistry}/register/model`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    cy.findByTestId('app-page-title').contains('Register model');
  }

  findRegisterAndStoreToggleButton() {
    return cy.findByTestId('registration-mode-register-and-store');
  }

  selectRegisterAndStoreMode() {
    this.findRegisterAndStoreToggleButton().click();
  }

  findNamespaceFormGroup() {
    return cy.findByTestId('namespace-form-group');
  }

  findProjectSelectorToggle(timeout?: number) {
    return cy.findByTestId('project-selector-toggle', { timeout });
  }

  findProjectSelectorSearch() {
    return cy.findByTestId('project-selector-search');
  }

  findProjectSelectorMenuList() {
    return cy.findByTestId('project-selector-menuList');
  }

  findNoAccessAlert() {
    return cy.findByTestId('namespace-registry-access-alert');
  }

  findCannotCheckAlert() {
    return cy.findByTestId('namespace-registry-cannot-check-alert');
  }

  findAccessCheckError() {
    return cy.findByTestId('namespace-registry-access-error');
  }

  findWhoIsMyAdminTrigger() {
    return cy.findByTestId('who-is-my-admin-trigger');
  }

  findSubmitButton() {
    return cy.findByTestId('create-button');
  }

  selectProject(displayName: string) {
    this.findProjectSelectorToggle().click();
    cy.findByRole('menuitem', { name: displayName }).click();
  }
}

export const registerAndStorePage = new RegisterAndStorePage();
