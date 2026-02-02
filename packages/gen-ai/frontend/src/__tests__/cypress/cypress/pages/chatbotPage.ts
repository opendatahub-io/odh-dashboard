import { mcpTab } from './playgroundPage/mcpTab';

class ChatbotPage {
  mcpTab = mcpTab;
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

  // Settings Panel Tabs
  findModelTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('chatbot-settings-page-tab-model');
  }

  findPromptTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('chatbot-settings-page-tab-prompt');
  }

  findKnowledgeTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('chatbot-settings-page-tab-knowledge');
  }

  findMCPTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('chatbot-settings-page-tab-mcp');
  }

  findGuardrailsTab(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('chatbot-settings-page-tab-guardrails');
  }

  clickMCPTab(): void {
    this.findMCPTab().click();
  }

  clickKnowledgeTab(): void {
    this.findKnowledgeTab().click();
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

  findMessageInput(options?: { timeout?: number }): Cypress.Chainable<JQuery<HTMLElement>> {
    // data-testid is directly on the textarea element
    return cy.findByTestId('chatbot-message-bar', options);
  }

  findSendButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    // PatternFly MessageBar component - Send button appears after typing
    // NOTE: Cannot add testID to external library component, using semantic role
    return cy.findByRole('button', { name: 'Send' });
  }

  findStopButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    // PatternFly MessageBar component - Stop button appears when loading
    // NOTE: Cannot add testID to external library component, using semantic role
    return cy.findByRole('button', { name: 'Stop' });
  }

  findWelcomeMessage(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByText(/Welcome to the playground/i);
  }

  findMessage(text: string): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByText(text);
  }

  findEmptyState(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('empty-state');
  }

  findEmptyStateTitle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('empty-state').find('h1') as unknown as Cypress.Chainable<
      JQuery<HTMLElement>
    >;
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

  findModelSelectorButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByRole('button', { name: /Llama|Select a model/i });
  }

  verifyModelSelected(): void {
    this.findModelSelectorButton().should('be.visible').and('contain', 'Llama');
  }

  selectModel(modelName: string): void {
    this.findModelDropdown().click();
    cy.findByText(modelName).click();
  }

  // System Instructions (inside Prompt tab)
  clickPromptTab(): void {
    this.findPromptTab().click();
  }

  findSystemInstructionsSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    // Click Prompt tab first to show system instructions section
    this.clickPromptTab();
    return cy.findByTestId('system-instructions-section');
  }

  findSystemInstructionInput(): Cypress.Chainable<JQuery<HTMLElement>> {
    // Click Prompt tab first to show system instructions input
    this.clickPromptTab();
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

  // RAG Section (inside Knowledge tab)
  findRAGSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    // Click Knowledge tab first to show RAG section
    this.clickKnowledgeTab();
    return cy.findByTestId('rag-section-title').parent();
  }

  findRAGToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('rag-toggle-switch');
  }

  // MCP Servers Section (inside MCP tab)
  findMCPServersSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    // Click MCP tab first to show MCP servers section
    this.clickMCPTab();
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
    // Use Cypress string matching instead of RegExp to avoid ReDoS
    return cy.findByText(text);
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

  verifyStopButtonVisible(): void {
    this.findStopButton().should('be.visible');
  }

  verifyStopButtonNotVisible(): void {
    this.findStopButton().should('not.exist');
  }

  clickStopButton(): void {
    this.findStopButton().click();
  }

  verifyStopMessageInChat(): void {
    this.findBotMessages().should('contain.text', 'You stopped this message');
  }

  // Chat Reset Methods
  findNewChatButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('new-chat-button');
  }

  startNewChatIfAvailable(): void {
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="new-chat-button"]:not(:disabled)').length > 0) {
        this.findNewChatButton().click();
        cy.findByRole('button', { name: /Start new chat/i }).click();
        // Wait for page to stabilize after new chat
        this.findChatbotPlayground().should('be.visible');
        this.findMessageInput().should('not.be.disabled');
      }
    });
  }

  resetChatState(): void {
    this.startNewChatIfAvailable();
    this.toggleStreaming(true);
  }

  // Metrics Section
  findMetricsToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.contains('button', /Show metrics|Hide metrics/i) as unknown as Cypress.Chainable<
      JQuery<HTMLElement>
    >;
  }

  expandMetrics(): void {
    cy.contains('button', 'Show metrics').click();
  }

  verifyMetricsDisplayed(): void {
    // Verify latency label is visible after expanding
    cy.contains('button', 'Show metrics').click();
    cy.get('.pf-v6-c-label').should('have.length.at.least', 1);
  }
}

export const chatbotPage = new ChatbotPage();
