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

  findCardProvider(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('cardprovider');
  }

  findCardBody(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('cardbody');
  }

  findApplicationLink(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('jupyter-app-link');
  }

  findExploreCard(metadataName: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(['card', metadataName]);
  }

  findWarningAlert(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('warning-message-alert');
  }
}
