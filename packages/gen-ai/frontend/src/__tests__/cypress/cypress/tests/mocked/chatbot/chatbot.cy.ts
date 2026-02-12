import { chatbotPage } from '~/__tests__/cypress/cypress/pages/chatbotPage';

// Use mock-test-namespace-2 which has LSD configured and ready in the BFF
const TEST_NAMESPACE = 'mock-test-namespace-2';

describe('AI Playground - Chatbot Interactions (Mocked)', () => {
  describe('Page Load and UI Verification', () => {
    it(
      'should load chatbot playground with message input',
      { tags: ['@GenAI', '@Chatbot', '@Smoke'] },
      () => {
        cy.step('Navigate to chatbot playground');
        chatbotPage.visit(TEST_NAMESPACE);

        cy.step('Verify chatbot playground is visible');
        chatbotPage.findChatbotPlayground().should('be.visible');

        cy.step('Verify message input is visible and enabled');
        chatbotPage
          .findMessageInput({ timeout: 20000 })
          .should('be.visible')
          .and('not.be.disabled');

        cy.step('Verify welcome message is displayed');
        chatbotPage.findWelcomeMessage().should('be.visible');

        cy.step('Test completed - Chatbot UI loaded successfully');
      },
    );

    it('should allow typing in message input', { tags: ['@GenAI', '@Chatbot', '@UI'] }, () => {
      cy.step('Navigate to chatbot');
      chatbotPage.visit(TEST_NAMESPACE);

      cy.step('Wait for chatbot playground');
      chatbotPage.findChatbotPlayground().should('be.visible');

      cy.step('Verify message input is functional');
      const testMessage = 'Test message';
      chatbotPage.findMessageInput({ timeout: 20000 }).should('be.visible').type(testMessage);
      chatbotPage.findMessageInput().should('have.value', testMessage);

      cy.step('Verify send button appears after typing');
      chatbotPage.findSendButton().should('be.visible');

      cy.step('Test completed - Message input is functional');
    });

    it(
      'should send message and receive bot response',
      { tags: ['@GenAI', '@Chatbot', '@Interaction'] },
      () => {
        cy.step('Navigate to chatbot');
        chatbotPage.visit(TEST_NAMESPACE);

        cy.step('Wait for chatbot playground');
        chatbotPage.findChatbotPlayground().should('be.visible');

        cy.step('Send a test message');
        const testMessage = 'Hello';
        chatbotPage.sendMessage(testMessage);

        cy.step('Verify user message appears in chat');
        chatbotPage.verifyUserMessageInChat(testMessage);

        cy.step('Verify bot response is received');
        chatbotPage.verifyBotResponseContains('mock response');

        cy.step('Test completed - Message sent and response received');
      },
    );

    it(
      'should display metrics after bot response',
      { tags: ['@GenAI', '@Chatbot', '@Metrics'] },
      () => {
        cy.step('Navigate to chatbot');
        chatbotPage.visit(TEST_NAMESPACE);

        cy.step('Wait for chatbot playground');
        chatbotPage.findChatbotPlayground().should('be.visible');

        cy.step('Send a test message');
        chatbotPage.sendMessage('Hello');

        cy.step('Verify bot response is received');
        chatbotPage.verifyBotResponseContains('mock response');

        cy.step('Verify metrics toggle is visible');
        chatbotPage.findMetricsToggle().should('be.visible');

        cy.step('Expand metrics and verify content');
        chatbotPage.expandMetrics();
        cy.get('.pf-v6-c-label').should('exist');

        cy.step('Test completed - Metrics displayed successfully');
      },
    );
  });

  describe('Model Configuration', () => {
    it(
      'should display and interact with temperature slider',
      { tags: ['@GenAI', '@Chatbot', '@Configuration'] },
      () => {
        cy.step('Navigate to chatbot');
        chatbotPage.visit(TEST_NAMESPACE);

        cy.step('Wait for chatbot playground');
        chatbotPage.findChatbotPlayground().should('be.visible');

        cy.step('Verify Temperature section is visible');
        chatbotPage.findTemperatureSection().should('be.visible');

        cy.step('Verify temperature input has default value');
        chatbotPage.findTemperatureInput().should('have.value', '0.1');

        cy.step('Change temperature value');
        chatbotPage.setTemperature('0.8');

        cy.step('Verify temperature value changed');
        // Browser may format the value with trailing zeros (e.g., '0.8' becomes '0.80')
        chatbotPage.findTemperatureInput().should('have.value', '0.80');

        cy.step('Test completed - Temperature slider is functional');
      },
    );

    it('should toggle streaming mode', { tags: ['@GenAI', '@Chatbot', '@Configuration'] }, () => {
      cy.step('Navigate to chatbot');
      chatbotPage.visit(TEST_NAMESPACE);

      cy.step('Wait for chatbot playground');
      chatbotPage.findChatbotPlayground().should('be.visible');

      cy.step('Verify Streaming toggle is visible');
      chatbotPage.findStreamingSection().should('be.visible');

      cy.step('Verify streaming is enabled by default');
      chatbotPage.findStreamingToggle().should('be.checked');

      cy.step('Toggle streaming off');
      chatbotPage.toggleStreaming(false);

      cy.step('Verify streaming is disabled');
      chatbotPage.findStreamingToggle().should('not.be.checked');

      cy.step('Test completed - Streaming toggle is functional');
    });

    it(
      'should display and edit system instructions',
      { tags: ['@GenAI', '@Chatbot', '@Configuration'] },
      () => {
        cy.step('Navigate to chatbot');
        chatbotPage.visit(TEST_NAMESPACE);

        cy.step('Wait for chatbot playground');
        chatbotPage.findChatbotPlayground().should('be.visible');

        cy.step('Verify System instructions input is visible');
        chatbotPage.findSystemInstructionInput().should('be.visible');

        cy.step('Verify system instructions has default content');
        chatbotPage
          .findSystemInstructionInput()
          .should('contain.value', 'You are a helpful AI assistant');

        cy.step('Edit system instructions');
        const newInstructions = 'You are a specialized assistant for testing purposes';
        chatbotPage.setSystemInstructions(newInstructions);

        cy.step('Verify system instructions updated');
        chatbotPage.findSystemInstructionInput().should('have.value', newInstructions);

        cy.step('Test completed - System instructions are editable');
      },
    );
  });

  describe('MCP Servers Tab', () => {
    it(
      'should display MCP servers tab with configuration',
      { tags: ['@GenAI', '@Chatbot', '@MCP'] },
      () => {
        cy.step('Navigate to chatbot');
        chatbotPage.visit(TEST_NAMESPACE);

        cy.step('Wait for chatbot playground');
        chatbotPage.findChatbotPlayground().should('be.visible');

        cy.step('Verify MCP servers section is present');
        chatbotPage.findMCPServersSection().should('be.visible');

        cy.step('Verify RAG section is present');
        chatbotPage.findRAGSection().should('be.visible');

        cy.step('Test completed - MCP servers tab is visible');
      },
    );
  });

  describe('Header Actions', () => {
    it('should display header action buttons', { tags: ['@GenAI', '@Chatbot', '@Actions'] }, () => {
      cy.step('Navigate to chatbot');
      chatbotPage.visit(TEST_NAMESPACE);

      cy.step('Wait for chatbot playground');
      chatbotPage.findChatbotPlayground().should('be.visible');

      cy.step('Verify View Code button is visible');
      chatbotPage.findViewCodeButton().should('be.visible');

      cy.step('Open kebab menu to access Delete option');
      chatbotPage.openKebabMenu();

      cy.step('Verify Delete option is visible in menu');
      chatbotPage.findDeleteMenuItem().should('be.visible');

      cy.step('Test completed - Header actions are visible');
    });
  });
});
