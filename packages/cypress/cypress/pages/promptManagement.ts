import { appChrome } from './appChrome';

const MLFLOW_DARK_MODE_KEY = '_mlflow_dark_mode_toggle_enabled';

class PromptManagement {
  visit(workspace?: string) {
    const qs = workspace ? `?workspace=${workspace}` : '';
    cy.visitWithLogin(`/gen-ai-studio/prompts${qs}`);
    this.wait();
  }

  navigate() {
    this.findNavItem().click();
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title', { timeout: 30000 }).should('exist');
    cy.testA11y();
  }

  findNavItem() {
    return appChrome.findNavItem({ name: 'Prompts', rootSection: 'Gen AI studio' });
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  findLaunchMlflowButton() {
    return cy.findByTestId('mlflow-prompts-jump-link');
  }

  findMlflowUnavailableState() {
    return cy.findByTestId('mlflow-unavailable-empty-state');
  }

  findProjectSelector() {
    return cy.findByTestId('project-selector-dropdown');
  }

  findPromptsSearchInput() {
    return cy.get('[data-component-id="mlflow.prompts.global.list.search"]');
  }

  findCreatePromptButton() {
    return cy.get(
      '[data-testid="create-prompt-button"], [data-testid="create-prompt-empty-state-button"]',
    );
  }

  findPromptInTable(name: string) {
    return cy.findByRole('link', { name });
  }

  findPromptNameInput() {
    return cy.get('[data-component-id="mlflow.prompts.create.name"]');
  }

  findPromptTemplateInput() {
    return cy.get('[data-component-id="mlflow.prompts.create.content"]');
  }

  findPromptCommitMessageInput() {
    return cy.get('[data-component-id="mlflow.prompts.create.commit_message"]');
  }

  findCreateDialogSubmitButton() {
    return cy.get('[data-component-id="mlflow.prompts.create.modal.footer.ok"]');
  }

  findCreatePromptVersionButton() {
    return cy.get('[data-component-id="mlflow.prompts.details.create"]');
  }

  findVersionsTableHeader() {
    return cy.get('[data-component-id="mlflow.prompts.versions.table.header"]');
  }

  findVersionInTable(version: string) {
    return cy.contains('[role="row"]', version);
  }

  findPromptDetailHeading(name: string) {
    return cy.findByRole('heading', { name });
  }

  findCompareTab() {
    return cy.findByRole('radio', { name: 'Compare' });
  }

  findPreviewTab() {
    return cy.findByRole('radio', { name: 'Preview' });
  }

  findDarkThemeToggle() {
    return cy.findByTestId('dark-theme-toggle');
  }

  findLightThemeToggle() {
    return cy.findByTestId('light-theme-toggle');
  }

  getMlflowDarkModeStorageValue(): Cypress.Chainable<string | null> {
    return cy.window().then((win) => {
      const value = win.localStorage.getItem(MLFLOW_DARK_MODE_KEY);
      return cy.wrap<string | null>(value);
    });
  }

  getHtmlDarkModeClass(): Cypress.Chainable<boolean> {
    return cy.document().then((doc) => doc.documentElement.classList.contains('pf-v6-theme-dark'));
  }
}

export const promptManagement = new PromptManagement();
