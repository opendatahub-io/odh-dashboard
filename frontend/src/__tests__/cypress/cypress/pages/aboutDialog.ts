import { TableRow } from './components/table';
import Chainable = Cypress.Chainable;

export class AboutDialog {
  show(wait = true): void {
    cy.get('#help-icon-toggle').click();
    cy.findByTestId('help-about-item').click();
    if (wait) {
      this.wait();
    }
  }

  private wait() {
    cy.findByTestId('home-page').should('be.visible');
    cy.testA11y();
  }

  findText(): Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('about-text');
  }

  findProductName(): Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('about-product-name');
  }

  findProductVersion(): Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('about-version');
  }

  findChannel(): Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('about-channel');
  }

  findAccessLevel(): Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('about-access-level');
  }

  findLastUpdate(): Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('about-last-update');
  }

  findTable(): Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('component-releases-table');
  }

  getComponentReleasesRow(name: string): TableRow {
    return new TableRow(() =>
      this.findTable().findAllByTestId('table-row-data').contains(name).parents('tr'),
    );
  }

  isAdminAccessLevel(): Chainable<JQuery<HTMLElement>> {
    return this.findAccessLevel().should('contain.text', 'Administrator');
  }

  isUserAccessLevel(): Chainable<JQuery<HTMLElement>> {
    return this.findAccessLevel().should('contain.text', 'Non-administrator');
  }
}

export const aboutDialog = new AboutDialog();
