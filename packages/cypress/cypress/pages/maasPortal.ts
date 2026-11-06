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
        this.findNavigation().should('be.visible');
      },
      {
        validate: () => {
          cy.visit(url);
          this.findNavigation().should('be.visible');
        },
      },
    );

    cy.visit(url);
    this.findNavigation().should('be.visible');
  }

  findNavigation(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('navigation', { name: 'Navigation' });
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

  logout(): void {
    cy.findByRole('button', { name: 'User menu' }).click();
    cy.findByRole('menuitem', { name: 'Log out' }).click();
    cy.url({ timeout: 30000 }).should('match', /logout_response|oauth2\/sign_out|maas-portal/);
  }

  logoutAndLogin(url: string, credentials: UserAuthConfig): void {
    this.logout();
    this.visitWithLogin(url, credentials);
  }

  reload(): void {
    cy.reload();
    this.findNavigation().should('be.visible');
  }

  openModelEndpointDetailsAt(index: number): void {
    cy.findByTestId('ai-models-table')
      .find('tr:has(td)')
      .eq(index)
      .findByTestId('endpoint-view-button')
      .click();
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
    cy.get('[data-testid="ai-models-table"], [data-testid="maas-models-error"]', {
      timeout: 30000,
    })
      .first()
      .then(($content) => {
        if ($content.is('[data-testid="maas-models-error"]')) {
          cy.findByTestId('maas-models-retry').click();
        }
      });

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
