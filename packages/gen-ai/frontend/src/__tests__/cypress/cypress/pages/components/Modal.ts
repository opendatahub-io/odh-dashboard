export class Modal {
  constructor(private testId?: string) {}

  shouldBeOpen(open = true): void {
    if (open) {
      this.find();
    } else {
      this.find().should('not.exist');
    }
  }

  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    if (this.testId) {
      return cy.findByTestId(this.testId);
    }
    return cy.findByRole('dialog');
  }

  findCloseButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('button', { name: 'Close' });
  }
}

export class TokenAuthModal extends Modal {
  constructor() {
    super('mcp-token-auth-modal');
  }

  findTokenInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-token-input');
  }

  findSubmitButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-token-authorize-button');
  }

  findCancelButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-token-cancel-button');
  }
}

export class MCPToolsModal extends Modal {
  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-tools-modal');
  }

  findTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-tools-modal-table', { timeout: 30000 });
  }

  findToolRows(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findTable().find('tbody tr');
  }

  verifyHasTools(): void {
    this.findToolRows().should('have.length.at.least', 1);
  }

  verifyFirstToolHasName(): void {
    this.findToolRows().first().find('td').first().invoke('text').should('not.be.empty');
  }

  verifyTableHeaders(): void {
    this.find()
      .contains(/Name and Permissions|Description/i)
      .should('be.visible');
  }
}

export class MCPServerSuccessModal extends Modal {
  constructor() {
    super('mcp-server-success-modal');
  }

  findHeading(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('heading', { name: /Connection successful/i });
  }

  findSaveButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('modal-submit-button');
  }
}
