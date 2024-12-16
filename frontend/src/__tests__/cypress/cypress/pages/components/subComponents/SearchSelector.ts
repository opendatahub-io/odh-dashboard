import { SubComponentBase } from '~/__tests__/cypress/cypress/pages/components/subComponents/SubComponentBase';

export class SearchSelector extends SubComponentBase {
  constructor(private selectorId: string, contextSelectorId?: string) {
    super(contextSelectorId);
  }

  private findContextualItem(suffix: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findScope().findByTestId(`${this.selectorId}-${suffix}`);
  }

  findItem(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findToggleButton().findMenuItem(name);
  }

  selectItem(name: string): void {
    this.findItem(name).click();
  }

  findSearchInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findContextualItem('search');
  }

  findToggleButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findContextualItem('toggle');
  }

  findSearchHelpText(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findContextualItem('searchHelpText');
  }

  findMenu(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findContextualItem('menu');
  }

  findMenuList(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findContextualItem('menuList');
  }

  // Search for an item by typing into the search input
  searchItem(name: string): void {
    this.findSearchInput().clear().type(name);
  }

  // Perform the entire process: open, search, and select
  openAndSelectItem(name: string): void {
    this.findToggleButton().click(); // Open the dropdown
    this.searchItem(name); // Type the name in the search input
    this.selectItem(name); // Select the item
  }
}
