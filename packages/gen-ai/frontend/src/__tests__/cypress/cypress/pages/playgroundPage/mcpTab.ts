import { TableRow } from '~/__tests__/cypress/cypress/pages/components/table';

class PlaygroundMCPServerRow extends TableRow {
  constructor(
    parentSelector: () => Cypress.Chainable<JQuery<HTMLTableRowElement>>,
    private serverName: string,
    private serverId: string,
  ) {
    super(parentSelector);
  }

  findConfigureButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId(`mcp-server-configure-button-${this.serverId}`);
  }

  findToolsButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.find().findByTestId(`mcp-server-tools-button-${this.serverId}`);
  }

  isChecked(): Cypress.Chainable<boolean> {
    return this.findCheckbox().then(($cb) => cy.wrap($cb.is(':checked')));
  }
}

class MCPTab {
  findMCPTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('chatbot-settings-page-tab-mcp');
  }

  clickMCPTab(): void {
    this.findMCPTab().click();
  }

  // The Manual Connection section table
  findMCPServersTable(
    options?: Partial<Cypress.Loggable & Cypress.Timeoutable>,
  ): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-manual-servers-table', options);
  }

  // The Registered section table
  findMCPRegisteredServersTable(
    options?: Partial<Cypress.Loggable & Cypress.Timeoutable>,
  ): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-registered-servers-table', options);
  }

  openMCPTab(): void {
    // Click the MCP tab to show the servers table
    this.clickMCPTab();
    this.verifyMCPTabVisible();
  }

  verifyMCPTabVisible(): void {
    // Check for either the servers table or the manual connection section
    cy.findByTestId('mcp-manual-section', { timeout: 30000 }).should('exist');
  }

  // Registered section
  findRegisteredSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-registered-section');
  }

  findRegisteredToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-registered-toggle');
  }

  findRegisteredCountBadge(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-registered-count-badge');
  }

  findRegisteredKebab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-registered-kebab');
  }

  findManageServersLink(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-manage-servers-link');
  }

  // Manual Connection section
  findManualSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-manual-section');
  }

  findManualToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-manual-toggle');
  }

  findManualEmptyState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-manual-empty-state');
  }

  private findCheckedCheckboxes(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findMCPServersTable().within(() => cy.get('input[type="checkbox"]:checked'));
  }

  getServerRow(serverName: string, serverUrl: string): PlaygroundMCPServerRow {
    const rowSelector = () =>
      this.findMCPServersTable().contains('tr', serverName) as unknown as Cypress.Chainable<
        JQuery<HTMLTableRowElement>
      >;
    return new PlaygroundMCPServerRow(rowSelector, serverName, serverUrl);
  }

  verifyServerAutoUnlocked(serverName: string, serverUrl: string): void {
    const serverRow = this.getServerRow(serverName, serverUrl);

    // Verify server is checked
    serverRow.isChecked().should('be.true');

    // Verify tools button is enabled (indicates unlock)
    serverRow.findToolsButton().should('exist').should('not.have.attr', 'aria-disabled');
  }

  verifyNoModalShown(): void {
    // Verify no dialog/modal is present
    cy.findByRole('dialog').should('not.exist');
  }

  findSuccessModal(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('dialog', { name: /connection successful/i, timeout: 15000 });
  }

  findSuccessModalHeading(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('heading', { name: /connection successful/i, timeout: 15000 });
  }

  findModalCloseButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    // Scope to success modal to avoid clicking drawer close button
    return cy
      .findByTestId('mcp-server-success-modal')
      .findByRole('button', { name: /^close$/i, timeout: 10000 });
  }

  verifySuccessModalVisible(): void {
    this.findSuccessModal().should('exist').and('be.visible');
    this.findSuccessModalHeading().should('exist').and('be.visible');
  }

  verifySuccessModalContainsServerName(serverName: string): void {
    this.findSuccessModal().should('contain.text', serverName);
  }

  closeSuccessModal(): void {
    this.findModalCloseButton().click();
  }
}

export const mcpTab = new MCPTab();
