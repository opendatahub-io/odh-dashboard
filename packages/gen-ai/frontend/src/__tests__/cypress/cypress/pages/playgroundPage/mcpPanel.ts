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

class MCPPanel {
  findMCPPanel(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-servers-panel-table');
  }

  expandMCPPanelIfNeeded(): void {
    this.findMCPPanel().should('exist', { timeout: 30000 }).and('be.visible');
  }

  verifyMCPPanelVisible(): void {
    this.findMCPPanel().should('be.visible', { timeout: 30000 });
  }

  private findCheckedCheckboxes(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findMCPPanel().within(() => cy.get('input[type="checkbox"]:checked'));
  }

  getServerRow(serverName: string, serverUrl: string): PlaygroundMCPServerRow {
    const rowSelector = () =>
      this.findMCPPanel().contains('tr', serverName) as unknown as Cypress.Chainable<
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
    return cy.findByRole('dialog', { name: /connection successful/i });
  }

  findSuccessModalHeading(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('heading', { name: /connection successful/i });
  }

  findModalCloseButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('button', { name: /close/i });
  }

  verifySuccessModalVisible(): void {
    this.findSuccessModal().should('be.visible');
    this.findSuccessModalHeading().should('be.visible');
  }

  verifySuccessModalContainsServerName(serverName: string): void {
    this.findSuccessModal().should('contain.text', serverName);
  }

  closeSuccessModal(): void {
    this.findModalCloseButton().click();
  }
}

export const mcpPanel = new MCPPanel();
