import { appChrome } from './appChrome';

class CommunityPlugins {
  visit(wait = true) {
    cy.visitWithLogin('/settings/community-plugins');
    if (wait) {
      this.wait();
    }
  }

  private wait() {
    this.findPageTitle().should('contain.text', 'Community plugins');
    cy.testA11y();
  }

  findNavItem() {
    return appChrome.findNavItem({ name: 'Community plugins', rootSection: 'Settings' });
  }

  findPage() {
    return cy.findByTestId('community-plugins-page');
  }

  findPageTitle() {
    return cy.findByTestId('app-page-title');
  }
}

export const communityPlugins = new CommunityPlugins();
