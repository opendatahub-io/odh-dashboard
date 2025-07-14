import { SubComponentBase } from '#~/__tests__/cypress/cypress/pages/components/subComponents/SubComponentBase';

export class K8sNameDescriptionField extends SubComponentBase {
  constructor(private compTestId: string, scopedBaseTestId?: string) {
    super(scopedBaseTestId);
  }

  private findByScopedTestId(suffix: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findScope().findByTestId(`${this.compTestId}-${suffix}`);
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
