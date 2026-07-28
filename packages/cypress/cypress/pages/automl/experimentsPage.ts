import { appChrome } from '../appChrome';

class AutomlExperimentsPage {
  visit(namespace: string) {
    // First navigate to home to ensure we're authenticated and dashboard is loaded
    cy.visitWithLogin('/');

    // Reload once to pick up any recent config changes (e.g., feature flags just enabled)
    // This ensures the dashboard frontend has the latest OdhDashboardConfig
    cy.reload();

    // Wait for AutoML nav item to ensure feature is fully loaded in the UI
    // This prevents 404 errors when feature flag was just enabled
    // Cypress will automatically retry this assertion until it passes or times out
    this.findNavItem().should('exist');

    // Now navigate to AutoML experiments page
    cy.visit(`/develop-train/automl/experiments/${namespace}`, { timeout: 120000 });
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

  findAnyCreateRunButton(options?: Partial<Cypress.Loggable & Cypress.Timeoutable>) {
    return cy
      .get(
        '[data-testid="automl-header-create-experiment-button"], [data-testid="create-run-button"]',
        options,
      )
      .first();
  }
}

export const automlExperimentsPage = new AutomlExperimentsPage();
