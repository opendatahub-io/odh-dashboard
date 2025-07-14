import { Card } from '#~/__tests__/cypress/cypress/pages/components/Card';

export class JupyterCard extends Card {
  constructor() {
    super('jupyter');
  }

  findTooltipInfo(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find()
      .findByTestId('tooltip-img')
      .trigger('mouseenter')
      .then(() => {
        cy.findByText(`${Cypress.env('ODH_PRODUCT_NAME')} certified and supported`);
      });
  }

  findDrawerPanel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('explore-drawer-panel').then(() => {
      cy.get('h2').findByText('Start basic workbench');
    });
  }
}

export const jupyterCard = new JupyterCard();
