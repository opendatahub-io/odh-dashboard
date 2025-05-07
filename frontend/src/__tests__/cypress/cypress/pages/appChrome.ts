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

  getApplicationLauncher() {
    return new ApplicationLauncher(() => cy.findByTestId('application-launcher'));
  }

  findNavSection(name: string) {
    return this.findSideBar().findByRole('button', { name });
  }

  findNavItem(name: string, section?: string) {
    if (section) {
      this.findNavSection(section)
        .should('exist')
        .then(($el) => {
          if ($el.attr('aria-expanded') === 'false') {
            cy.wrap($el).click();
            // Wait for the section to expand and animation to complete
            cy.wrap($el).should('have.attr', 'aria-expanded', 'true');
            // Additional wait for any animations
          }
        });
    }
    return this.findSideBar().findByRole('link', { name }).should('exist').should('be.visible');
  }
}

export const appChrome = new AppChrome();
