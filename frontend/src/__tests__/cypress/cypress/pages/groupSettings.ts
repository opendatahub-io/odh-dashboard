class GroupSettingsPage {
  visit() {
    cy.visitWithLogin('/settings/groupSettings');
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  findNavItem() {
    return cy.findByTestId('settings-nav-item');
  }

  findAdminGroupsSection() {
    return cy.findByTestId('data-science-administrator-groups');
  }

  findUserGroupsSection() {
    return cy.findByTestId('data-science-user-groups');
  }

  findAdminGroupsAlert() {
    return cy.findByTestId('data-science-administrator-info');
  }

  findAdminGroupsSelect() {
    return this.findAdminGroupsSection().findByTestId('group-setting-select');
  }

  findUserGroupsSelect() {
    return this.findUserGroupsSection().findByTestId('group-setting-select');
  }

  findSaveButton() {
    return cy.findByTestId('save-button');
  }

  shouldShowLoading() {
    cy.findByRole('progressbar').should('exist');
    return this;
  }

  shouldShowError() {
    cy.findByText(/Unable to load user management/).should('exist');
    return this;
  }
}

export const groupSettingsPage = new GroupSettingsPage();
