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
  mockSafetyConfig,
  mockEmptySafetyConfig,
  mockInputGuardrailViolation,
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

      // Mock additional endpoints that the playground calls
      cy.interceptGenAi('GET /api/v1/lsd/vectorstores', { query: { namespace } }, { data: [] });
      cy.interceptGenAi('GET /api/v1/user', { data: { username: 'test-user' } });

      cy.step('Mock guardrails safety config');
      cy.interceptGenAi(
        'GET /api/v1/lsd/safety',
        { query: { namespace } },
        { data: mockSafetyConfig([{ model_name: 'llama-guard-3' }]) },
      ).as('safetyConfig');
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

      // Mock additional endpoints that the playground calls
      cy.interceptGenAi('GET /api/v1/lsd/vectorstores', { query: { namespace } }, { data: [] });
      cy.interceptGenAi('GET /api/v1/user', { data: { username: 'test-user' } });

      cy.step('Mock guardrails safety config with multiple models');
      cy.interceptGenAi(
        'GET /api/v1/lsd/safety',
        { query: { namespace } },
        {
          data: mockSafetyConfig([
            { model_name: 'llama-guard-3' },
            { model_name: 'llama-guard-2' },
            { model_name: 'granite-guardian' },
          ]),
        },
      ).as('safetyConfig');

      cy.step('Visit chatbot page with guardrails feature flag enabled');
      appChrome.visit(['genAiStudio', 'guardrails']); // Enable guardrails flag
      chatbotPage.visit(namespace);
      chatbotPage.verifyOnChatbotPage(namespace);

      cy.wait('@bffConfig');
      cy.wait('@safetyConfig');
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
      'should allow selecting a guardrail model',
      { tags: ['@GenAI', '@Chatbot', '@Guardrails', '@UI'] },
      () => {
        cy.step('Navigate to Guardrails tab');
        chatbotPage.clickGuardrailsTab();

        cy.step('Open guardrail model dropdown');
        chatbotPage.findGuardrailModelToggle().click();

        cy.step('Verify available models are shown in dropdown menu');
        cy.findByRole('option', { name: 'llama-guard-3' }).should('be.visible');
        cy.findByRole('option', { name: 'llama-guard-2' }).should('be.visible');
        cy.findByRole('option', { name: 'granite-guardian' }).should('be.visible');

        cy.step('Select llama-guard-2 model');
        cy.findByRole('option', { name: 'llama-guard-2' }).click();

        cy.step('Verify selected model is displayed');
        chatbotPage.findGuardrailModelToggle().should('contain.text', 'llama-guard-2');

        cy.step('Test completed - Model selection is functional');
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

        cy.step('Select a guardrail model');
        chatbotPage.selectGuardrailModel('llama-guard-3');
        chatbotPage.findGuardrailModelToggle().should('contain.text', 'llama-guard-3');

        cy.step('Enable user input guardrails');
        chatbotPage.toggleUserInputGuardrails(true);
        chatbotPage.findUserInputGuardrailsSwitch().should('be.checked');

        cy.step('Enable model output guardrails');
        chatbotPage.toggleModelOutputGuardrails(true);
        chatbotPage.findModelOutputGuardrailsSwitch().should('be.checked');

        cy.step('Mock chat API to return input guardrail violation');
        cy.intercept('POST', `**/api/v1/lsd/responses**`, (req) => {
          if (req.body.stream) {
            // Streaming response with guardrail violation
            req.reply({
              statusCode: 200,
              headers: {
                'Content-Type': 'text/event-stream',
              },
              body: `data: {"type":"response.created","sequence_number":0,"response":{"id":"resp_guardrail_123","model":"meta-llama/Llama-3.2-3B-Instruct","status":"in_progress","created_at":${Date.now()}}}\n\ndata: {"type":"response.refusal.delta","sequence_number":1,"item_id":"msg_guardrail","output_index":0,"delta":"I cannot process that request as it conflicts with my active safety guidelines. Please review your input for prompt manipulation, harmful content, or sensitive data (PII)."}\n\ndata: {"type":"response.completed","sequence_number":2,"response":{"id":"resp_guardrail_123","model":"meta-llama/Llama-3.2-3B-Instruct","status":"completed","created_at":${Date.now()},"output":[{"id":"msg_guardrail","type":"message","role":"assistant","status":"completed","content":[{"type":"refusal","refusal":"I cannot process that request as it conflicts with my active safety guidelines. Please review your input for prompt manipulation, harmful content, or sensitive data (PII)."}]}]}}\n\n`,
            });
          } else {
            // Non-streaming response
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
            expect(body).to.have.property('input_shield_id', 'trustyai_input');
            expect(body).to.have.property('output_shield_id', 'trustyai_output');
          });

        cy.step('Verify guardrail violation message is displayed');
        chatbotPage.verifyLastBotResponseContains('I cannot process that request');
        chatbotPage.verifyLastBotResponseContains('active safety guidelines');

        cy.step('Test completed - Input guardrails blocked harmful content');
      },
    );
  });

  describe('Guardrails Tab - No Models Available', () => {
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

      // Mock additional endpoints that the playground calls
      cy.interceptGenAi('GET /api/v1/lsd/vectorstores', { query: { namespace } }, { data: [] });
      cy.interceptGenAi('GET /api/v1/user', { data: { username: 'test-user' } });

      cy.step('Mock empty safety config (no guardrails)');
      cy.interceptGenAi(
        'GET /api/v1/lsd/safety',
        { query: { namespace } },
        { data: mockEmptySafetyConfig() },
      ).as('safetyConfig');

      cy.step('Visit chatbot page with guardrails feature flag enabled');
      appChrome.visit(['genAiStudio', 'guardrails']); // Enable guardrails flag
      chatbotPage.visit(namespace);
      chatbotPage.verifyOnChatbotPage(namespace);

      cy.wait('@bffConfig');
      cy.wait('@safetyConfig');
    });

    it(
      'should display error state when API fails to load guardrails',
      { tags: ['@GenAI', '@Chatbot', '@Guardrails', '@Error'] },
      () => {
        const namespace = config.defaultNamespace;

        cy.step('Mock safety config API to return 500 error');
        cy.interceptGenAi(
          'GET /api/v1/lsd/safety',
          { query: { namespace } },
          { statusCode: 500, body: { error: 'Internal Server Error' } },
        ).as('safetyConfigError');

        cy.step('Reload page to trigger error');
        chatbotPage.visit(namespace);
        chatbotPage.verifyOnChatbotPage(namespace);

        cy.step('Navigate to Guardrails tab');
        chatbotPage.clickGuardrailsTab();

        cy.step('Verify error state is displayed');
        cy.findByTestId('guardrails-error-state').should('be.visible');

        cy.step('Verify error message');
        cy.findByText(/Failed to load guardrails/i).should('be.visible');
        cy.findByText(/Unable to load guardrail configuration/i).should('be.visible');

        cy.step('Verify guardrails panel is not displayed');
        chatbotPage.findGuardrailModelToggle().should('not.exist');

        cy.step('Test completed - Error state displayed correctly');
      },
    );

    it(
      'should display empty state when no guardrail models are available',
      { tags: ['@GenAI', '@Chatbot', '@Guardrails', '@EmptyState'] },
      () => {
        cy.step('Navigate to Guardrails tab');
        chatbotPage.clickGuardrailsTab();

        cy.step('Verify empty state is displayed');
        chatbotPage.findGuardrailsEmptyState().should('be.visible');

        cy.step('Verify empty state message');
        cy.findByText(/No guardrail configuration found/i).should('be.visible');
        cy.findByText(/Contact a cluster administrator/i).should('be.visible');

        cy.step('Verify guardrails panel is not displayed');
        chatbotPage.findGuardrailModelToggle().should('not.exist');

        cy.step('Test completed - Empty state displayed correctly');
      },
    );
  });
});
