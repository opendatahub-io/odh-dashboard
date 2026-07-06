/* eslint-disable camelcase */
import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { chatbotPage } from '~/__tests__/cypress/cypress/pages/chatbotPage';
import {
  loadMCPTestConfig,
  setupBaseMCPServerMocks,
  type MCPTestConfig,
} from '~/__tests__/cypress/cypress/support/helpers/mcpServers/mcpServersTestHelpers';
import { mockMCPServers } from '~/__tests__/cypress/cypress/__mocks__';

describe('AI Playground - Stop Button Functionality (Mocked)', () => {
  let config: MCPTestConfig;

  before(() => {
    loadMCPTestConfig().then((data) => {
      config = data;
    });
  });

  beforeEach(() => {
    const namespace = config.defaultNamespace;

    // Setup all mocks BEFORE visiting any page
    setupBaseMCPServerMocks(config, {
      lsdStatus: 'Ready',
      includeLsdModel: true,
      includeAAModel: true,
    });
    cy.interceptGenAi('GET /api/v1/aaa/mcps', { query: { namespace } }, mockMCPServers([]));

    // Mock BFF config
    cy.interceptGenAi('GET /api/v1/config', {
      data: {
        isCustomLSD: false,
      },
    }).as('bffConfig');

    // Mock the MCP status endpoint
    cy.intercept('GET', '**/api/v1/mcp/status**', {
      statusCode: 200,
      body: { status: 'ready' },
    }).as('mcpStatus');

    // Mock the response creation endpoint with delays to test stop button
    cy.intercept('POST', '**/api/v1/lsd/responses**', (req) => {
      if (req.body.stream) {
        // For streaming requests, delay the response to allow stop button testing
        req.reply({
          statusCode: 200,
          headers: {
            'Content-Type': 'text/event-stream',
          },
          body: `data: {"type":"response.created","sequence_number":0,"item_id":"","output_index":0,"delta":""}\n\ndata: {"type":"response.output_text.delta","sequence_number":1,"item_id":"msg_123","output_index":0,"delta":"This "}\n\ndata: {"type":"response.output_text.delta","sequence_number":2,"item_id":"msg_123","output_index":0,"delta":"is "}\n\ndata: {"type":"response.output_text.delta","sequence_number":3,"item_id":"msg_123","output_index":0,"delta":"a "}\n\n`,
          delay: 500, // Delay to give time to click stop button
        });
      } else {
        // For non-streaming requests, add a delay
        req.reply({
          statusCode: 200,
          body: {
            data: {
              id: 'resp_mock123',
              model: 'Llama-3.2-3B-Instruct',
              status: 'completed',
              created_at: Date.now(),
              output: [
                {
                  id: 'msg_mock123',
                  type: 'message',
                  role: 'assistant',
                  content: [
                    {
                      text: 'This is a non-streaming mock response to your query',
                    },
                  ],
                },
              ],
            },
          },
          delay: 2000, // 2 second delay for testing stop button
        });
      }
    }).as('createResponse');

    // Enable gen-ai feature flag first
    appChrome.visit();

    // Visit the chatbot page
    chatbotPage.visit(namespace);
    chatbotPage.verifyOnChatbotPage(namespace);

    // Wait for all APIs to be called to ensure models are loaded
    cy.wait('@bffConfig');
    cy.wait('@aaModels');

    // Verify that a model is selected
    chatbotPage.verifyModelSelected();
  });

  it(
    'should stop streaming response when stop button is clicked',
    { tags: ['@GenAI', '@Chatbot', '@StopButton', '@Streaming'] },
    () => {
      cy.step('Verify stop button is not visible initially');
      chatbotPage.verifyStopButtonNotVisible();

      cy.step('Send a message');
      chatbotPage.sendMessage('Tell me a long story');

      cy.step('Verify stop button appears while streaming');
      chatbotPage.verifyStopButtonVisible();

      cy.step('Click stop button');
      chatbotPage.clickStopButton();

      cy.step('Verify stop message appears in bot response');
      chatbotPage.verifyStopMessageInChat();

      cy.step('Verify stop button disappears and input is re-enabled');
      chatbotPage.verifyStopButtonNotVisible();
      chatbotPage.findMessageInput().should('not.be.disabled');
    },
  );

  it(
    'should stop non-streaming response when stop button is clicked',
    { tags: ['@GenAI', '@Chatbot', '@StopButton', '@NonStreaming'] },
    () => {
      cy.step('Disable streaming mode');
      chatbotPage.toggleStreaming(false);
      chatbotPage.findStreamingToggle().should('not.be.checked');

      cy.step('Send a message');
      chatbotPage.sendMessage('Test non-streaming stop');

      cy.step('Verify stop button appears during request');
      chatbotPage.verifyStopButtonVisible();

      cy.step('Click stop button');
      chatbotPage.clickStopButton();

      cy.step('Verify stop message appears in bot response');
      chatbotPage.verifyStopMessageInChat();

      cy.step('Verify stop button disappears');
      chatbotPage.verifyStopButtonNotVisible();
    },
  );

  it(
    'should allow sending new message after stopping',
    { tags: ['@GenAI', '@Chatbot', '@StopButton'] },
    () => {
      cy.step('Send first message and stop it');
      chatbotPage.sendMessage('First message');
      chatbotPage.clickStopButton();
      chatbotPage.verifyStopMessageInChat();
      chatbotPage.verifyStopButtonNotVisible();

      cy.step('Send a second message after stopping');
      chatbotPage.sendMessage('Second message');

      cy.step('Verify stop button appears for second message');
      chatbotPage.verifyStopButtonVisible();
    },
  );
});
