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
    // Build a unique selector that won't exist if nav item is not present
    // This allows .should('not.exist') to work properly
    const selector = `[data-nav-item="${args.name}-${args.rootSection || ''}-${
      args.subSection || ''
    }"]`;

    // First check if the nav item exists by trying to find it
    return cy.get('body').then(($body) => {
      // Try to find sidebar first
      const $sidebar = $body.find('#page-sidebar');
      if ($sidebar.length === 0) {
        // No sidebar - return a selector that definitely won't exist
        return cy.get(selector, { timeout: 0 });
      }

      // Sidebar exists - use findAppNavItem
      return this.findSideBar().findAppNavItem(args);
    });
  }
}

export const appChrome = new AppChrome();
