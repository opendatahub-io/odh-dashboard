import { appChrome } from '#~/__tests__/cypress/cypress/pages/appChrome';

class NavSidebar {
  visit() {
    cy.visitWithLogin(`/`);
  }

  findNavSection(name: string) {
    return appChrome.findNavSection(name);
  }

  findNavItem(args: { name: string; rootSection?: string; subSection?: string }) {
    return appChrome.findNavItem(args);
  }
}

export const navSidebar = new NavSidebar();
