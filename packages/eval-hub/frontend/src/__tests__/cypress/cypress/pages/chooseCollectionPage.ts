class ChooseCollectionPage {
  visit(namespace: string) {
    cy.visit(`/evaluation/${namespace}/create/collections`);
    this.waitForLoad();
  }

  private waitForLoad() {
    cy.findByTestId('app-page-title').should('exist');
    cy.testA11y();
  }

  findTitle() {
    return cy.findByTestId('app-page-title');
  }

  findCollectionsGallery() {
    return cy.findByTestId('collections-gallery');
  }

  findCollectionCard(collectionId: string) {
    return cy.findByTestId(`collection-card-${collectionId}`);
  }

  findCollectionDrawerPanel() {
    return cy.findByTestId('collection-drawer-panel');
  }

  findUseBenchmarkSuiteButton(collectionId: string) {
    return this.findCollectionCard(collectionId).findByTestId('use-benchmark-suite-button');
  }

  findNameFilterInput() {
    return cy.findByTestId('collections-name-filter');
  }

  findCategoryToggle() {
    return cy.findByTestId('collections-category-filter');
  }

  findCollectionsEmptyState() {
    return cy.findByTestId('collections-empty-state');
  }

  findTruncationAlert() {
    return cy.findByTestId('collections-truncation-alert');
  }

  findCategoryOption(name: string) {
    return cy.findByTestId(`collections-category-option-${name}`);
  }

  findNextPageButton() {
    return cy.findAllByLabelText('Go to next page').first();
  }

  findSortToggle() {
    return cy.findByTestId('collections-sort-toggle');
  }

  findSortSelect() {
    return cy.findByTestId('collections-sort-select');
  }

  selectSortOption(value: string) {
    this.findSortToggle().click();
    cy.findByTestId(`collections-sort-option-${value}`).click();
  }

  findClearAllFiltersButton() {
    return cy.findByRole('button', { name: 'Clear all filters' });
  }

  selectCategoryOption(category: string) {
    this.findCategoryToggle().click();
    this.findCategoryOption(category).click();
    this.findCategoryToggle().click();
  }

  findCategorySearchInput() {
    return cy.findByTestId('collections-category-search-input');
  }

  findCategoryFilterBadge() {
    return cy.findByTestId('collections-category-filter-badge');
  }
}

export const chooseCollectionPage = new ChooseCollectionPage();
