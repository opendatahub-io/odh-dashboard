import type { ByRoleOptions } from '@testing-library/react';

export class Modal {
  constructor(private title?: ByRoleOptions['name']) {}

  shouldBeOpen(open = true): void {
    if (open) {
      this.find();
    } else {
      this.find().should('not.exist');
    }
  }

  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    if (this.title) {
      return cy.findByRole('dialog', { name: this.title });
    }
    return cy.findByRole('dialog');
  }

  findCloseButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('button', { name: 'Close' });
  }

  findCancelButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('button', { name: 'Cancel' });
  }

  findFooter(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('footer');
  }
}

export class TokenAuthModal extends Modal {
  findTokenInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-server-token-input');
  }

  findSubmitButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-server-token-submit-button');
  }

  findCancelButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-server-token-cancel-button');
  }

  findClearButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('button', { name: /Clear/i });
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
      .contains(/name|tool|function|description/i)
      .should('be.visible');
  }
}

export class ConfigurePlaygroundModal extends Modal {
  findConfigureButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('button', { name: /^Configure$/i });
  }

  findGoToPlaygroundLink(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('go-to-playground-link');
  }
}
