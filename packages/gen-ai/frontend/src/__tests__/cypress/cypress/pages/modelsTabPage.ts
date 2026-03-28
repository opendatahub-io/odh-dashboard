class ModelsTabRow {
  private findFn: () => Cypress.Chainable<JQuery<HTMLTableRowElement>>;

  constructor(findFn: () => Cypress.Chainable<JQuery<HTMLTableRowElement>>) {
    this.findFn = findFn;
  }

  find(): Cypress.Chainable<JQuery<HTMLTableRowElement>> {
    return this.findFn();
  }

  findSourceLabel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Source"]');
  }

  findEndpointCell(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Endpoints"]');
  }

  findModelTypeCell(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Model type"]');
  }

  findUseCaseCell(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Use case"]');
  }

  findStatusCell(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Status"]');
  }

  findPlaygroundCell(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('[data-label="Playground"]');
  }
}

class ModelsTabPage {
  findTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('ai-models-table');
  }

  findTableRows(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findTable().find('tr:has(td)');
  }

  getRow(modelName: string): ModelsTabRow {
    return new ModelsTabRow(() =>
      this.findTable().find('tr:has(td)').contains(modelName).parents('tr'),
    );
  }

  openEndpointModal(modelName: string): void {
    this.getRow(modelName).findEndpointCell().findByTestId('endpoint-view-button').click();
  }

  findToolbar(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('models-table-toolbar');
  }

  findFilterToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findToolbar().findByRole('button', { name: /Filter toggle/i });
  }

  findSearchInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findToolbar().findByRole('textbox');
  }

  findClearFiltersButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findToolbar().findByRole('button', { name: /Clear all filters/i });
  }

  selectFilterType(filterType: string): void {
    this.findFilterToggle().click();
    cy.findByRole('menuitem', { name: filterType }).click();
  }

  filterByName(name: string): void {
    this.selectFilterType('Name');
    this.findSearchInput().clear().type(`${name}{enter}`);
  }

  filterByUseCase(useCase: string): void {
    this.selectFilterType('Use Case');
    this.findSearchInput().clear().type(`${useCase}{enter}`);
  }

  clearFilters(): void {
    this.findClearFiltersButton().click();
  }

  findActiveFilterChip(filterKey: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`filter-chip-${filterKey}`);
  }
}

class EndpointModalPage {
  findModal(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[role="dialog"]');
  }

  findSubscriptionSelect(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('endpoint-modal-subscription-select');
  }

  findGenerateButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('endpoint-modal-generate-api-key');
  }

  findApiKeyInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('endpoint-modal-api-key-input');
  }

  findApiKeyToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('endpoint-modal-api-key-toggle');
  }

  findCloseButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('endpoint-modal-close');
  }
}

export const modelsTabPage = new ModelsTabPage();
export const endpointModalPage = new EndpointModalPage();
