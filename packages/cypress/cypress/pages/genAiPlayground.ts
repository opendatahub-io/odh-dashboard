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
    return cy.contains('Welcome to the model playground');
  }

  findMessageBar() {
    return cy.get('[aria-label="Message bar"]');
  }

  findMessageInput() {
    return cy.findByTestId('chatbot-message-bar');
  }

  findSendButton() {
    // The send button in PatternFly MessageBar
    return cy.get('.pf-chatbot__message-bar').find('button[aria-label*="Send"]');
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
}

export const genAiPlayground = new GenAiPlayground();
