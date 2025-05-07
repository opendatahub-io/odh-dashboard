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
    return this.findSideBar().findAppNavItem(name, section);
  }
}

export const appChrome = new AppChrome();
