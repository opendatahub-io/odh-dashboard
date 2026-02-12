import { Card } from './Card';

export class MLflowCard extends Card {
  constructor() {
    super('mlflow');
  }

  findApplicationLink(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mlflow-app-link');
  }

  findDrawerPanel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('explore-drawer-panel').then(() => {
      cy.get('h2').findByText('MLflow');
    });
  }
}

export const mlflowCard = new MLflowCard();
