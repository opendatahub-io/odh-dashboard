class ObservabilityDashboardPage {
  visit() {
    cy.visitWithLogin('/observe-and-monitor/dashboard');
    this.wait();
  }

  private wait() {
    cy.findByTestId('app-page-title');
    cy.testA11y();
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  findEmptyState() {
    return cy.findByText('No dashboards found.');
  }

  findTabs() {
    return cy.findByTestId('observability-dashboard-tabs');
  }

  findTab(name: string) {
    return cy.findByRole('tab', { name });
  }

  findAllTabs() {
    return this.findTabs().find('[role="tab"]');
  }

  shouldHaveEmptyState() {
    this.findEmptyState().should('exist');
    return this;
  }

  shouldHaveTab(name: string) {
    this.findTab(name).should('exist');
    return this;
  }

  shouldNotHaveTab(name: string) {
    cy.findByRole('tab', { name }).should('not.exist');
    return this;
  }

  shouldHaveTabCount(count: number) {
    this.findAllTabs().should('have.length', count);
    return this;
  }
}

export const observabilityDashboardPage = new ObservabilityDashboardPage();
