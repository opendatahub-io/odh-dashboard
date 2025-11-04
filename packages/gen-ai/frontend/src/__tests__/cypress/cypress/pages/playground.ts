import { TableRow } from './components/table';

class PlaygroundMCPServerRow extends TableRow {
  private serverName: string;

  constructor(
    parentSelector: () => Cypress.Chainable<JQuery<HTMLTableRowElement>>,
    serverName: string,
  ) {
    super(parentSelector);
    this.serverName = serverName;
  }

  findConfigureButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find(`button[aria-label="Configure ${this.serverName}"]`);
  }

  findToolsButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().find(`button[aria-label="View tools for ${this.serverName}"]`);
  }

  isChecked(): Cypress.Chainable<boolean> {
    return this.findCheckbox().then(($cb) => $cb.is(':checked'));
  }

  clickConfigure(): void {
    cy.log(`Clicking Configure button for ${this.serverName}`);
    this.findConfigureButton().should('exist').should('be.visible').click({ force: true });
    cy.log(`Clicked Configure button for ${this.serverName}`);
  }

  clickTools(): void {
    cy.log(`Clicking View tools button for ${this.serverName}`);
    this.findToolsButton()
      .should('be.visible')
      .should('not.have.attr', 'aria-disabled', 'true')
      .click({ force: true });
    cy.log('Clicked View tools button');
  }

  verifyAuthenticated(): void {
    cy.log('Verifying authentication success...');
    // Wait for tools button to become enabled instead of fixed wait
    this.findToolsButton()
      .should('exist', { timeout: 30000 })
      .should('be.visible', { timeout: 30000 })
      .should(($btn) => {
        // Retry until aria-disabled !== 'true'
        const isDisabled = $btn.attr('aria-disabled') === 'true';
        expect(isDisabled).to.be.false; // eslint-disable-line @typescript-eslint/no-unused-expressions
      })
      .then(($btn) => {
        cy.log(`✅ Tools button is enabled (aria-disabled: ${$btn.attr('aria-disabled')})`);
      });
  }
}

class Playground {
  visit(namespace?: string): void {
    if (namespace) {
      cy.visit(`/gen-ai-studio/playground/${namespace}`);
    } else {
      cy.visit('/gen-ai-studio/playground');
    }
    this.waitForPageLoad();
  }

  private waitForPageLoad(): void {
    cy.contains('h1, h2, [role="heading"]', /Playground/i, { timeout: 30000 }).should('be.visible');
  }

  verifyOnPlaygroundPage(expectedNamespace?: string): void {
    if (expectedNamespace) {
      cy.location('pathname', { timeout: 60000 }).should((pathname) => {
        expect([
          `/gen-ai-studio/playground/${expectedNamespace}`,
          '/gen-ai-studio/playground',
        ]).to.include(pathname);
      });
    }
    this.waitForPageLoad();
  }

  findMCPPanel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-testid="mcp-servers-panel-table"]');
  }

  expandMCPPanelIfNeeded(): void {
    cy.log('Checking if MCP panel needs to be expanded...');
    cy.get('body').then(($body) => {
      const isVisible = $body.find('[data-testid="mcp-servers-panel-table"]').is(':visible');
      if (!isVisible) {
        cy.log('MCP panel not visible, attempting to expand...');
        cy.get('body').then(($b) => {
          const $mcpButton = $b
            .find('button, [role="button"], h2, [role="heading"]')
            .filter((_, el) => {
              const text = (el.textContent || '').toLowerCase();
              return text.includes('mcp') && text.includes('server');
            });
          if ($mcpButton.length > 0) {
            cy.wrap($mcpButton.first()).click({ force: true });
            // Wait deterministically for panel to become visible
            this.verifyMCPPanelVisible();
          }
        });
      }
    });
  }

  verifyMCPPanelVisible(): void {
    this.findMCPPanel().should('be.visible', { timeout: 20000 });
  }

  getCheckedServer(): Cypress.Chainable<string> {
    return this.findMCPPanel()
      .find('input[type="checkbox"]:checked')
      .should('have.length', 1)
      .closest('tr,[role="row"]')
      .then(($row) => {
        const configureBtn = $row.find('button[aria-label^="Configure "]').first();
        let serverName = '';

        if (configureBtn.length > 0) {
          const ariaLabel = configureBtn.attr('aria-label') || '';
          serverName = ariaLabel.replace(/^Configure\s+/, '').trim();
        }

        if (!serverName) {
          serverName = $row.find('[data-label="Name"]').first().text().trim();
        }

        cy.log(`Found checked server in Playground: ${serverName}`);
        expect(serverName).to.not.be.empty; // eslint-disable-line @typescript-eslint/no-unused-expressions
        return cy.wrap(serverName);
      });
  }

  getServerRow(serverName: string): PlaygroundMCPServerRow {
    return new PlaygroundMCPServerRow(
      () => this.findMCPPanel().contains('tr,[role="row"]', serverName),
      serverName,
    );
  }

  verifyServerChecked(serverName: string): void {
    this.getServerRow(serverName).shouldBeChecked();
  }

  findConfigureModal(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[role="dialog"]');
  }

  hasConfigureModal(): Cypress.Chainable<boolean> {
    return cy.get('body').then(($body) => {
      return cy.wrap($body.find('[role="dialog"]').length > 0);
    });
  }

  verifyOnlyOneServerChecked(): void {
    this.findMCPPanel().find('input[type="checkbox"]:checked').should('have.length', 1);
  }

  findCheckedServersCount(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findMCPPanel().find('input[type="checkbox"]:checked');
  }
}

export const playground = new Playground();
