import { mockDashboardConfig } from '#~/__mocks__';
import { HomeModelCatalog } from '#~/__tests__/cypress/cypress/pages/home/homeModelCatalog';
import { HomeAdminSection } from './homeAdmin';
import { HomeProject } from './homeProject';
import { HomeResource } from './homeResource';

class HomePage {
  visit(wait = true) {
    cy.visitWithLogin('/');
    if (wait) {
      this.wait();
    }
  }

  private wait() {
    cy.findByTestId('home-page').should('be.visible');
    cy.testA11y();
  }

  findAppPageTitle() {
    return cy.findByTestId('app-page-title');
  }

  initHomeIntercepts(config: Parameters<typeof mockDashboardConfig>[0] = {}) {
    cy.interceptOdh('GET /api/config', mockDashboardConfig(config));
  }

  getHomeAdminSection() {
    return new HomeAdminSection(() => cy.findByTestId('landing-page-admin'));
  }

  getHomeModelCatalogSection() {
    return new HomeModelCatalog(() => cy.findByTestId('homepage-ai-hub-catalog'));
  }

  getHomeProjectSection() {
    return new HomeProject(() => cy.findByTestId('landing-page-projects'));
  }

  getHomeResourceSection() {
    return new HomeResource(() => cy.findByTestId('landing-page-learning-resources'));
  }

  returnToHome() {
    cy.go('back');
  }
}

export const homePage = new HomePage();
