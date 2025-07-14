import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';

class NavSidebar {
  visit() {
    cy.visitWithLogin(`/`);
  }

  findNavSection(name: string) {
    return appChrome.findNavSection(name);
  }

  findNavItem(name: string, section: string) {
    return appChrome.findNavItem(name, section);
  }
}

export const navSidebar = new NavSidebar();
