import { appChrome } from './appChrome';
import { TableRow } from './components/table';
import Chainable = Cypress.Chainable;

export class AboutDialog {
  show(wait = true): void {
    appChrome.findHelpButton().click();
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

  findImageByAltText(altText: string): Chainable<JQuery<HTMLElement>> {
    return cy.get(`img[alt*="${altText}"]`);
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

  getComponentReleasesText(name: string): Cypress.Chainable<string[]> {
    return this.findTable().then(($table) => {
      // Find all rows that match the component name
      const $matchingRows = $table.find('tr').filter((_, row) => {
        const rowText = Cypress.$(row).find('td').text().toLowerCase();
        return rowText.includes(name.toLowerCase());
      });

      // If no matching rows, return empty array
      if (!$matchingRows.length) {
        return cy.wrap([] as string[]);
      }

      // Collect text from all matching rows (handles components with multiple sub-components)
      const texts: string[] = [];
      $matchingRows.each((_, row) => {
        Cypress.$(row)
          .find('td')
          .each((__, cell) => {
            texts.push((cell as HTMLElement).innerText);
          });
      });
      return cy.wrap(texts);
    });
  }

  isAdminAccessLevel(): Chainable<JQuery<HTMLElement>> {
    return this.findAccessLevel().should('contain.text', 'Administrator');
  }

  isUserAccessLevel(): Chainable<JQuery<HTMLElement>> {
    return this.findAccessLevel().should('contain.text', 'Non-administrator');
  }
}

export const aboutDialog = new AboutDialog();
