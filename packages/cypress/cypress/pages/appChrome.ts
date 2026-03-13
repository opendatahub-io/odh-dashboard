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
    // Use timeout: 0 to immediately check if sidebar exists without waiting
    // This allows .should('not.exist') to work when sidebar/nav items don't exist
    return cy.get('body').then(($body) => {
      const hasSidebar = $body.find('#page-sidebar').length > 0;
      if (!hasSidebar) {
        // No sidebar, return empty result for .should('not.exist') assertions
        return cy.wrap(Cypress.$(), { log: false });
      }
      // Sidebar exists, find the nav item
      return cy.get('#page-sidebar', { log: false }).findAppNavItem(args);
    });
  }
}

export const appChrome = new AppChrome();
