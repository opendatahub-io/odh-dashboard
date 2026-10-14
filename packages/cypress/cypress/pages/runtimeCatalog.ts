import type { UserAuthConfig } from '../types';

const RUNTIME_CATALOG_PATH =
  '/settings/model-resources-operations/model-deployment-settings/serving-runtime-catalog';

class RuntimeCatalogPage {
  visit() {
    cy.visitWithLogin(RUNTIME_CATALOG_PATH);
    this.wait();
  }

  // Visits the library without waiting for it to render, for checking users who cannot reach it.
  visitAs(credentials: UserAuthConfig, search = '') {
    cy.visitWithLogin(`${RUNTIME_CATALOG_PATH}${search}`, credentials);
  }

  navigate() {
    this.findTab().click();
    this.wait();
  }

  private wait() {
    cy.findByTestId('runtime-catalog-page').should('exist');
  }

  findTab() {
    return cy.findByTestId('tab-serving-runtime-catalog');
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

  findCardDetailLinks() {
    return cy.findAllByTestId(/^runtime-catalog-card-detail-link-/);
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

  findHardwareFilterCheckboxes() {
    return cy.findByTestId('runtime-catalog-filter-hardware').find('input[type="checkbox"]');
  }

  findHardwareFilterChips() {
    return cy.findAllByTestId(/^runtime-catalog-filter-chip-hardware-/);
  }

  findEmptyState() {
    return cy.findByTestId('runtime-catalog-empty-state');
  }
}

export const runtimeCatalogPage = new RuntimeCatalogPage();
