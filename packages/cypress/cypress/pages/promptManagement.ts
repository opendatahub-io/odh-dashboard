import { appChrome } from './appChrome';

const MLFLOW_DARK_MODE_KEY = '_mlflow_dark_mode_toggle_enabled';

class PromptManagement {
  visit(workspace?: string) {
    const qs = workspace ? `?workspace=${workspace}` : '';
    cy.visitWithLogin(`/gen-ai-studio/prompts${qs}`);
    this.wait();
  }

  navigate() {
    appChrome.findNavItem({ name: 'Prompts', rootSection: 'Gen AI studio' }).click();
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title').should('exist');
    cy.findByTestId('app-page-title').contains('Prompts');
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

  findNoProjectsEmptyState() {
    return cy.findByTestId('prompt-management-no-projects-empty-state');
  }

  findProjectSelector() {
    return cy.findByTestId('project-selector-dropdown');
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
