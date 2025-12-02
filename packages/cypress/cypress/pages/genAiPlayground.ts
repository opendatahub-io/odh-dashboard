import { appChrome } from './appChrome';

class GenAiPlayground {
  visit(namespace?: string, enableFeatureFlags = true) {
    let url = namespace ? `/gen-ai-studio/playground/${namespace}` : '/gen-ai-studio/playground';

    // Add dev feature flags if needed
    if (enableFeatureFlags) {
      url += '?devFeatureFlags=genAiStudio%3Dtrue%2CmodelAsService%3Dtrue';
    }

    cy.visitWithLogin(url);
    this.wait();
  }

  navigate() {
    appChrome.findNavItem({ name: 'Playground', rootSection: 'Gen AI studio' }).click();
    this.wait();
  }

  private wait() {
    // Wait for the playground page to load (either chatbot or empty state)
    cy.findByRole('heading', { name: 'Playground' }).should('be.visible');
  }

  findPageTitle() {
    return cy.findByRole('heading', { name: 'Playground' });
  }

  findProjectSelector() {
    return cy.findByTestId('project-selector-toggle');
  }

  findChatbot() {
    return cy.findByTestId('chatbot');
  }

  findWelcomePrompt() {
    return cy.findByTestId('chatbot-welcome-prompt');
  }

  findMessageBar() {
    return cy.findByTestId('chatbot-message-bar');
  }

  findMessageInput() {
    return cy.findByTestId('chatbot-message-bar');
  }

  findSendButton() {
    return cy.findByTestId('chatbot-send-button');
  }

  findChatbotMessages() {
    return cy.get('.pf-chatbot__message');
  }

  findBotMessage() {
    return cy.get('.pf-chatbot__message--bot');
  }

  findBotMessageContent() {
    // Get the actual message content, not the welcome prompt
    // The bot messages after welcome should be the 2nd, 3rd, etc.
    return cy.get('.pf-chatbot__message--bot').eq(1); // Index 1 = second bot message (first response)
  }

  findAllBotMessages() {
    return cy.get('.pf-chatbot__message--bot');
  }

  findUserMessage() {
    return cy.get('.pf-chatbot__message--user');
  }

  findLoadingIndicator() {
    return cy.contains('Loading');
  }

  findModelDropdown() {
    return cy.get('button[class*="pf-v6-c-menu-toggle"]').contains(/vllm|llama|qwen/i);
  }

  sendMessage(message: string) {
    // Type the message into the input field
    this.findMessageInput().should('be.visible').and('be.enabled').clear().type(message);
    // Press Enter to send the message
    this.findMessageInput().type('{enter}');
    // Verify message was cleared after sending (indicates successful send)
    this.findMessageInput().should('have.value', '');
  }

  shouldBeAccessible() {
    // Verify the playground page is accessible (title visible)
    this.findPageTitle().should('be.visible');
    return this;
  }

  shouldBeVisible() {
    // Verify the chatbot interface is fully loaded
    this.findChatbot().should('be.visible');
    return this;
  }

  findEmptyState() {
    return cy.findByTestId('empty-state');
  }

  findCreatePlaygroundButton() {
    return cy.findByTestId('empty-state-action-button');
  }

  findConfigurePlaygroundDialog() {
    return cy.get('[data-testid="configure-playground-modal"]');
  }

  findConfigurationTable() {
    return cy.findByTestId('chatbot-configuration-table');
  }

  findCreateButtonInDialog() {
    return cy.findByRole('button', { name: /Create/i });
  }

  findModelToggleButton() {
    return cy.findByTestId('model-selector-toggle');
  }

  findModelOption(modelName: string) {
    return cy.contains(modelName);
  }

  findSelectedModelButton(modelName: string) {
    return cy.findByRole('button', {
      name: new RegExp(modelName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
    });
  }

  selectModel(modelName: string) {
    // Check if our model is already selected in any visible button
    cy.get('body').then(($body) => {
      const hasOurModel = $body.find('button:visible').text().includes(modelName);

      if (!hasOurModel) {
        cy.log('Model not auto-selected, selecting manually');
        this.findModelToggleButton().click();
        this.findModelOption(modelName).should('be.visible').click();
      } else {
        cy.log('Model already selected (possibly with prefix)');
      }
    });
  }
}

export const genAiPlayground = new GenAiPlayground();
