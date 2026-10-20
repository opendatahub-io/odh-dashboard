import { appChrome } from '../appChrome';

const DEV_FEATURE_FLAGS_SESSION_KEY = 'odh-feature-flags';
const DEV_FEATURE_FLAGS_BANNER_KEY = 'odh.dashboard.devFlag.banner';

class AutomlExperimentsPage {
  pathWithDefaults(): string {
    return '/';
  }

  private clearDevFeatureFlagOverrides() {
    cy.window().then(({ localStorage, sessionStorage }) => {
      sessionStorage.removeItem(DEV_FEATURE_FLAGS_SESSION_KEY);
      localStorage.removeItem(DEV_FEATURE_FLAGS_BANNER_KEY);
    });
  }

  visit(namespace: string) {
    // First navigate to home to ensure we're authenticated and dashboard is loaded
    cy.visitWithLogin(this.pathWithDefaults());

    // Remove any overrides left by an earlier test before reloading the app.
    // This keeps the navigation on the normal, non-dev-override path.
    this.clearDevFeatureFlagOverrides();

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

  // Renders once the lazy AutoML route has actually mounted — the host's loading fallback
  // for lazy routes is empty, so waiting on this proves AutoML content is on the page.
  findModuleHeaderIconContainer() {
    return cy.findByTestId('automl-header-icon-container');
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
