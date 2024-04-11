import { ApplicationLauncher } from './appLauncher';

class AppChrome {
  visit() {
    cy.visit('/');
    this.wait();
  }

  private wait() {
    this.findSideBar();
    cy.testA11y();
  }

  findSideBar() {
    return cy.get('#page-sidebar');
  }

  getApplicationLauncher() {
    return new ApplicationLauncher(() => cy.findByTestId('application-launcher'));
  }

  findNavItem(name: string, section?: string) {
    if (section) {
      this.findSideBar()
        .findByRole('button', { name: section })
        .then(($el) => {
          if ($el.attr('aria-expanded') === 'false') {
            cy.wrap($el).click();
          }
        });
    }
    return this.findSideBar().findByRole('link', { name });
  }
}

export const appChrome = new AppChrome();
