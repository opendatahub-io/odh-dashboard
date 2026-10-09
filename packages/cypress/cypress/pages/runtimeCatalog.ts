const RUNTIME_CATALOG_PATH =
  '/settings/model-resources-operations/model-deployment-settings/serving-runtime-catalog';

class RuntimeCatalogPage {
  visit() {
    cy.visitWithLogin(RUNTIME_CATALOG_PATH);
    this.wait();
  }

  private wait() {
    cy.findByTestId('runtime-catalog-page').should('exist');
  }

  findPage() {
    return cy.findByTestId('runtime-catalog-page');
  }

  findSearchInput() {
    return cy.findByTestId('runtime-catalog-search-input');
  }

  findSidebar() {
    return cy.findByTestId('runtime-catalog-page').find('[class*="sidebar"]');
  }

  findCards() {
    return cy.get('[data-testid^="runtime-catalog-card-"]');
  }

  findCard(cardKey: string) {
    return cy.findByTestId(`runtime-catalog-card-${cardKey}`);
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

  findEmptyState() {
    return cy.findByTestId('runtime-catalog-empty-state');
  }
}

export const runtimeCatalogPage = new RuntimeCatalogPage();
