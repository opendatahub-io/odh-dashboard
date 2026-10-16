const RUNTIME_CATALOG_PATH =
  '/settings/model-resources-operations/model-deployment-settings/serving-runtime-catalog';

class RuntimeCatalogPage {
  visit(wait = true) {
    cy.visitWithLogin(RUNTIME_CATALOG_PATH);
    if (wait) {
      this.wait();
    }
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

  findCardDetailLink(cardKey: string) {
    return this.findCard(cardKey).findByTestId(`runtime-catalog-card-detail-link-${cardKey}`);
  }

  openCardDetails(cardKey: string) {
    this.findCardDetailLink(cardKey).click();
  }

  findCardName(cardKey: string) {
    return cy.findByTestId(`runtime-catalog-card-name-${cardKey}`);
  }

  findPageDescription() {
    return cy.findByTestId('runtime-catalog-page-description');
  }

  findCardIcon(cardKey: string) {
    return cy.findByTestId(`runtime-catalog-card-icon-${cardKey}`);
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

  findHardwareFilter() {
    return cy.findByTestId('runtime-catalog-filter-hardware');
  }

  findHardwareFilterCheckbox(hardware: string) {
    return cy.findByTestId(`runtime-catalog-filter-hardware-${hardware}`);
  }

  findHardwareFilterChip(hardware: string) {
    return cy.findByTestId(`runtime-catalog-filter-chip-hardware-${hardware}`);
  }

  findEmptyState() {
    return cy.findByTestId('runtime-catalog-empty-state');
  }
}

export const runtimeCatalogPage = new RuntimeCatalogPage();
