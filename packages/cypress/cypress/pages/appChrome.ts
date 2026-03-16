import { ApplicationLauncher } from './appLauncher';

class AppChrome {
  visit() {
    cy.visitWithLogin('/');
    this.wait();
  }

  private wait() {
    cy.get('#dashboard-page-main');
    cy.testA11y();
  }

  shouldBeUnauthorized() {
    cy.findByTestId('unauthorized-error');
    return this;
  }

  findNavToggle() {
    return cy.get('#page-nav-toggle');
  }

  findSideBar() {
    return cy.get('#page-sidebar');
  }

  findMainContent() {
    return cy.get('#dashboard-page-main');
  }

  findHelpButton() {
    return cy.get('#help-icon-toggle');
  }

  getApplicationLauncher() {
    return new ApplicationLauncher(() => cy.findByTestId('application-launcher'));
  }

  findNavSection(name: string) {
    return this.findSideBar().findByRole('button', { name });
  }

  findNavItem(args: { name: string; rootSection?: string; subSection?: string }) {
    return cy.get('body', { timeout: 0 }).then(($body) => {
      const $sidebar = $body.find('#page-sidebar');
      if ($sidebar.length === 0) {
        return cy.wrap(Cypress.$()) as unknown as Cypress.Chainable<JQuery>;
      }
      return cy.wrap($sidebar).findAppNavItem(args);
    });
  }
}

export const appChrome = new AppChrome();
