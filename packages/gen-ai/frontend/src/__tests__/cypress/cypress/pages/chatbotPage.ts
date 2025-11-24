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

  // Chatbot Main UI Elements
  findChatbotHeader(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('page-title');
  }

  findChatbotPlayground(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('chatbot');
  }

  findMessageBar(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('chatbot-message-bar');
  }

  findMessageInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    // data-testid is directly on the textarea element
    return cy.findByTestId('chatbot-message-bar');
  }

  findSendButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    // PatternFly MessageBar component - Send button appears after typing
    // NOTE: Cannot add testID to external library component, using semantic role
    return cy.findByRole('button', { name: 'Send' });
  }

  findWelcomeMessage(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByText(/Welcome to the model playground/i);
  }

  findMessage(text: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByText(text);
  }

  findEmptyState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('empty-state');
  }

  findEmptyStateTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('empty-state').find('h1');
  }

  findEmptyStateMessage(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('empty-state-message');
  }

  findCreatePlaygroundButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('empty-state-action-button');
  }

  findEmptyStateActionButton(buttonText: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('button', { name: buttonText });
  }

  findInitializingState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByText(/Creating playground/i);
  }

  findFailedState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByText(/Playground creation failed/i);
  }

  // Configuration Modal
  findConfigurationModal(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('dialog');
  }

  findViewCodeButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('view-code-button');
  }

  // Delete Playground Modal
  findDeletePlaygroundModal(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('delete-modal');
  }

  // View Code Modal
  findViewCodeModal(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('dialog');
  }

  // Model Selection
  findModelDropdown(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByText(/Model/i).parent().find('button') as unknown as Cypress.Chainable<
      JQuery<HTMLElement>
    >;
  }

  selectModel(modelName: string): void {
    this.findModelDropdown().click();
    cy.findByText(modelName).click();
  }

  // System Instructions
  findSystemInstructionsSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('system-instructions-section');
  }

  findSystemInstructionInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('system-instructions-input');
  }

  setSystemInstructions(instructions: string): void {
    this.findSystemInstructionInput().clear().type(instructions);
  }

  // Temperature Configuration
  findTemperatureSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByText(/Temperature/i).parent();
  }

  findTemperatureInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('temperature-input');
  }

  setTemperature(value: string): void {
    this.findTemperatureInput().clear().type(value);
  }

  // Streaming Configuration
  findStreamingSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByText(/Streaming/i).parent();
  }

  findStreamingToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findStreamingSection().find('input[type="checkbox"]');
  }

  toggleStreaming(enable: boolean): void {
    this.findStreamingToggle().then(($toggle) => {
      const isChecked = $toggle.is(':checked');
      if ((enable && !isChecked) || (!enable && isChecked)) {
        this.findStreamingToggle().click({ force: true });
      }
    });
  }

  // RAG Section
  findRAGSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('rag-section-title').parent();
  }

  findRAGToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('rag-toggle-switch');
  }

  // MCP Servers Section
  findMCPServersSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-servers-section-title').parent();
  }

  findMCPServersTable(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('mcp-servers-panel-table');
  }

  // Kebab Menu (Actions Menu)
  findKebabMenuButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('header-kebab-menu-toggle');
  }

  openKebabMenu(): void {
    this.findKebabMenuButton().click();
  }

  findDeleteMenuItem(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('delete-playground-menu-item');
  }

  findConfigureMenuItem(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('configure-playground-menu-item');
  }

  // Chat Messages
  findChatMessage(text: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByText(new RegExp(text, 'i'));
  }

  findBotMessages(): Cypress.Chainable<JQuery<HTMLElement>> {
    // PatternFly Chatbot component - Cannot add testID to external library
    // NOTE: Using class selector as last resort for external component
    return cy.get('[class*="pf-chatbot__message--bot"]');
  }

  findUserMessages(): Cypress.Chainable<JQuery<HTMLElement>> {
    // PatternFly Chatbot component - Cannot add testID to external library
    // NOTE: Using class selector as last resort for external component
    return cy.get('[class*="pf-chatbot__message--user"]');
  }

  // Helper methods for chat interactions
  sendMessage(message: string): void {
    this.findMessageInput().type(message);
    this.findSendButton().click();
  }

  verifyUserMessageInChat(message: string): void {
    this.findUserMessages().should('contain.text', message);
  }

  verifyBotResponseContains(text: string): void {
    this.findBotMessages().should('contain.text', text);
  }
}

export const chatbotPage = new ChatbotPage();
