class ChooseBenchmarkPage {
  visit(namespace: string) {
    cy.visit(`/evaluation/${namespace}/create/benchmarks`);
    this.waitForLoad();
  }

  private waitForLoad() {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findTitle() {
    return cy.findByTestId('app-page-title');
  }

  findBenchmarksGallery() {
    return cy.findByTestId('benchmarks-gallery');
  }

  findBenchmarkCard(providerId: string, benchmarkId: string) {
    return cy.findByTestId(`benchmark-card-${providerId}-${benchmarkId}`);
  }

  findBenchmarkDrawerPanel() {
    return cy.findByTestId('benchmark-drawer-panel');
  }

  findBenchmarksFilterToolbar() {
    return cy.findByTestId('benchmarks-filter-toolbar');
  }

  findFilterDropdownToggle() {
    return cy.findByTestId('filter-toolbar-dropdown');
  }

  findBenchmarksEmptyState() {
    return cy.findByTestId('benchmarks-empty-state');
  }

  findClearFiltersButton() {
    return cy.findByTestId('benchmarks-clear-filters');
  }

  selectFilterOption(optionTestId: string) {
    this.findFilterDropdownToggle().click();
    cy.findByTestId(`filter-toolbar-option-${optionTestId}`).click();
  }

  findNameFilterInput() {
    return cy.findByTestId('benchmarks-name-filter');
  }

  findNextPageButton() {
    return cy.findByLabelText('Go to next page');
  }
}

export const chooseBenchmarkPage = new ChooseBenchmarkPage();
