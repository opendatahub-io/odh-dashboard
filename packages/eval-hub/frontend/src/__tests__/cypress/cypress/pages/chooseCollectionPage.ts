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

  findNameFilterInput() {
    return cy.findByTestId('collections-name-filter');
  }

  findCategorySelect() {
    return cy.findByTestId('collections-category-select');
  }

  findCollectionsEmptyState() {
    return cy.findByTestId('collections-empty-state');
  }

  findTruncationAlert() {
    return cy.findByTestId('collections-truncation-alert');
  }
}

export const chooseCollectionPage = new ChooseCollectionPage();
