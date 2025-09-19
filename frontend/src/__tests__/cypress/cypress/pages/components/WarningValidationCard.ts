import { Card } from '#~/__tests__/cypress/cypress/pages/components/Card';

export class WarningValidationCard extends Card {
  constructor() {
    super('warning-validation-test');
  }

  findDrawerPanel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('explore-drawer-panel').then(() => {
      cy.get('h2').findByText('Warning Validation Test');
    });
  }

  findEnableButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('enable-app');
  }

  findKeyInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByLabelText(/key/i);
  }

  findWarningAlert(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('warning-message-alert');
  }
}

export const warningValidationCard = new WarningValidationCard();
