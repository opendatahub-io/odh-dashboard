export class K8sNameDescriptionField {
  constructor(private compTestId: string) {}

  private findByScopedTestId(suffix: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`${this.compTestId}-${suffix}`);
  }

  findDisplayNameInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findByScopedTestId('name');
  }

  findDescriptionInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findByScopedTestId('description');
  }

  findResourceEditLink(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findByScopedTestId('editResourceLink');
  }

  findResourceNameInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findByScopedTestId('resourceName');
  }
}
