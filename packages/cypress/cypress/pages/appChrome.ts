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
    // Get sidebar element without waiting (synchronous check)
    // This allows .should('not.exist') assertions to work when sidebar or nav items don't exist
    return cy.document().then((doc) => {
      const $sidebar = Cypress.$(doc).find('#page-sidebar');
      if ($sidebar.length === 0) {
        // Sidebar doesn't exist, return empty jQuery object
        return cy.wrap(Cypress.$());
      }
      // Sidebar exists, find the nav item within it
      return cy.wrap($sidebar).findAppNavItem(args);
    });
  }
}

export const appChrome = new AppChrome();
