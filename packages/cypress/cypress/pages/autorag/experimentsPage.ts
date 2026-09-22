import { appChrome } from '../appChrome';

const AUTORAG_DEV_FEATURE_FLAGS = 'devFeatureFlags=autorag=true,genAiStudio=true';

class AutoragExperimentsPage {
  pathWithDevFlags(): string {
    return `/?${AUTORAG_DEV_FEATURE_FLAGS}`;
  }

  visit(namespace: string) {
    cy.visit(`/gen-ai-studio/autorag/experiments/${namespace}?${AUTORAG_DEV_FEATURE_FLAGS}`);
    cy.reload();
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  findNavItem() {
    return appChrome.findNavItem({ name: 'AutoRAG', rootSection: 'Gen AI studio' });
  }

  findPageTitle(timeout?: number) {
    return cy.findByTestId('app-page-title', timeout ? { timeout } : undefined);
  }

  findEmptyState(timeout?: number) {
    return cy.findByTestId('empty-experiments-state', timeout ? { timeout } : undefined);
  }

  findCreateRunButton() {
    return cy.findByTestId('create-run-button');
  }

  findHeaderCreateRunButton() {
    return cy.findByTestId('autorag-header-create-run-button');
  }

  findAnyCreateRunButton(options?: Partial<Cypress.Loggable & Cypress.Timeoutable>) {
    return cy
      .get(
        '[data-testid="autorag-header-create-run-button"], [data-testid="create-run-button"]',
        options,
      )
      .first();
  }
}

export const autoragExperimentsPage = new AutoragExperimentsPage();
