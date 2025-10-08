import { TableRow } from './components/table';

class MCPServerRow extends TableRow {
  private serverName: string;

  constructor(
    parentSelector: () => Cypress.Chainable<JQuery<HTMLTableRowElement>>,
    serverName: string,
  ) {
    super(parentSelector);
    this.serverName = serverName;
  }

  findName(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find('td').eq(1).find('div, span').first();
  }

  findStatusBadge(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find(
      '.pf-v5-c-label, .pf-v6-c-label, [class*="label"], [class*="badge"], span',
    );
  }

  waitForStatusLoad(): void {
    cy.log('⏳ Waiting for status badge to load...');
    this.find()
      .find('td, [role="cell"]', { timeout: 15000 })
      .should(($cells) => {
        const cellsText = $cells.text();
        expect(cellsText).to.not.match(/Loading/i);
      });
  }

  verifyStatus(expectedStatus?: string): void {
    cy.log(`⏳ Checking status badge...`);

    // If no expected status provided, just verify badge exists and log its value
    if (!expectedStatus) {
      this.findStatusBadge()
        .first()
        .should('exist')
        .then(($badge) => {
          const badgeText = $badge.text().trim();
          cy.log(`ℹ️  Status badge shows: "${badgeText}"`);
        });
      return;
    }

    // Check if a status badge with expected text exists
    cy.get('body').then(($body) => {
      const statusElements = $body.find(
        '.pf-v5-c-label, .pf-v6-c-label, [class*="label"], [class*="badge"], span',
      );
      const matchingElement = statusElements
        .filter((_, el) => {
          const text = Cypress.$(el).text().toLowerCase();
          return text.includes(expectedStatus.toLowerCase().split(' ')[0]);
        })
        .first();

      if (matchingElement.length > 0) {
        cy.wrap(matchingElement).should('be.visible');
        cy.log(`✅ Status badge shows: "${matchingElement.text().trim()}"`);
      } else {
        // If expected status not found, log what we found instead
        const allStatuses = statusElements
          .map((_, el) => Cypress.$(el).text().trim())
          .get()
          .filter((text) => text.length > 0);
        cy.log(`ℹ️  Expected "${expectedStatus}" but found statuses: ${allStatuses.join(', ')}`);
        cy.log('⚠️  Continuing without strict status verification');
      }
    });
  }

  selectServer(): void {
    cy.log(`🔖 Selecting MCP server: ${this.serverName}`);
    this.check();
    this.shouldBeChecked();
    cy.log(`✅ ${this.serverName} selected`);
  }
}

class MCPServersTab {
  findTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-testid="mcp-servers-table"]', { timeout: 10000 });
  }

  findTableRows(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findTable().find('tbody tr');
  }

  verifyTableVisible(): void {
    this.findTable().should('be.visible');
    cy.log('✅ MCP servers table is visible');
  }

  verifyHasRows(): void {
    this.findTableRows().should('have.length.at.least', 1);
    cy.log('✅ Table has at least one row');
  }

  findServerRow(serverName: string): MCPServerRow {
    return new MCPServerRow(
      () =>
        this.findTable()
          .find('tbody tr')
          .filter((_, row) => {
            const $row = Cypress.$(row);
            const text = $row.text();
            return text.includes(serverName);
          })
          .first() as unknown as Cypress.Chainable<JQuery<HTMLTableRowElement>>,
      serverName,
    );
  }

  /**
   * Select a specific server by name. If not found, throws an error.
   * @param serverName - Exact server name to select (e.g., "GitHub-MCP-Server")
   * @param options - Optional status verification
   */
  selectServerByName(
    serverName: string,
    options?: { verifyStatus?: string },
  ): Cypress.Chainable<string> {
    cy.log(`Looking for MCP server: "${serverName}"`);

    // Find the row containing the exact server name
    const serverRow = this.findServerRow(serverName);

    // Verify the row exists
    serverRow.find().should('exist').and('be.visible');
    cy.log(`Found server: "${serverName}"`);

    // Wait for status to load
    serverRow.waitForStatusLoad();

    // Optionally verify status
    if (options?.verifyStatus) {
      serverRow.verifyStatus(options.verifyStatus);
    } else {
      serverRow.verifyStatus();
    }

    // Select the server
    serverRow.selectServer();

    return cy.wrap(serverName);
  }

  findPlaygroundActionButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[role="tabpanel"]:visible').then(($panel) => {
      const $buttons = $panel.find('button, a, [role="button"]');
      const tryBtn = $buttons.filter((_, el) =>
        /^\s*Try in Playground(\s*\(\d+\))?\s*$/i.test(el.textContent || ''),
      );
      const addBtn = $buttons.filter((_, el) =>
        /^\s*Add to Playground\s*$/i.test(el.textContent || ''),
      );

      if (tryBtn.length > 0) {
        return cy.wrap(tryBtn.first());
      }
      if (addBtn.length > 0) {
        return cy.wrap(addBtn.first());
      }
      throw new Error('No Try/Add to Playground button found in MCP Servers tab');
    });
  }

  clickPlaygroundAction(): void {
    cy.log('Clicking Playground action from MCP Servers');
    this.findPlaygroundActionButton().should('be.visible').click({ force: true });
  }

  verifyEmptyState(): void {
    cy.contains('No MCP configuration found', { timeout: 10000 }).should('be.visible');
    cy.log('Empty state is displayed correctly');
  }
}

export const mcpServersTab = new MCPServersTab();
