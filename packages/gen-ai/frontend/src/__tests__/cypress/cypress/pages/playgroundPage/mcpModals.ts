/**
 * Page objects for MCP-specific modals in the playground
 *
 * NOTE: All methods return Cypress chainables only.
 * Actions (.click(), .type(), etc.) must be performed in tests, not in page objects.
 */

class MCPTokenAuthModal {
  private testId = 'mcp-token-auth-modal';

  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(this.testId);
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

class MCPServerSuccessModal {
  private testId = 'mcp-server-success-modal';

  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(this.testId);
  }

  findHeading(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('heading', { name: /Connection successful/i });
  }

  findSaveButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('modal-submit-button');
  }

  findEditToolsButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('button', { name: /Edit tool selection/i });
  }

  findToolCountText(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().contains(/\d+ out of \d+ tools are active\./);
  }
}

class MCPToolsModal {
  private testId = 'mcp-tools-modal';

  find(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId(this.testId);
  }

  findTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-tools-modal-table', { timeout: 30000 });
  }

  findToolRows(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findTable().find('tbody tr');
  }

  findSearchInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByPlaceholderText('Find by name');
  }

  findToolCountText(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-tools-selection-count');
  }

  findSelectAllCheckbox(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('thead input[type="checkbox"]');
  }

  findToolCheckbox(rowIndex: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findToolRows().eq(rowIndex).find('input[type="checkbox"]');
  }

  findSaveButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('button', { name: /save/i });
  }

  findCancelButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('button', { name: /cancel/i });
  }

  findCloseButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('button', { name: 'Close' });
  }
}

export const mcpTokenAuthModal = new MCPTokenAuthModal();
export const mcpServerSuccessModal = new MCPServerSuccessModal();
export const mcpToolsModal = new MCPToolsModal();
