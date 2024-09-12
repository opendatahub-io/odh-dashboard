import { SubComponentBase } from '~/__tests__/cypress/cypress/pages/components/subComponents/SubComponentBase';

export class SearchSelector extends SubComponentBase {
  constructor(private selectorId: string, contextSelectorId?: string) {
    super(contextSelectorId);
  }

  private findContextualItem(suffix: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findScope().findByTestId(`${this.selectorId}-${suffix}`);
  }

  findItem(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findToggleButton().findDropdownItem(name);
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
}
