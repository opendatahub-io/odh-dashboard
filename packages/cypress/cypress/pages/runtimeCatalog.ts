import { appChrome } from './appChrome';
import type { UserAuthConfig } from '../types';

const HARDWARE_FILTER_TEST_ID_PREFIX = 'runtime-catalog-filter-hardware-';

const RUNTIME_CATALOG_PATH =
  '/settings/model-resources-operations/model-deployment-settings/serving-runtime-catalog';

class RuntimeCatalogPage {
  visit(wait = true) {
    cy.visitWithLogin(RUNTIME_CATALOG_PATH);
    if (wait) {
      this.wait();
    }
  }

  // Visits the library without waiting for it to render, for checking users who cannot reach it.
  visitAs(credentials: UserAuthConfig) {
    cy.visitWithLogin(RUNTIME_CATALOG_PATH, credentials);
  }

  navigate() {
    appChrome
      .findNavItem({
        name: 'Model deployment settings',
        rootSection: 'Settings',
        subSection: 'Model resources and operations',
      })
      .click();
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
    return cy.findByTestId('runtime-catalog-search-input').findByRole('textbox');
  }

  findSearchButton() {
    return cy
      .get('body')
      .then(($body) =>
        $body.find('[data-testid="runtime-catalog-search-button"]').length > 0
          ? cy.findByTestId('runtime-catalog-search-button')
          : cy
              .findByTestId('runtime-catalog-search-input')
              .findByRole('button', { name: 'Search' }),
      );
  }

  findFirstCardName() {
    return this.findPage().find('[data-testid^="runtime-catalog-card-name-"]').first();
  }

  findCardDetailLinks() {
    return this.findPage().find('a[data-testid^="runtime-catalog-card-detail-link-"]');
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

  findHardwareFilterCheckboxes() {
    return cy.findByTestId('runtime-catalog-filter-hardware').find('input[type="checkbox"]');
  }

  // Reads the hardware value a filter checkbox selects from its data-testid. closest() checks the
  // input itself first, then its wrappers, so this holds wherever PatternFly places the test ID.
  getHardwareFilterValue($checkbox: JQuery<HTMLElement>): string {
    return (
      $checkbox.closest(`[data-testid^="${HARDWARE_FILTER_TEST_ID_PREFIX}"]`).attr('data-testid') ??
      ''
    ).replace(HARDWARE_FILTER_TEST_ID_PREFIX, '');
  }

  findHardwareFilterChip(hardware: string) {
    return cy.findByTestId(`runtime-catalog-filter-chip-hardware-${hardware}`);
  }

  findHardwareFilterChips() {
    return cy.findAllByTestId(/^runtime-catalog-filter-chip-hardware-/);
  }

  findEmptyState() {
    return cy.findByTestId('runtime-catalog-empty-state');
  }
}

export const runtimeCatalogPage = new RuntimeCatalogPage();
