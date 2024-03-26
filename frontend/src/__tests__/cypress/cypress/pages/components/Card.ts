export class Card {
  constructor(private title: string) {}

  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(`card ${this.title}`);
  }

  findBrandImage(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find()
      .findByTestId('brand-image')
      .then(() => {
        cy.get('img');
      });
  }

  findCardTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('cardtitle');
  }

  findPartnerBadge(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('partner-badge');
  }

  findPartnerBadgeDescription(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('badge-description');
  }
}
