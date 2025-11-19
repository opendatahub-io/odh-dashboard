import { TableRow } from '~/__tests__/cypress/cypress/pages/components/table';
import { AIAssetsTabBase } from './baseTab';

class MCPServerRow extends TableRow {
  constructor(
    parentSelector: () => Cypress.Chainable<JQuery<HTMLTableRowElement>>,
    private serverName: string,
  ) {
    super(parentSelector);
  }

  findStatusBadge(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId('mcp-server-status-badge');
  }

  waitForStatusLoad(): void {
    this.find()
      .find('td', { timeout: 15000 })
      .invoke('text')
      .should('not.match', /Loading/i);
  }

  verifyStatus(expectedStatus?: string): void {
    const badge = this.findStatusBadge().should('exist');

    if (!expectedStatus) {
      badge.invoke('text');
      return;
    }

    badge
      .should('be.visible')
      .invoke('text')
      .then((text) => {
        const badgeText = text.trim().toLowerCase();
        const expectedLower = expectedStatus.toLowerCase().split(' ')[0];

        if (!badgeText.includes(expectedLower)) {
          throw new Error(`Expected "${expectedStatus}", found: "${text.trim()}"`);
        }
      });
  }
}

class MCPServersTab extends AIAssetsTabBase {
  protected tableTestId = 'mcp-servers-table';

  findServerRow(serverName: string): MCPServerRow {
    return new MCPServerRow(
      () =>
        this.findTable()
          .find('tbody tr')
          .filter((_, row) => Cypress.$(row).text().includes(serverName))
          .first() as unknown as Cypress.Chainable<JQuery<HTMLTableRowElement>>,
      serverName,
    );
  }

  findPlaygroundActionButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('try-in-playground-button');
  }
}

export const mcpServersTab = new MCPServersTab();
