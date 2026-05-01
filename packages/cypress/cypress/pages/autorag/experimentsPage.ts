import { appChrome } from '../appChrome';

class AutoragExperimentsPage {
  visit(namespace: string) {
    cy.visitWithLogin(`/gen-ai-studio/autorag/experiments/${namespace}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  findNavItem() {
    return appChrome.findNavItem({ name: 'AutoRAG', rootSection: 'Gen AI studio' });
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
}

export const autoragExperimentsPage = new AutoragExperimentsPage();
