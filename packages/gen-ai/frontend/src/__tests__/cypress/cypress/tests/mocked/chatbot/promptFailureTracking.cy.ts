/* eslint-disable camelcase */
import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { chatbotPage } from '~/__tests__/cypress/cypress/pages/chatbotPage';
import {
  createPromptModal,
  promptAssistant,
} from '~/__tests__/cypress/cypress/pages/promptManagementPage';
import {
  loadMCPTestConfig,
  setupBaseMCPServerMocks,
  type MCPTestConfig,
} from '~/__tests__/cypress/cypress/support/helpers/mcpServers/mcpServersTestHelpers';
import { mockMCPServers } from '~/__tests__/cypress/cypress/__mocks__';
import { captureTracking, expectSafeTracking } from '@odh-dashboard/cypress/cypress/utils/analytics';

describe('Prompt failure tracking', () => {
  let config: MCPTestConfig;
  before(() =>
    loadMCPTestConfig().then((data) => {
      config = data;
    }),
  );

  it('should retain the save diagnostic without sending it to analytics', () => {
    const namespace = config.defaultNamespace;
    const message = 'Private prompt payload could not be saved';
    setupBaseMCPServerMocks(config, {
      lsdStatus: 'Ready',
      includeLsdModel: true,
      includeAAModel: true,
    });
    cy.interceptGenAi('GET /api/v1/aaa/mcps', { query: { namespace } }, mockMCPServers([]));
    cy.interceptGenAi('GET /api/v1/config', {
      data: { isCustomLSD: false, sandboxesAvailable: true },
    }).as('bffConfig');
    cy.intercept('GET', '**/api/v1/mcp/status**', {
      statusCode: 200,
      body: { status: 'ready' },
    });
    cy.intercept('POST', '**/api/v1/mlflow/prompts**', {
      statusCode: 500,
      body: { error: { message } },
    }).as('saveFailure');
    appChrome.visit(['genAiStudio', 'promptManagement']);
    chatbotPage.visit(namespace);
    chatbotPage.verifyOnChatbotPage(namespace);
    cy.wait('@bffConfig');
    cy.wait('@aaModels');
    chatbotPage.findSettingsButton().then(($btn) => {
      if ($btn.attr('aria-expanded') !== 'true') {
        cy.wrap($btn).click();
      }
    });
    chatbotPage.findPromptTab().click();
    promptAssistant.findTextarea().clear().type('You are a code reviewer.');
    promptAssistant.findSaveButton().should('be.enabled').click();
    createPromptModal.findNameInput().type('privacy-test-prompt');
    captureTracking();
    createPromptModal.findSaveButton().click();
    cy.wait('@saveFailure');
    createPromptModal.find().should('contain.text', message);
    expectSafeTracking(
      'Playground Prompt Saved',
      { success: false, error: 'unknown_error' },
      message,
    );
  });
});
