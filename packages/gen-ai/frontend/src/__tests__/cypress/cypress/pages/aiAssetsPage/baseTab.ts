export abstract class AIAssetsTabBase {
  protected abstract tableTestId: string;

  findTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(this.tableTestId, { timeout: 10000 });
  }

  findTableRows(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findTable().find('tbody tr');
  }

  verifyTableVisible(): void {
    this.findTable().should('be.visible');
  }

  verifyHasRows(): void {
    this.findTableRows().should('have.length.at.least', 1);
  }

  verifyEmptyState(): void {
    cy.findByTestId('empty-state-message').should('exist').and('be.visible');
  }

  waitForTableLoad(): void {
    this.findTable().should('exist');
    cy.get('[data-testid="loading-spinner"]', { timeout: 15000 }).should('not.exist');
  }

  getRowCount(): Cypress.Chainable<number> {
    return this.findTableRows().its('length');
  }

  verifyTableHeaders(): void {
    this.findTable().find('thead').should('exist').and('be.visible');
  }
}
