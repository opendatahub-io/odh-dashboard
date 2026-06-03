import { appChrome } from '../appChrome';

class AutoragExperimentsPage {
  visit(namespace: string) {
    // First navigate to home to ensure we're authenticated and dashboard is loaded
    cy.visitWithLogin('/');

    // Reload once to pick up any recent config changes (e.g., feature flags just enabled)
    // This ensures the dashboard frontend has the latest OdhDashboardConfig
    cy.reload();

    // Wait for AutoRAG nav item to ensure feature is fully loaded in the UI
    // This prevents 404 errors when feature flag was just enabled
    // Cypress will automatically retry this assertion until it passes or times out
    this.findNavItem().should('exist');

    // Now navigate to AutoRAG experiments page
    cy.visit(`/gen-ai-studio/autorag/experiments/${namespace}`);
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
}

export const autoragExperimentsPage = new AutoragExperimentsPage();
