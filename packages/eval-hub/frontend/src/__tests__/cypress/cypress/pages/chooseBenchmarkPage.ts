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

  findCategoryFilter() {
    return cy.findByTestId('benchmarks-category-filter');
  }

  findMetricsFilter() {
    return cy.findByTestId('benchmarks-metrics-filter');
  }

  findNameFilterInput() {
    return cy.findByTestId('benchmarks-name-filter');
  }

  findBenchmarksEmptyState() {
    return cy.findByTestId('benchmarks-empty-state');
  }

  findClearFiltersButton() {
    return cy.findByTestId('benchmarks-clear-filters');
  }

  findNextPageButton() {
    return cy.findByLabelText('Go to next page');
  }

  findSortToggle() {
    return cy.findByTestId('benchmarks-sort-toggle');
  }

  findSortSelect() {
    return cy.findByTestId('benchmarks-sort-select');
  }

  selectSortOption(label: string) {
    this.findSortToggle().click();
    this.findSortSelect().findByText(label).click();
  }

  selectCategoryOption(category: string) {
    this.findCategoryFilter().click();
    cy.findByTestId('benchmarks-category-select').findByText(category).click();
    this.findCategoryFilter().click();
  }

  selectMetricsOption(metric: string) {
    this.findMetricsFilter().click();
    cy.findByTestId('benchmarks-metrics-select').findByText(metric).click();
    this.findMetricsFilter().click();
  }

  findCategorySearchInput() {
    return cy.findByTestId('benchmarks-category-select').findByLabelText('Search categories');
  }

  findMetricsSearchInput() {
    return cy.findByTestId('benchmarks-metrics-select').findByLabelText('Search metrics');
  }

  findFilterLabelChips(groupName: string) {
    return cy.findByText(groupName).parent().find('.pf-v6-c-label__content');
  }
}

export const chooseBenchmarkPage = new ChooseBenchmarkPage();
