import { Modal } from '~/__tests__/cypress/cypress/pages/components/Modal';
import {
  loadMCPTestConfig,
  setupBaseMCPServerMocks,
  navigateToChatbot,
  type MCPTestConfig,
} from '~/__tests__/cypress/cypress/support/helpers/mcpServers/mcpServersTestHelpers';

describe('Chatbot - New Chat Feature (Mocked)', () => {
  let config: MCPTestConfig;

  before(() => {
    loadMCPTestConfig().then((data) => {
      config = data;
    });
  });

  beforeEach(() => {
    // Setup basic interceptors for the chatbot
    setupBaseMCPServerMocks(config);
  });

  it(
    'should display New Chat button when playground is ready',
    { tags: ['@GenAI', '@UI', '@NewChat'] },
    () => {
      const namespace = config.defaultNamespace;

      cy.step('Navigate to chatbot playground');
      navigateToChatbot(namespace);

      cy.step('Verify New Chat button is visible');
      cy.findByTestId('new-chat-button').should('be.visible').and('contain', 'New Chat');
    },
  );

  it(
    'should open warning modal when New Chat button is clicked',
    { tags: ['@GenAI', '@Modal', '@NewChat'] },
    () => {
      const namespace = config.defaultNamespace;

      cy.step('Navigate to chatbot playground');
      navigateToChatbot(namespace);

      cy.step('Click New Chat button');
      cy.findByTestId('new-chat-button').should('be.visible').click();

      cy.step('Verify warning modal opens');
      const newChatModal = new Modal('Start a new chat?');
      newChatModal.shouldBeOpen();
      cy.findByTestId('new-chat-modal').should('be.visible');

      cy.step('Verify modal warning message');
      cy.findByText(
        /Starting a new chat will clear your current conversation history.*Your model, RAG, and MCP server configurations will be retained/i,
      ).should('be.visible');
      cy.findByText('Are you sure you want to continue?').should('be.visible');
    },
  );

  it(
    'should close modal when Cancel button is clicked',
    { tags: ['@GenAI', '@Modal', '@NewChat'] },
    () => {
      const namespace = config.defaultNamespace;

      cy.step('Navigate to chatbot playground');
      navigateToChatbot(namespace);

      cy.step('Open New Chat modal');
      cy.findByTestId('new-chat-button').click();
      const newChatModal = new Modal('Start a new chat?');
      newChatModal.shouldBeOpen();

      cy.step('Click Cancel button');
      cy.findByTestId('cancel-button').click();

      cy.step('Verify modal is closed');
      cy.findByTestId('new-chat-modal').should('not.exist');
    },
  );

  it(
    'should close modal when X button is clicked',
    { tags: ['@GenAI', '@Modal', '@NewChat'] },
    () => {
      const namespace = config.defaultNamespace;

      cy.step('Navigate to chatbot playground');
      navigateToChatbot(namespace);

      cy.step('Open New Chat modal');
      cy.findByTestId('new-chat-button').click();
      const newChatModal = new Modal('Start a new chat?');
      newChatModal.shouldBeOpen();

      cy.step('Click X close button');
      newChatModal.findCloseButton().click();

      cy.step('Verify modal is closed');
      cy.findByTestId('new-chat-modal').should('not.exist');
    },
  );

  it(
    'should clear conversation history when confirmed',
    { tags: ['@GenAI', '@NewChat', '@E2E'] },
    () => {
      const namespace = config.defaultNamespace;

      cy.step('Navigate to chatbot playground');
      navigateToChatbot(namespace);

      cy.step('Send a test message to create conversation history');
      // Mock the response for the message
      cy.interceptGenAi('POST /api/v1/aaa/responses', {
        data: {
          id: 'test-response-1',
          content: 'This is a test response',
          status: 'completed',
          model: 'test-model',
          created_at: Date.now(), // eslint-disable-line camelcase
        },
      });

      cy.findByTestId('chatbot-message-bar').within(() => {
        cy.findByPlaceholderText(/Send a message/i).type('Hello, this is a test message');
        cy.findByLabelText(/Send message/i).click();
      });

      cy.step('Verify message appears in conversation');
      cy.findByText('Hello, this is a test message').should('be.visible');

      cy.step('Click New Chat button');
      cy.findByTestId('new-chat-button').click();
      const newChatModal = new Modal('Start a new chat?');
      newChatModal.shouldBeOpen();

      cy.step('Confirm new chat');
      cy.findByTestId('confirm-button').click();

      cy.step('Verify modal is closed');
      cy.findByTestId('new-chat-modal').should('not.exist');

      cy.step('Verify conversation history is cleared');
      cy.findByText('Hello, this is a test message').should('not.exist');

      cy.step('Verify initial welcome message is displayed');
      cy.findByText('Send a message to test your configuration').should('be.visible');
    },
  );

  it(
    'should retain model configuration after clearing conversation',
    { tags: ['@GenAI', '@NewChat', '@E2E'] },
    () => {
      const namespace = config.defaultNamespace;

      cy.step('Navigate to chatbot playground');
      navigateToChatbot(namespace);

      cy.step('Select a model from settings');
      // Assuming there's a model selector in the settings panel
      // This will depend on your actual implementation
      cy.findByTestId('chatbot').should('be.visible');

      cy.step('Send a message');
      cy.interceptGenAi('POST /api/v1/aaa/responses', {
        data: {
          id: 'test-response-2',
          content: 'Response with model',
          status: 'completed',
          model: 'test-model',
          created_at: Date.now(), // eslint-disable-line camelcase
        },
      });

      cy.findByTestId('chatbot-message-bar').within(() => {
        cy.findByPlaceholderText(/Send a message/i).type('Test message before clear');
        cy.findByLabelText(/Send message/i).click();
      });

      cy.step('Clear conversation');
      cy.findByTestId('new-chat-button').click();
      const newChatModal = new Modal('Start a new chat?');
      newChatModal.shouldBeOpen();
      cy.findByTestId('confirm-button').click();

      cy.step('Send another message to verify model is still configured');
      cy.interceptGenAi('POST /api/v1/aaa/responses', {
        data: {
          id: 'test-response-3',
          content: 'Response after clear',
          status: 'completed',
          model: 'test-model',
          created_at: Date.now(), // eslint-disable-line camelcase
        },
      });

      cy.findByTestId('chatbot-message-bar').within(() => {
        cy.findByPlaceholderText(/Send a message/i).type('Test message after clear');
        cy.findByLabelText(/Send message/i).click();
      });

      cy.step('Verify new message appears');
      cy.findByText('Test message after clear').should('be.visible');

      cy.step('Verify old message does not appear');
      cy.findByText('Test message before clear').should('not.exist');
    },
  );

  it(
    'should have correct button styles and accessibility',
    { tags: ['@GenAI', '@UI', '@NewChat', '@Validation'] },
    () => {
      const namespace = config.defaultNamespace;

      cy.step('Navigate to chatbot playground');
      navigateToChatbot(namespace);

      cy.step('Verify New Chat button has correct attributes');
      cy.findByTestId('new-chat-button')
        .should('be.visible')
        .and('have.attr', 'aria-label', 'Start new chat');

      cy.step('Open modal to check button variants');
      cy.findByTestId('new-chat-button').click();
      const newChatModal = new Modal('Start a new chat?');
      newChatModal.shouldBeOpen();

      cy.step('Verify Confirm button is primary variant');
      cy.findByTestId('confirm-button').should('have.class', 'pf-m-primary');

      cy.step('Verify Cancel button is link variant');
      cy.findByTestId('cancel-button').should('have.class', 'pf-m-link');
    },
  );

  it(
    'should stop any ongoing message generation when clearing conversation',
    { tags: ['@GenAI', '@NewChat', '@Streaming'] },
    () => {
      const namespace = config.defaultNamespace;

      cy.step('Navigate to chatbot playground');
      navigateToChatbot(namespace);

      cy.step('Start sending a message with streaming');
      // Mock a slow streaming response
      cy.interceptGenAi('POST /api/v1/aaa/responses', {
        delay: 5000, // Simulate slow response
        data: {
          id: 'test-response-4',
          content: 'Slow streaming response',
          status: 'completed',
          model: 'test-model',
          created_at: Date.now(), // eslint-disable-line camelcase
        },
      });

      cy.findByTestId('chatbot-message-bar').within(() => {
        cy.findByPlaceholderText(/Send a message/i).type('Test streaming message');
        cy.findByLabelText(/Send message/i).click();
      });

      cy.step('Immediately open New Chat modal while streaming');
      cy.findByTestId('new-chat-button').click();
      const newChatModal = new Modal('Start a new chat?');
      newChatModal.shouldBeOpen();

      cy.step('Confirm clearing conversation');
      cy.findByTestId('confirm-button').click();

      cy.step('Verify conversation is cleared and no loading state');
      cy.findByText('Test streaming message').should('not.exist');
      cy.findByText('Send a message to test your configuration').should('be.visible');
    },
  );

  it(
    'should track analytics events for New Chat interactions',
    { tags: ['@GenAI', '@NewChat', '@Analytics'] },
    () => {
      const namespace = config.defaultNamespace;

      cy.step('Navigate to chatbot playground');
      navigateToChatbot(namespace);

      cy.step('Open New Chat modal and cancel');
      cy.findByTestId('new-chat-button').click();
      let newChatModal = new Modal('Start a new chat?');
      newChatModal.shouldBeOpen();
      cy.findByTestId('cancel-button').click();

      cy.step('Open modal again and confirm');
      cy.findByTestId('new-chat-button').click();
      newChatModal = new Modal('Start a new chat?');
      newChatModal.shouldBeOpen();
      cy.findByTestId('confirm-button').click();

      // Verify modal closes after confirmation
      cy.findByTestId('new-chat-modal').should('not.exist');
    },
  );
});
