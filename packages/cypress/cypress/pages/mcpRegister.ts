import { DashboardCodeEditor } from './components/DashboardCodeEditor';

class McpRegisterModal {
  findModal(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-register-modal');
  }

  shouldBeOpen(): void {
    this.findModal().should('be.visible');
  }

  shouldNotExist(): void {
    cy.findByTestId('mcp-register-modal').should('not.exist');
  }

  findTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().find('.pf-v6-c-modal-box__title-text');
  }

  findDisplayNameInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-register-display-name');
  }

  findServerJsonEditor(): DashboardCodeEditor {
    return new DashboardCodeEditor(() =>
      this.findModal().findByTestId('mcp-register-server-json-editor'),
    );
  }

  findStatusSelectToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-register-status');
  }

  selectStatus(key: 'draft' | 'active'): void {
    this.findStatusSelectToggle().click();
    cy.findByTestId(key).click();
  }

  findSourceInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-register-source');
  }

  findIconUrlInput(index = 0): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId(`mcp-register-icon-url-${index}`);
  }

  findIconThemeToggle(index = 0): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId(`mcp-register-icon-theme-${index}`);
  }

  selectIconTheme(index: number, key: 'any' | 'light' | 'dark'): void {
    this.findIconThemeToggle(index).click();
    cy.findByTestId(key).click();
  }

  findIconRemoveButton(index = 0): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId(`mcp-register-icon-remove-${index}`);
  }

  findAddIconButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-register-icon-add');
  }

  findLightIconPreview(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-register-icon-preview-light');
  }

  findDarkIconPreview(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('mcp-register-icon-preview-dark');
  }

  findProjectSelectorToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('project-selector-toggle');
  }

  selectProject(name: string): void {
    this.findProjectSelectorToggle().click();
    cy.findByTestId('project-selector-menuList').findByRole('menuitem', { name }).click();
  }

  findSubmitButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('modal-submit-button');
  }

  findCloseButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('modal-cancel-button');
  }

  findSubmitError(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findModal().findByTestId('error-message-alert');
  }
}

export const mcpRegisterModal = new McpRegisterModal();
