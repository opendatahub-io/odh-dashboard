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
}

export const modelsTabPage = new ModelsTabPage();
