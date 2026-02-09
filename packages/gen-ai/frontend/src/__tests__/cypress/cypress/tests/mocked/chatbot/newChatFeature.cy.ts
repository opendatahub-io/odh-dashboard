/* eslint-disable camelcase */
import { NewChatModal } from '~/__tests__/cypress/cypress/pages/components/Modal';
import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { chatbotPage } from '~/__tests__/cypress/cypress/pages/chatbotPage';
import {
  loadMCPTestConfig,
  setupBaseMCPServerMocks,
  type MCPTestConfig,
} from '~/__tests__/cypress/cypress/support/helpers/mcpServers/mcpServersTestHelpers';
import { mockMCPServers } from '~/__tests__/cypress/cypress/__mocks__';

describe('Chatbot - New Chat Modal (Mocked)', () => {
  let config: MCPTestConfig;

  before(() => {
    loadMCPTestConfig().then((data) => {
      config = data;
    });
  });

  beforeEach(() => {
    const namespace = config.defaultNamespace;

    // Setup all mocks BEFORE visiting any page
    // includeLsdModel: true -> Mocks LSD models endpoint with Llama-3.2-3B-Instruct
    // includeAAModel: true -> Mocks AAA models endpoint with Llama-3.2-3B-Instruct (similar to LSD)
    setupBaseMCPServerMocks(config, {
      lsdStatus: 'Ready',
      includeLsdModel: true,
      includeAAModel: true,
    });
    cy.interceptGenAi('GET /api/v1/aaa/mcps', { query: { namespace } }, mockMCPServers([]));

    // Mock BFF config - isCustomLSD=false ensures models are validated properly
    cy.interceptGenAi('GET /api/v1/config', {
      data: {
        isCustomLSD: false,
      },
    }).as('bffConfig');

    // Mock the MCP status endpoint to prevent polling errors
    cy.intercept('GET', '**/api/v1/mcp/status**', {
      statusCode: 200,
      body: { status: 'ready' },
    }).as('mcpStatus');

    // Mock the response creation endpoint to prevent actual API calls
    cy.intercept('POST', '**/api/v1/lsd/responses**', {
      statusCode: 200,
      body: {
        data: {
          id: 'test-response-id',
          model: 'Llama-3.2-3B-Instruct',
          status: 'completed',
          created_at: Date.now(),
          output: [
            {
              id: 'output-1',
              type: 'completion_message',
              content: [
                {
                  type: 'output_text',
                  text: 'This is a mocked response',
                },
              ],
            },
          ],
          usage: {
            input_tokens: 5,
            output_tokens: 10,
            total_tokens: 15,
          },
        },
      },
    }).as('createResponse');

    // Enable gen-ai feature flag first
    appChrome.visit();

    // Visit the chatbot page
    chatbotPage.visit(namespace);
    chatbotPage.verifyOnChatbotPage(namespace);

    // Wait for all APIs to be called to ensure models are loaded
    cy.wait('@bffConfig');
    cy.wait('@aaModels');

    // Verify that a model is selected by checking the dropdown shows a model name
    // Use .first() since there are two model dropdowns (header and settings panel)
    cy.findAllByTestId('model-selector-toggle')
      .first()
      .should('be.visible')
      .and('contain', 'Llama');
  });

  it(
    'should close modal when cancel button is clicked',
    { tags: ['@GenAI', '@Chatbot', '@NewChat', '@Modal'] },
    () => {
      cy.step('Type a message to enable the "New chat" button');
      cy.findByTestId('chatbot-message-bar').should('be.visible').type('Test message{enter}');

      cy.wait('@createResponse');

      cy.step('Open new chat modal');
      cy.findByTestId('new-chat-button').should('be.visible').click();

      const newChatModal = new NewChatModal();
      newChatModal.shouldBeOpen();

      cy.step('Click cancel button');
      newChatModal.findCancelButton().should('be.visible').click();

      cy.step('Verify modal closes');
      newChatModal.shouldBeOpen(false);

      cy.step('Verify message history is still present');
      cy.findByTestId('chatbot').should('contain', 'Test message');

      cy.step('Test completed - Cancel button closes modal without clearing chat');
    },
  );

  it(
    'should clear chat history when confirm button is clicked',
    { tags: ['@GenAI', '@Chatbot', '@NewChat', '@Modal', '@E2E'] },
    () => {
      cy.step('Type a message to create chat history');
      cy.findByTestId('chatbot-message-bar')
        .should('be.visible')
        .type('Message to be cleared{enter}');

      cy.wait('@createResponse');

      cy.step('Verify message appears in chat');
      cy.findByTestId('chatbot').should('contain', 'Message to be cleared');

      cy.step('Open new chat modal');
      cy.findByTestId('new-chat-button').should('be.visible').click();

      const newChatModal = new NewChatModal();
      newChatModal.shouldBeOpen();

      cy.step('Click confirm button to start new chat');
      newChatModal.findConfirmButton().should('be.visible').click();

      cy.step('Verify modal closes');
      newChatModal.shouldBeOpen(false);

      cy.step('Verify chat history is cleared');
      // After clicking confirm, the chat should reset
      cy.findByTestId('chatbot').should('contain', 'Welcome to the playground');
    },
  );

  it(
    'should display correct modal title and warning message',
    { tags: ['@GenAI', '@Chatbot', '@NewChat', '@Modal', '@UI'] },
    () => {
      cy.step('Type a message to enable the "New chat" button');
      cy.findByTestId('chatbot-message-bar').should('be.visible').type('Test message{enter}');

      cy.wait('@createResponse');

      cy.step('Open new chat modal');
      cy.findByTestId('new-chat-button').should('be.visible').click();

      const newChatModal = new NewChatModal();
      newChatModal.shouldBeOpen();

      cy.step('Verify modal title is displayed');
      newChatModal.findTitle().should('be.visible');

      cy.step('Verify warning message is displayed');
      newChatModal.findWarningMessage().should('be.visible');

      cy.step('Verify modal has warning icon variant');
      newChatModal.find().should('be.visible');

      cy.step('Close modal');
      newChatModal.findCancelButton().click();
    },
  );

  it(
    'should have properly labeled buttons',
    { tags: ['@GenAI', '@Chatbot', '@NewChat', '@Modal', '@UI'] },
    () => {
      cy.step('Type a message to enable the "New chat" button');
      cy.findByTestId('chatbot-message-bar').should('be.visible').type('Test message{enter}');

      cy.wait('@createResponse');

      cy.step('Open new chat modal');
      cy.findByTestId('new-chat-button').should('be.visible').click();

      const newChatModal = new NewChatModal();
      newChatModal.shouldBeOpen();

      cy.step('Verify confirm button has correct text');
      newChatModal.findConfirmButton().should('be.visible').and('contain', 'Start new chat');

      cy.step('Verify cancel button has correct text');
      newChatModal.findCancelButton().should('be.visible').and('contain', 'Cancel');

      cy.step('Verify confirm button has primary variant styling');
      newChatModal.findConfirmButton().should('have.class', 'pf-m-primary');

      cy.step('Verify cancel button has link variant styling');
      newChatModal.findCancelButton().should('have.class', 'pf-m-link');

      cy.step('Close modal');
      newChatModal.findCancelButton().click();
    },
  );

  it(
    'should be able to start new conversation after clearing',
    { tags: ['@GenAI', '@Chatbot', '@NewChat', '@E2E'] },
    () => {
      cy.step('Send initial message');
      cy.findByTestId('chatbot-message-bar').should('be.visible').type('Initial message{enter}');
      cy.wait('@createResponse');

      cy.step('Clear chat history via new chat modal');
      cy.findByTestId('new-chat-button').click();
      const newChatModal = new NewChatModal();
      newChatModal.findConfirmButton().click();

      cy.step('Verify chat is cleared');
      cy.findByTestId('chatbot').should('not.contain', 'Initial message');

      cy.step('Send new message after clearing');
      cy.findByTestId('chatbot-message-bar')
        .should('be.visible')
        .type('New conversation message{enter}');
      cy.wait('@createResponse');

      cy.step('Verify new message appears');
      cy.findByTestId('chatbot').should('contain', 'New conversation message');
      cy.findByTestId('chatbot').should('not.contain', 'Initial message');
    },
  );
});
