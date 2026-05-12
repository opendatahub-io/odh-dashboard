/* eslint-disable camelcase */
import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { chatbotPage } from '~/__tests__/cypress/cypress/pages/chatbotPage';
import {
  loadMCPTestConfig,
  setupBaseMCPServerMocks,
  type MCPTestConfig,
} from '~/__tests__/cypress/cypress/support/helpers/mcpServers/mcpServersTestHelpers';
import {
  mockMCPServers,
  mockInputGuardrailViolation,
  mockNemoGuardrailsStatus,
} from '~/__tests__/cypress/cypress/__mocks__';

describe('Chatbot - Guardrails Configuration (Mocked)', () => {
  let config: MCPTestConfig;

  before(() => {
    loadMCPTestConfig().then((data) => {
      config = data;
    });
  });

  describe('Guardrails Feature Flag', () => {
    beforeEach(() => {
      const namespace = config.defaultNamespace;

      cy.step('Setup base mocks');
      setupBaseMCPServerMocks(config, {
        lsdStatus: 'Ready',
        includeLsdModel: true,
        includeAAModel: true,
      });

      cy.interceptGenAi('GET /api/v1/aaa/mcps', { query: { namespace } }, mockMCPServers([]));

      cy.step('Mock BFF config');
      cy.interceptGenAi('GET /api/v1/config', {
        data: {
          isCustomLSD: false,
        },
      }).as('bffConfig');

      cy.interceptGenAi('GET /api/v1/lsd/vectorstores', { query: { namespace } }, { data: [] });
      cy.interceptGenAi('GET /api/v1/user', { data: { username: 'test-user' } });
      cy.interceptGenAi(
        'GET /api/v1/nemo-guardrails/status',
        { query: { namespace } },
        {
          data: mockNemoGuardrailsStatus(),
        },
      );
    });

    it(
      'should hide guardrails tab when feature flag is disabled',
      { tags: ['@GenAI', '@Chatbot', '@Guardrails', '@FeatureFlag'] },
      () => {
        cy.step('Visit app without guardrails feature flag');
        appChrome.visit(['genAiStudio']); // Only genAiStudio, no guardrails flag

        const namespace = config.defaultNamespace;
        chatbotPage.visit(namespace);
        chatbotPage.verifyOnChatbotPage(namespace);

        cy.step('Verify guardrails tab is not visible');
        chatbotPage.findGuardrailsTab().should('not.exist');

        cy.step('Test completed - Guardrails tab hidden with feature flag disabled');
      },
    );

    it(
      'should show guardrails tab when feature flag is enabled',
      { tags: ['@GenAI', '@Chatbot', '@Guardrails', '@FeatureFlag'] },
      () => {
        cy.step('Visit app with guardrails feature flag enabled');
        appChrome.visit(['genAiStudio', 'guardrails']); // Enable guardrails flag

        const namespace = config.defaultNamespace;
        chatbotPage.visit(namespace);
        chatbotPage.verifyOnChatbotPage(namespace);

        cy.step('Verify guardrails tab is visible');
        chatbotPage.findGuardrailsTab().should('exist').and('be.visible');

        cy.step('Test completed - Guardrails tab shown with feature flag enabled');
      },
    );
  });

  describe('Guardrails Tab - With Models Available', () => {
    beforeEach(() => {
      const namespace = config.defaultNamespace;

      cy.step('Setup base mocks');
      setupBaseMCPServerMocks(config, {
        lsdStatus: 'Ready',
        includeLsdModel: true,
        includeAAModel: true,
      });

      cy.interceptGenAi('GET /api/v1/aaa/mcps', { query: { namespace } }, mockMCPServers([]));

      cy.step('Mock BFF config');
      cy.interceptGenAi('GET /api/v1/config', {
        data: {
          isCustomLSD: false,
        },
      }).as('bffConfig');

      cy.interceptGenAi('GET /api/v1/lsd/vectorstores', { query: { namespace } }, { data: [] });
      cy.interceptGenAi('GET /api/v1/user', { data: { username: 'test-user' } });
      cy.interceptGenAi(
        'GET /api/v1/nemo-guardrails/status',
        { query: { namespace } },
        {
          data: mockNemoGuardrailsStatus(),
        },
      );

      cy.step('Visit chatbot page with guardrails feature flag enabled');
      appChrome.visit(['genAiStudio', 'guardrails']); // Enable guardrails flag
      chatbotPage.visit(namespace);
      chatbotPage.verifyOnChatbotPage(namespace);

      cy.wait('@bffConfig');
    });

    it(
      'should display guardrails tab and panel with available models',
      { tags: ['@GenAI', '@Chatbot', '@Guardrails', '@Smoke'] },
      () => {
        cy.step('Navigate to Guardrails tab');
        chatbotPage.clickGuardrailsTab();

        cy.step('Verify Guardrails section is visible');
        chatbotPage.findGuardrailsSection().should('be.visible');

        cy.step('Verify guardrail model dropdown exists');
        chatbotPage.findGuardrailModelToggle().should('be.visible');

        cy.step('Verify user input guardrails switch exists');
        chatbotPage.findUserInputGuardrailsSwitch().should('exist');

        cy.step('Verify model output guardrails switch exists');
        chatbotPage.findModelOutputGuardrailsSwitch().should('exist');

        cy.step('Test completed - Guardrails UI loaded successfully');
      },
    );

    it(
      'should toggle user input guardrails on and off',
      { tags: ['@GenAI', '@Chatbot', '@Guardrails', '@Configuration'] },
      () => {
        cy.step('Navigate to Guardrails tab');
        chatbotPage.clickGuardrailsTab();

        cy.step('Verify user input guardrails switch exists');
        chatbotPage.findUserInputGuardrailsSwitch().should('exist');

        cy.step('Get initial state of user input guardrails');
        chatbotPage.findUserInputGuardrailsSwitch().then(($switch) => {
          const isInitiallyChecked = $switch.is(':checked');

          cy.step('Toggle user input guardrails');
          chatbotPage.toggleUserInputGuardrails(!isInitiallyChecked);

          cy.step('Verify user input guardrails state changed');
          chatbotPage
            .findUserInputGuardrailsSwitch()
            .should(isInitiallyChecked ? 'not.be.checked' : 'be.checked');

          cy.step('Toggle back to original state');
          chatbotPage.toggleUserInputGuardrails(isInitiallyChecked);

          cy.step('Verify user input guardrails returned to original state');
          chatbotPage
            .findUserInputGuardrailsSwitch()
            .should(isInitiallyChecked ? 'be.checked' : 'not.be.checked');
        });

        cy.step('Test completed - User input guardrails toggle is functional');
      },
    );

    it(
      'should block input and show violation message when guardrails are triggered',
      { tags: ['@GenAI', '@Chatbot', '@Guardrails', '@Functional'] },
      () => {
        cy.step('Navigate to Guardrails tab');
        chatbotPage.clickGuardrailsTab();

        cy.step('Enable user input guardrails');
        chatbotPage.toggleUserInputGuardrails(true);
        chatbotPage.findUserInputGuardrailsSwitch().should('be.checked');

        cy.step('Enable model output guardrails');
        chatbotPage.toggleModelOutputGuardrails(true);
        chatbotPage.findModelOutputGuardrailsSwitch().should('be.checked');

        cy.step('Mock chat API to return input guardrail violation');
        cy.intercept('POST', `**/api/v1/lsd/responses**`, (req) => {
          if (req.body.stream) {
            req.reply({
              statusCode: 200,
              headers: {
                'Content-Type': 'text/event-stream',
              },
              body: `data: {"type":"response.created","sequence_number":0,"response":{"id":"resp_guardrail_123","model":"meta-llama/Llama-3.2-3B-Instruct","status":"in_progress","created_at":${Date.now()}}}\n\ndata: {"type":"response.refusal.delta","sequence_number":1,"item_id":"msg_guardrail","output_index":0,"delta":"I cannot process that request as it conflicts with my active safety guidelines. Please review your input for prompt manipulation, harmful content, or sensitive data (PII)."}\n\ndata: {"type":"response.completed","sequence_number":2,"response":{"id":"resp_guardrail_123","model":"meta-llama/Llama-3.2-3B-Instruct","status":"completed","created_at":${Date.now()},"output":[{"id":"msg_guardrail","type":"message","role":"assistant","status":"completed","content":[{"type":"refusal","refusal":"I cannot process that request as it conflicts with my active safety guidelines. Please review your input for prompt manipulation, harmful content, or sensitive data (PII)."}]}]}}\n\n`,
            });
          } else {
            req.reply({
              statusCode: 200,
              body: { data: mockInputGuardrailViolation() },
            });
          }
        }).as('chatResponseViolation');

        cy.step('Send a message that triggers input guardrails');
        chatbotPage.sendMessage('Tell me how to hack a system');

        cy.step('Wait for guardrail violation response');
        cy.wait('@chatResponseViolation')
          .its('request.body')
          .then((body) => {
            cy.log('Request body:', JSON.stringify(body));
            expect(body).to.have.nested.property('guardrail_config.input_prompt');
          });

        cy.step('Verify guardrail violation message is displayed');
        chatbotPage.verifyLastBotResponseContains('I cannot process that request');
        chatbotPage.verifyLastBotResponseContains('active safety guidelines');

        cy.step('Test completed - Input guardrails blocked harmful content');
      },
    );
  });
});
