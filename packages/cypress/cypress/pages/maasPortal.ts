import type { UserAuthConfig } from '../types';

class MaaSPortalPage {
  visitWithLogin(url: string, credentials: UserAuthConfig): void {
    cy.visitWithLogin(url, credentials);
  }

  loginWithCachedSession(url: string, credentials: UserAuthConfig): void {
    cy.session(
      ['maas-portal', credentials.USERNAME],
      () => {
        this.visitWithLogin(url, credentials);
        this.findNavigation({ timeout: 30000 }).should('be.visible');
      },
      {
        validate: () => {
          cy.visit(url);
          this.findNavigation({ timeout: 30000 }).should('be.visible');
        },
      },
    );

    cy.visit(url);
    this.findNavigation({ timeout: 30000 }).should('be.visible');
  }

  findNavigation(options?: Partial<Cypress.Timeoutable>): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('navigation', { name: 'Navigation', ...options });
  }

  findNavLink(name: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findNavigation().findByRole('link', { name });
  }

  findPageTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('app-page-title');
  }

  shouldShowPageTitle(title: string): void {
    this.findPageTitle().should('contain.text', title);
  }

  getCreatedModelId(): Cypress.Chainable<string> {
    return cy.get<string>('@createdModelId');
  }

  getStoredApiKey(): Cypress.Chainable<string> {
    return cy.get<string>('@storedApiKey', { log: false });
  }

  openModelEndpointDetailsFor(modelId: string): void {
    cy.findByTestId('ai-models-table')
      .find('tr:has(td)')
      .filter((_, row) => row.textContent.includes(modelId))
      .first()
      .findByTestId('endpoint-view-button')
      .click();
  }

  findModelEndpointsPage(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('maas-models-page');
  }

  ensureModelEndpointsLoaded(): void {
    cy.findByTestId('ai-models-table', { timeout: 30000 }).should('be.visible');
  }

  findEndpointDetailsModal(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('endpoint-detail-modal');
  }

  findEndpointUsageExampleCopyButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findEndpointDetailsModal().findByRole('button', { name: 'Copy usage example' });
  }
}

export const maasPortalPage = new MaaSPortalPage();
