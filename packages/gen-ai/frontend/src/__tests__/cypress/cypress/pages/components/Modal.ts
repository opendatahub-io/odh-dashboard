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
    return cy.get('[role="dialog"]');
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
  constructor() {
    super();
  }

  findTokenInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find()
      .find('input[type="text"], input[type="password"], textarea')
      .filter((_, el) => {
        const $el = Cypress.$(el);
        const id = ($el.attr('id') || '').toLowerCase();
        const name = ($el.attr('name') || '').toLowerCase();
        const placeholder = ($el.attr('placeholder') || '').toLowerCase();
        const label = $el.closest('div').find('label').text().toLowerCase();
        return (
          id.includes('token') ||
          name.includes('token') ||
          placeholder.includes('token') ||
          label.includes('token')
        );
      })
      .first();
  }

  findSubmitButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    // Try to find either "Authorize" or "Configure" button
    return this.find().then(($modal) => {
      const $authorize = $modal.find('button').filter((_, el) => {
        const text = Cypress.$(el).text().trim();
        return /^(Authorize|Configure)$/i.test(text);
      });
      if ($authorize.length > 0) {
        return cy.wrap($authorize.first());
      }
      // Fallback to primary button
      return cy.wrap($modal.find('button.pf-m-primary').first());
    });
  }

  enterToken(token: string): void {
    this.findTokenInput().clear().type(token, { delay: 5 });
  }

  submit(): void {
    cy.log('Submitting authorization...');
    this.findSubmitButton().should('be.visible').click({ force: true });
    cy.log('Authorization button clicked, waiting for modal to close...');
  }

  waitForClose(): void {
    cy.log('Waiting for authorization modal to close (timeout: 60s)...');
    cy.get('[role="dialog"]', { timeout: 60000 }).should('not.exist');
    cy.log('✅ Authorization modal closed successfully');
  }
}

export class MCPToolsModal extends Modal {
  constructor() {
    super();
  }

  waitForContentReady(): void {
    // Wait for either the table to appear or an error/empty state message
    // This handles both loading completion and error states
    this.find().within(() => {
      cy.get(
        '[data-testid="mcp-tools-modal-table"], table, [role="table"], [role="grid"], .pf-v6-c-alert, [class*="pf-v6-u-text-align-center"]',
        { timeout: 30000 },
      ).should('exist');
    });
  }

  findTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    // Wait for content to be ready first
    this.waitForContentReady();
    // Use data-testid for more reliable selection, with fallbacks
    return this.find().find(
      '[data-testid="mcp-tools-modal-table"], table, [role="table"], [role="grid"]',
    );
  }

  findToolRows(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findTable().find('tbody tr, [role="row"]');
  }

  verifyHasTools(): void {
    this.findToolRows().should('have.length.at.least', 1);
  }

  verifyFirstToolHasName(): void {
    this.findToolRows()
      .first()
      .within(() => {
        cy.get('td, [role="cell"]')
          .should('exist')
          .first()
          .invoke('text')
          .then((text) => {
            expect(text.trim()).to.not.be.empty; // eslint-disable-line @typescript-eslint/no-unused-expressions
          });
      });
  }

  verifyTableHeaders(): void {
    this.find()
      .contains(/name|tool|function|description/i)
      .should('be.visible');
  }
}

export class ConfigurePlaygroundModal extends Modal {
  constructor() {
    super();
  }

  findConfigureButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByRole('button', { name: /^Configure$/i });
  }

  findGoToPlaygroundLink(): Cypress.Chainable<JQuery<HTMLAnchorElement>> {
    return cy.contains('a', /^Go to playground$/i);
  }

  configure(): void {
    this.findConfigureButton().should('be.visible').click({ force: true });
    this.findGoToPlaygroundLink().should('be.visible', { timeout: 180000 }).click();
  }
}
