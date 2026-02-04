class AppChrome {
  visit(featureFlags?: string[]): void {
    const flags = featureFlags || ['genAiStudio'];
    const flagsParam = flags.map((f) => `${f}=true`).join(',');
    const url = flagsParam ? `/?devFeatureFlags=${flagsParam}` : '/';
    cy.visit(url);
    this.waitForPageLoad();
  }

  waitForPageLoad(): void {
    cy.document().should('exist');
    cy.get('body', { timeout: 15000 }).should('be.visible');
  }
}

export const appChrome = new AppChrome();
