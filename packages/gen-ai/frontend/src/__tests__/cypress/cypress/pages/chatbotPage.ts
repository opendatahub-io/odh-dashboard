import { TableRow } from './components/table';

class ChatbotMCPServerRow extends TableRow {
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

class ChatbotPage {
  visit(namespace?: string): void {
    cy.visit(namespace ? `/gen-ai-studio/playground/${namespace}` : '/gen-ai-studio/playground');
    this.waitForPageLoad();
  }

  private waitForPageLoad(): void {
    cy.findByTestId('page-title', { timeout: 30000 })
      .should('be.visible')
      .and('contain.text', 'Playground');
  }

  verifyOnChatbotPage(expectedNamespace?: string): void {
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

  getCheckedServer(): Cypress.Chainable<string> {
    return this.findCheckedCheckboxes()
      .should('have.length', 1)
      .closest('tr')
      .within(() => cy.get('td').eq(1))
      .invoke('text')
      .then((text) => {
        const name = text.trim();
        return cy.wrap(name).should('not.be.empty');
      });
  }

  getServerRow(serverName: string, serverUrl: string): ChatbotMCPServerRow {
    const rowSelector = () =>
      this.findMCPPanel().contains('tr', serverName) as unknown as Cypress.Chainable<
        JQuery<HTMLTableRowElement>
      >;
    return new ChatbotMCPServerRow(rowSelector, serverName, serverUrl);
  }

  findConfigureModal(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('dialog');
  }

  hasConfigureModal(): Cypress.Chainable<boolean> {
    return cy.findByRole('dialog').then(($dialog) => cy.wrap($dialog.length > 0));
  }

  verifyOnlyOneServerChecked(): void {
    this.findCheckedCheckboxes().should('have.length', 1);
  }

  findCheckedServersCount(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findCheckedCheckboxes();
  }
}

export const chatbotPage = new ChatbotPage();
