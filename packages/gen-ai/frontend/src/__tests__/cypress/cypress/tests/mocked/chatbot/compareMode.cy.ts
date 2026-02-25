/* eslint-disable camelcase */
import { CompareChatModal } from '~/__tests__/cypress/cypress/pages/components/Modal';
import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { chatbotPage } from '~/__tests__/cypress/cypress/pages/chatbotPage';
import {
  loadMCPTestConfig,
  setupBaseMCPServerMocks,
  type MCPTestConfig,
} from '~/__tests__/cypress/cypress/support/helpers/mcpServers/mcpServersTestHelpers';
import { mockMCPServers } from '~/__tests__/cypress/cypress/__mocks__';

describe('Chatbot - Compare Mode (Mocked)', () => {
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

    // Mock the response creation endpoint
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
                  text: 'This is a mocked response for compare mode',
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

    // Enable gen-ai feature flag and visit page
    appChrome.visit();
    chatbotPage.visit(namespace);
    chatbotPage.verifyOnChatbotPage(namespace);

    // Wait for APIs
    cy.wait('@bffConfig');
    cy.wait('@aaModels');

    // Verify model is selected
    cy.findByTestId('chatbot-model-selector-toggle').should('be.visible').and('contain', 'Llama');
  });

  afterEach(() => {
    // Close settings panel if open to prevent interference between tests
    chatbotPage.closeSettingsPanel();
  });

  describe('Enter Compare Mode', () => {
    it(
      'should show confirmation modal when clicking Compare chat button',
      { tags: ['@GenAI', '@Chatbot', '@CompareMode', '@Modal'] },
      () => {
        cy.step('Verify compare button is visible');
        chatbotPage.findCompareChatButton().should('be.visible');

        cy.step('Click compare chat button');
        chatbotPage.clickCompareChatButton();

        cy.step('Verify modal opens');
        const compareChatModal = new CompareChatModal();
        compareChatModal.shouldBeOpen();

        cy.step('Verify modal title');
        compareChatModal.findTitle().should('be.visible');

        cy.step('Verify warning message');
        compareChatModal.findWarningMessage().should('be.visible');

        cy.step('Close modal');
        compareChatModal.findCancelButton().click();
        compareChatModal.shouldBeOpen(false);
      },
    );

    it(
      'should not enter compare mode when cancel is clicked',
      { tags: ['@GenAI', '@Chatbot', '@CompareMode', '@Modal'] },
      () => {
        cy.step('Click compare chat button');
        chatbotPage.clickCompareChatButton();

        const compareChatModal = new CompareChatModal();
        compareChatModal.shouldBeOpen();

        cy.step('Click cancel button');
        compareChatModal.findCancelButton().click();

        cy.step('Verify modal closes');
        compareChatModal.shouldBeOpen(false);

        cy.step('Verify still in single mode');
        chatbotPage.findChatbotPlayground().should('be.visible');
        chatbotPage.findCompareChatButton().should('be.visible');
      },
    );

    it(
      'should enter compare mode with two panes when confirmed',
      { tags: ['@GenAI', '@Chatbot', '@CompareMode', '@E2E'] },
      () => {
        cy.step('Click compare chat button');
        chatbotPage.clickCompareChatButton();

        const compareChatModal = new CompareChatModal();
        compareChatModal.shouldBeOpen();

        cy.step('Click confirm button');
        compareChatModal.findConfirmButton().click();

        cy.step('Verify modal closes');
        compareChatModal.shouldBeOpen(false);

        cy.step('Verify in compare mode with two panes');
        chatbotPage.verifyInCompareMode();

        cy.step('Verify Model 1 pane exists');
        chatbotPage.findChatbotPaneByIndex(0).should('be.visible');
        chatbotPage.findPaneLabel(0).should('be.visible');

        cy.step('Verify Model 2 pane exists');
        chatbotPage.findChatbotPaneByIndex(1).should('be.visible');
        chatbotPage.findPaneLabel(1).should('be.visible');
      },
    );
  });

  describe('Compare Mode UI', () => {
    beforeEach(() => {
      // Enter compare mode before each UI test
      chatbotPage.clickCompareChatButton();
      const compareChatModal = new CompareChatModal();
      compareChatModal.findConfirmButton().click();
      chatbotPage.verifyInCompareMode();
    });

    it(
      'should display model selector in each pane',
      { tags: ['@GenAI', '@Chatbot', '@CompareMode', '@UI'] },
      () => {
        cy.step('Verify Model 1 pane has model selector');
        chatbotPage.findPaneModelSelector(0).should('be.visible');

        cy.step('Verify Model 2 pane has model selector');
        chatbotPage.findPaneModelSelector(1).should('be.visible');
      },
    );

    it(
      'should display settings and close buttons in each pane',
      { tags: ['@GenAI', '@Chatbot', '@CompareMode', '@UI'] },
      () => {
        cy.step('Verify Model 1 pane has settings button');
        chatbotPage.findPaneSettingsButton(0).should('be.visible');

        cy.step('Verify Model 1 pane has close button');
        chatbotPage.findPaneCloseButton(0).should('be.visible');

        cy.step('Verify Model 2 pane has settings button');
        chatbotPage.findPaneSettingsButton(1).should('be.visible');

        cy.step('Verify Model 2 pane has close button');
        chatbotPage.findPaneCloseButton(1).should('be.visible');
      },
    );

    it(
      'should hide compare chat button when in compare mode',
      { tags: ['@GenAI', '@Chatbot', '@CompareMode', '@UI'] },
      () => {
        cy.step('Verify compare button is hidden');
        chatbotPage.findCompareChatButton().should('not.exist');
      },
    );
  });

  describe('Settings Panel Isolation', () => {
    beforeEach(() => {
      // Enter compare mode
      chatbotPage.clickCompareChatButton();
      const compareChatModal = new CompareChatModal();
      compareChatModal.findConfirmButton().click();
      chatbotPage.verifyInCompareMode();
    });

    it(
      'should open settings for Model 1 when clicking Model 1 settings button',
      { tags: ['@GenAI', '@Chatbot', '@CompareMode', '@Settings'] },
      () => {
        cy.step('Click settings button on Model 1 pane');
        chatbotPage.openPaneSettings(0);

        cy.step('Verify settings panel shows Configure - 1');
        chatbotPage.findSettingsPanelHeader().should('contain.text', 'Configure - 1');
      },
    );

    it(
      'should open settings for Model 2 when clicking Model 2 settings button',
      { tags: ['@GenAI', '@Chatbot', '@CompareMode', '@Settings'] },
      () => {
        cy.step('Click settings button on Model 2 pane');
        chatbotPage.openPaneSettings(1);

        cy.step('Verify settings panel shows Configure - 2');
        chatbotPage.findSettingsPanelHeader().should('contain.text', 'Configure - 2');
      },
    );
  });

  describe('Message Sending', () => {
    beforeEach(() => {
      // Enter compare mode
      chatbotPage.clickCompareChatButton();
      const compareChatModal = new CompareChatModal();
      compareChatModal.findConfirmButton().click();
      chatbotPage.verifyInCompareMode();
    });

    it(
      'should send message to both panes simultaneously',
      { tags: ['@GenAI', '@Chatbot', '@CompareMode', '@E2E'] },
      () => {
        const testMessage = 'Compare mode test message';

        cy.step('Send a message');
        chatbotPage.sendMessage(testMessage);

        cy.step('Wait for at least one response');
        // In compare mode, API calls are made for each pane
        cy.wait('@createResponse', { timeout: 15000 });

        cy.step('Verify user message appears in both panes');
        chatbotPage.verifyMessageInBothPanes(testMessage);

        cy.step('Verify bot response appears');
        // Just verify that a bot response was added (any bot message after the welcome)
        // The PatternFly chatbot shows bot messages with specific classes
        chatbotPage.findBotMessages().should('have.length.at.least', 2);
      },
    );
  });

  describe('Exit Compare Mode', () => {
    beforeEach(() => {
      // Enter compare mode
      chatbotPage.clickCompareChatButton();
      const compareChatModal = new CompareChatModal();
      compareChatModal.findConfirmButton().click();
      chatbotPage.verifyInCompareMode();
    });

    it(
      'should exit compare mode when closing Model 1 pane',
      { tags: ['@GenAI', '@Chatbot', '@CompareMode', '@E2E'] },
      () => {
        cy.step('Close Model 1 pane');
        chatbotPage.closePaneByIndex(0);

        cy.step('Verify exited compare mode');
        chatbotPage.findAllChatbotPanes().should('not.exist');

        cy.step('Verify compare button is visible again');
        chatbotPage.findCompareChatButton().should('be.visible');
      },
    );

    it(
      'should exit compare mode when closing Model 2 pane',
      { tags: ['@GenAI', '@Chatbot', '@CompareMode', '@E2E'] },
      () => {
        cy.step('Close Model 2 pane');
        chatbotPage.closePaneByIndex(1);

        cy.step('Verify exited compare mode');
        chatbotPage.findAllChatbotPanes().should('not.exist');

        cy.step('Verify compare button is visible again');
        chatbotPage.findCompareChatButton().should('be.visible');
      },
    );
  });

  describe('View Code in Compare Mode', () => {
    beforeEach(() => {
      // Enter compare mode
      chatbotPage.clickCompareChatButton();
      const compareChatModal = new CompareChatModal();
      compareChatModal.findConfirmButton().click();
      chatbotPage.verifyInCompareMode();
    });

    it(
      'should open view code modal in compare mode',
      { tags: ['@GenAI', '@Chatbot', '@CompareMode', '@ViewCode'] },
      () => {
        cy.step('Send a message to enable view code');
        chatbotPage.sendMessage('Test for view code');
        cy.wait('@createResponse');

        cy.step('Click view code button');
        chatbotPage.findViewCodeButton().click();

        cy.step('Verify view code modal opens');
        cy.findByTestId('view-code-modal').should('be.visible');

        cy.step('Verify modal title indicates compare mode');
        cy.findByTestId('view-code-modal').should('contain.text', 'Compare Mode');
      },
    );
  });
});
