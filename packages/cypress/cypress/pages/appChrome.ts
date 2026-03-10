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
    // Use get('body').find() instead of cy.get() to avoid timeout errors
    // when sidebar doesn't exist (e.g., on 404 pages for unauthorized users)
    return cy.get('body').find('#page-sidebar');
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
    // For safety, wrap the entire operation and handle cases where elements don't exist
    return cy.get('body').then(($body) => {
      const $sidebar = $body.find('#page-sidebar');

      // If no sidebar at all, return empty (handles pages without sidebar)
      if ($sidebar.length === 0) {
        return cy.wrap(Cypress.$());
      }

      // If no rootSection specified, try to find the item directly in the sidebar
      if (!args.rootSection) {
        return cy.wrap($sidebar).findAppNavItem(args);
      }

      // Check if the root section exists before trying to use findAppNavItem
      const rootSectionElements = $sidebar.find('.pf-v6-c-nav__link, .pf-v6-c-nav__item');
      const hasRootSection = Array.from(rootSectionElements).some(
        (el) => Cypress.$(el).text().trim() === args.rootSection,
      );

      // If root section doesn't exist, return empty (handles non-admin users)
      if (!hasRootSection) {
        return cy.wrap(Cypress.$());
      }

      // Root section exists, use the custom command to find the nav item
      return cy.wrap($sidebar).findAppNavItem(args);
    });
  }
}

export const appChrome = new AppChrome();
