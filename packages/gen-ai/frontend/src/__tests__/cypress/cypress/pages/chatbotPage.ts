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

  clickGuardrailsTab(): void {
    this.findGuardrailsTab().click();
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
  // Model dropdown is now in the toolbar (moved from Model tab)
  // Use specific test ID for chatbot header model selector
  findModelDropdown(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('chatbot-model-selector-toggle');
  }

  findModelSelectorButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('chatbot-model-selector-toggle');
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

  verifyLastBotResponseContains(text: string): void {
    this.findBotMessages().last().should('contain.text', text);
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

  // Guardrails Section (inside Guardrails tab)
  findGuardrailsSection(): Cypress.Chainable<JQuery<HTMLElement>> {
    // Click Guardrails tab first to show guardrails section
    this.clickGuardrailsTab();
    return cy.findByTestId('guardrails-section-title').parent();
  }

  findGuardrailsEmptyState(): Cypress.Chainable<JQuery<HTMLElement>> {
    this.clickGuardrailsTab();
    return cy.findByTestId('guardrails-empty-state');
  }

  findGuardrailModelToggle(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('guardrail-model-toggle');
  }

  findUserInputGuardrailsSwitch(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('user-input-guardrails-switch');
  }

  findModelOutputGuardrailsSwitch(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('model-output-guardrails-switch');
  }

  selectGuardrailModel(modelName: string): void {
    this.findGuardrailModelToggle().click();
    cy.findByRole('option', { name: modelName }).click();
  }

  toggleUserInputGuardrails(enable: boolean): void {
    this.findUserInputGuardrailsSwitch().then(($toggle) => {
      const isChecked = $toggle.is(':checked');
      if ((enable && !isChecked) || (!enable && isChecked)) {
        this.findUserInputGuardrailsSwitch().click({ force: true });
      }
    });
  }

  toggleModelOutputGuardrails(enable: boolean): void {
    this.findModelOutputGuardrailsSwitch().then(($toggle) => {
      const isChecked = $toggle.is(':checked');
      if ((enable && !isChecked) || (!enable && isChecked)) {
        this.findModelOutputGuardrailsSwitch().click({ force: true });
      }
    });
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

  // Compare Mode Methods
  findCompareChatButton(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.findByTestId('compare-chat-button');
  }

  // Find all chatbot panes (used in compare mode)
  // Uses role="region" to only match pane containers, not their child elements
  findAllChatbotPanes(): Cypress.Chainable<JQuery<HTMLElement>> {
    return cy.get('[data-testid^="chatbot-pane-"][role="region"]');
  }

  // Find a specific chatbot pane by index (0 = Model 1, 1 = Model 2)
  findChatbotPaneByIndex(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findAllChatbotPanes().eq(index);
  }

  // Find pane settings button by pane index
  findPaneSettingsButton(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findChatbotPaneByIndex(index).find('[data-testid$="-settings-button"]');
  }

  // Find pane close button by pane index
  findPaneCloseButton(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findChatbotPaneByIndex(index).find('[data-testid$="-close-button"]');
  }

  // Find pane model selector by pane index
  findPaneModelSelector(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findChatbotPaneByIndex(index).findByTestId('chatbot-model-selector-toggle');
  }

  // Find pane label text (e.g., "Model 1", "Model 2")
  findPaneLabel(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    const labelText = `Model ${index + 1}`;
    return this.findChatbotPaneByIndex(index).contains(labelText);
  }

  // Verify we are in compare mode (two panes visible)
  verifyInCompareMode(): void {
    this.findAllChatbotPanes().should('have.length', 2);
    // Verify compare button is hidden in compare mode
    this.findCompareChatButton().should('not.exist');
  }

  // Verify we are in single mode (one chatbot visible)
  verifyInSingleMode(): void {
    this.findChatbotPlayground().should('be.visible');
    this.findAllChatbotPanes().should('not.exist');
    // Verify compare button is visible in single mode
    this.findCompareChatButton().should('be.visible');
  }

  // Enter compare mode via button click
  clickCompareChatButton(): void {
    this.findCompareChatButton().click();
  }

  // Exit compare mode by closing a pane
  closePaneByIndex(index: number): void {
    this.findPaneCloseButton(index).click();
  }

  // Open settings panel for a specific pane
  openPaneSettings(index: number): void {
    // First ensure any existing settings panel is closed
    this.closeSettingsPanel();
    // Then click the settings button for the specified pane
    this.findPaneSettingsButton(index).click({ force: true });
  }

  // Find settings panel header (shows "Configure Model 1" or "Configure Model 2")
  findSettingsPanelHeader(): Cypress.Chainable<JQuery<HTMLElement>> {
    // Wait for the drawer to be visible before finding the header
    return cy.findByTestId('chatbot-settings-panel-header', { timeout: 10000 });
  }

  // Close the settings panel if it's open
  closeSettingsPanel(): void {
    // First close any open modals that might be blocking
    cy.get('body').then(($body) => {
      // Close view code modal if open
      const viewCodeModal = $body.find('[data-testid="view-code-modal"]');
      if (viewCodeModal.length > 0) {
        cy.get('[data-testid="view-code-modal"]')
          .find('button[aria-label="Close"]')
          .click({ force: true });
        cy.get('[data-testid="view-code-modal"]').should('not.exist');
      }
    });

    // Then close the settings panel
    cy.get('body').then(($body) => {
      const closeButton = $body.find('[aria-label="Close settings panel"]');
      if (closeButton.length > 0 && closeButton.is(':visible')) {
        cy.get('[aria-label="Close settings panel"]').click({ force: true });
        // Wait for panel to close
        cy.get('[data-testid="chatbot-settings-panel-header"]').should('not.exist');
      }
    });
  }

  // Find bot messages in a specific pane (by index)
  findBotMessagesInPane(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findChatbotPaneByIndex(index).find('[class*="pf-chatbot__message--bot"]');
  }

  // Find user messages in a specific pane (by index)
  findUserMessagesInPane(index: number): Cypress.Chainable<JQuery<HTMLElement>> {
    return this.findChatbotPaneByIndex(index).find('[class*="pf-chatbot__message--user"]');
  }

  // Verify message appears in both panes
  verifyMessageInBothPanes(message: string): void {
    this.findChatbotPaneByIndex(0).should('contain.text', message);
    this.findChatbotPaneByIndex(1).should('contain.text', message);
  }

  // Verify bot response in both panes
  verifyBotResponseInBothPanes(text: string): void {
    this.findBotMessagesInPane(0).should('contain.text', text);
    this.findBotMessagesInPane(1).should('contain.text', text);
  }
}

export const chatbotPage = new ChatbotPage();
