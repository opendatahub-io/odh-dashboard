class AppChrome {
  visit(featureFlags?: string[]): void {
    const flags = featureFlags || ['genAiStudio'];
    const flagsParam = flags.map((f) => `${encodeURIComponent(f)}=true`).join('&');
    const url = flagsParam ? `/?devFeatureFlags=${flagsParam}` : '/';
    cy.visit(url);
    this.waitForPageLoad();
  }

  visitWithoutFlags(): void {
    cy.visit('/');
    this.waitForPageLoad();
  }

  waitForPageLoad(): void {
    cy.document().should('exist');
    cy.get('body', { timeout: 15000 }).should('be.visible');
  }

  findGenAiStudioNav(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('nav-gen-ai-v3', { timeout: 15000 });
  }

  verifyGenAiStudioVisible(): void {
    this.findGenAiStudioNav().should('exist');
  }

  navigateToPath(path: string): void {
    cy.visit(path);
    this.waitForPageLoad();
  }

  verifyPathname(expectedPath: string | string[]): void {
    const paths = Array.isArray(expectedPath) ? expectedPath : [expectedPath];
    cy.location('pathname').should((pathname) => {
      expect(paths).to.include(pathname);
    });
  }

  verifyPathnameContains(pathPart: string): void {
    cy.location('pathname').should('include', pathPart);
  }

  verifyPathnameExists(): void {
    cy.location('pathname').should('exist');
  }
}

export const appChrome = new AppChrome();
