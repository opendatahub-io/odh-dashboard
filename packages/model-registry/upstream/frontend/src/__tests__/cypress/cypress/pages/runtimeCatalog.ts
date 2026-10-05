const RUNTIME_CATALOG_TAB_PATH =
  '/settings/model-resources-operations/model-deployment-settings/serving-runtime-catalog';

class RuntimeCatalog {
  visit() {
    cy.visit(RUNTIME_CATALOG_TAB_PATH);
    this.wait();
  }

  private wait() {
    cy.findByTestId('runtime-catalog-page').should('exist');
  }

  findPage() {
    return cy.findByTestId('runtime-catalog-page');
  }

  findSectionTitle() {
    return cy.findByTestId('runtime-catalog-section-title');
  }

  findSectionDescription() {
    return cy.findByTestId('runtime-catalog-section-description');
  }

  findSearchInput() {
    return cy.findByTestId('runtime-catalog-search-input');
  }

  findSidebar() {
    return cy.findByTestId('runtime-catalog-sidebar');
  }

  findGallerySection() {
    return cy.findByTestId('runtime-catalog-gallery-section');
  }

  findCards() {
    return cy.findByTestId('runtime-catalog-gallery-section').find('.pf-v6-c-card');
  }

  findCard(cardKey: string) {
    return cy.findByTestId(`runtime-catalog-card-${cardKey}`);
  }

  findCardIcon(cardKey: string) {
    return cy.findByTestId(`runtime-catalog-card-icon-${cardKey}`);
  }

  findCardDetailLink(cardKey: string) {
    return cy.findByTestId(`runtime-catalog-card-detail-link-${cardKey}`);
  }

  findCardName(cardKey: string) {
    return cy.findByTestId(`runtime-catalog-card-name-${cardKey}`);
  }

  findCardDescription(cardKey: string) {
    return cy.findByTestId(`runtime-catalog-card-description-${cardKey}`);
  }

  findCardLatestBadge(cardKey: string) {
    return cy.findByTestId(`runtime-catalog-card-latest-${cardKey}`);
  }

  findCardHardware(cardKey: string) {
    return cy.findByTestId(`runtime-catalog-card-hardware-${cardKey}`);
  }

  findCardFooter(cardKey: string) {
    return cy.findByTestId(`runtime-catalog-card-footer-${cardKey}`);
  }

  findFilter(filterKey: string) {
    return cy.findByTestId(`runtime-catalog-filter-${filterKey}`);
  }

  findFilterCheckbox(filterKey: string, value: string) {
    return cy.findByTestId(`runtime-catalog-filter-${filterKey}-${value}`);
  }

  findEmptyState() {
    return cy.findByTestId('runtime-catalog-empty-state');
  }
}

export const runtimeCatalog = new RuntimeCatalog();
