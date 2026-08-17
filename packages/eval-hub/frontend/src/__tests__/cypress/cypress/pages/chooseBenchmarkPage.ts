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
    return cy.findAllByLabelText('Go to next page').first();
  }

  findSortToggle() {
    return cy.findByTestId('benchmarks-sort-toggle');
  }

  findSortSelect() {
    return cy.findByTestId('benchmarks-sort-select');
  }

  selectSortOption(value: string) {
    this.findSortToggle().click();
    cy.findByTestId(`benchmarks-sort-option-${value}`).click();
  }

  findCategoryOption(category: string) {
    return cy.findByTestId(`benchmarks-category-option-${category}`);
  }

  selectCategoryOption(category: string) {
    this.findCategoryFilter().click();
    this.findCategoryOption(category).click();
    this.findCategoryFilter().click();
  }

  findMetricsOption(metric: string) {
    return cy.findByTestId(`benchmarks-metrics-option-${metric}`);
  }

  selectMetricsOption(metric: string) {
    this.findMetricsFilter().click();
    this.findMetricsOption(metric).click();
    this.findMetricsFilter().click();
  }

  findCategorySearchInput() {
    return cy.findByTestId('benchmarks-category-search-input');
  }

  findMetricsSearchInput() {
    return cy.findByTestId('benchmarks-metrics-search-input');
  }

  findCategoryFilterBadge() {
    return cy.findByTestId('benchmarks-category-filter-badge');
  }

  findMetricsFilterBadge() {
    return cy.findByTestId('benchmarks-metrics-filter-badge');
  }
}

export const chooseBenchmarkPage = new ChooseBenchmarkPage();
