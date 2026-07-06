import { appChrome } from '../appChrome';

class AutomlExperimentsPage {
  visit(namespace: string) {
    cy.visitWithLogin(`/develop-train/automl/experiments/${namespace}`);
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  findNavItem() {
    return appChrome.findNavItem({ name: 'AutoML', rootSection: 'Develop & train' });
  }

  findEmptyState(timeout?: number) {
    return cy.findByTestId('empty-experiments-state', timeout ? { timeout } : undefined);
  }

  findCreateRunButton() {
    return cy.findByTestId('create-run-button');
  }

  findHeaderCreateRunButton() {
    return cy.findByTestId('automl-header-create-experiment-button');
  }
}

export const automlExperimentsPage = new AutomlExperimentsPage();
