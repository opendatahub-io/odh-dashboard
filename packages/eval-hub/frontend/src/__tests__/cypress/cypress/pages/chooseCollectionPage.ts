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
    return cy.findByTestId('collections-category-toggle');
  }

  findCollectionsEmptyState() {
    return cy.findByTestId('collections-empty-state');
  }

  findTruncationAlert() {
    return cy.findByTestId('collections-truncation-alert');
  }

  findCategoryOption(name: string) {
    return cy.findByRole('option', { name });
  }

  findNextPageButton() {
    return cy.findAllByLabelText('Go to next page').first();
  }
}

export const chooseCollectionPage = new ChooseCollectionPage();
