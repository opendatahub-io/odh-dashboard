/* eslint-disable camelcase */
import { appChrome } from '~/__tests__/cypress/cypress/pages/appChrome';
import { chatbotPage } from '~/__tests__/cypress/cypress/pages/chatbotPage';
import {
  promptManagementModal,
  promptDrawer,
  createPromptModal,
  promptAssistant,
} from '~/__tests__/cypress/cypress/pages/promptManagementPage';
import {
  loadMCPTestConfig,
  setupBaseMCPServerMocks,
  type MCPTestConfig,
} from '~/__tests__/cypress/cypress/support/helpers/mcpServers/mcpServersTestHelpers';
import {
  mockMCPServers,
  mockMLflowPromptsList,
  mockMLflowPromptVersion,
  mockMLflowPromptVersionsResponse,
} from '~/__tests__/cypress/cypress/__mocks__';

const openSettingsPromptTab = (): void => {
  chatbotPage.findSettingsButton().then(($btn) => {
    if ($btn.attr('aria-expanded') !== 'true') {
      cy.wrap($btn).click();
    }
  });
  chatbotPage.findPromptTab().click();
};

const setupPromptMocks = (namespace: string): void => {
  cy.interceptGenAi(
    'GET /api/v1/mlflow/prompts',
    { query: { namespace } },
    mockMLflowPromptsList(),
  ).as('listPrompts');

  cy.intercept('GET', '**/api/v1/mlflow/prompts/*/versions**', {
    statusCode: 200,
    body: mockMLflowPromptVersionsResponse(),
  }).as('listVersions');

  cy.intercept('GET', '**/api/v1/mlflow/prompts/*', (req) => {
    if (req.url.includes('/versions')) {
      return;
    }
    req.reply({
      statusCode: 200,
      body: {
        data: mockMLflowPromptVersion({
          name: 'summarization-prompt',
          template: 'You are a helpful summarization assistant.',
        }),
      },
    });
  }).as('getPrompt');

  cy.intercept('POST', '**/api/v1/mlflow/prompts**', {
    statusCode: 200,
    body: {
      data: mockMLflowPromptVersion({
        name: 'my-new-prompt',
        version: 1,
        template: 'You are a helpful assistant.',
        commit_message: 'First version',
      }),
    },
  }).as('createPrompt');
};

describe('Chatbot - Prompt Management (Mocked)', () => {
  let config: MCPTestConfig;

  before(() => {
    loadMCPTestConfig().then((data) => {
      config = data;
    });
  });

  describe('Feature Flag', () => {
    it(
      'should show legacy system instructions when prompt management flag is off',
      { tags: ['@GenAI', '@PromptManagement', '@FeatureFlag'] },
      () => {
        const namespace = config.defaultNamespace;

        cy.step('Setup base mocks without promptManagement flag');
        setupBaseMCPServerMocks(config, {
          lsdStatus: 'Ready',
          includeLsdModel: true,
          includeAAModel: true,
        });
        cy.interceptGenAi('GET /api/v1/aaa/mcps', { query: { namespace } }, mockMCPServers([]));
        cy.interceptGenAi('GET /api/v1/config', { data: { isCustomLSD: false } }).as('bffConfig');
        cy.intercept('GET', '**/api/v1/mcp/status**', {
          statusCode: 200,
          body: { status: 'ready' },
        });

        cy.step('Visit page without promptManagement flag');
        appChrome.visit(['genAiStudio']);
        chatbotPage.visit(namespace);
        chatbotPage.verifyOnChatbotPage(namespace);
        cy.wait('@bffConfig');
        cy.wait('@aaModels');

        cy.step('Open prompt tab and verify legacy section');
        openSettingsPromptTab();
        promptAssistant.findSystemInstructionsSection().should('exist');
        promptAssistant.findPromptInstructionsSection().should('not.exist');
      },
    );

    it(
      'should show prompt assistant when prompt management flag is on',
      { tags: ['@GenAI', '@PromptManagement', '@FeatureFlag'] },
      () => {
        const namespace = config.defaultNamespace;

        cy.step('Setup base mocks with promptManagement flag');
        setupBaseMCPServerMocks(config, {
          lsdStatus: 'Ready',
          includeLsdModel: true,
          includeAAModel: true,
        });
        cy.interceptGenAi('GET /api/v1/aaa/mcps', { query: { namespace } }, mockMCPServers([]));
        cy.interceptGenAi('GET /api/v1/config', { data: { isCustomLSD: false } }).as('bffConfig');
        cy.intercept('GET', '**/api/v1/mcp/status**', {
          statusCode: 200,
          body: { status: 'ready' },
        });

        cy.step('Visit page with promptManagement flag');
        appChrome.visit(['genAiStudio', 'promptManagement']);
        chatbotPage.visit(namespace);
        chatbotPage.verifyOnChatbotPage(namespace);
        cy.wait('@bffConfig');
        cy.wait('@aaModels');

        cy.step('Open prompt tab and verify prompt assistant section');
        openSettingsPromptTab();
        promptAssistant.findPromptInstructionsSection().should('exist');
        promptAssistant.findSystemInstructionsSection().should('not.exist');
        promptAssistant.findLoadPromptButton().should('be.visible');
        promptAssistant.findNameTitle().should('contain.text', 'New Prompt');
      },
    );
  });

  describe('Prompt Table - Load Flow', () => {
    beforeEach(() => {
      const namespace = config.defaultNamespace;

      setupBaseMCPServerMocks(config, {
        lsdStatus: 'Ready',
        includeLsdModel: true,
        includeAAModel: true,
      });
      cy.interceptGenAi('GET /api/v1/aaa/mcps', { query: { namespace } }, mockMCPServers([]));
      cy.interceptGenAi('GET /api/v1/config', { data: { isCustomLSD: false } }).as('bffConfig');
      cy.intercept('GET', '**/api/v1/mcp/status**', {
        statusCode: 200,
        body: { status: 'ready' },
      });
      setupPromptMocks(namespace);

      appChrome.visit(['genAiStudio', 'promptManagement']);
      chatbotPage.visit(namespace);
      chatbotPage.verifyOnChatbotPage(namespace);
      cy.wait('@bffConfig');
      cy.wait('@aaModels');
    });

    it(
      'should load an existing prompt into the playground',
      { tags: ['@GenAI', '@PromptManagement'] },
      () => {
        cy.step('Open settings and click Load Prompt');
        openSettingsPromptTab();
        promptAssistant.findLoadPromptButton().click();

        cy.step('Verify prompt table is populated');
        cy.wait('@listPrompts');
        promptManagementModal.findTable().should('be.visible');
        promptManagementModal.findTableRow('summarization-prompt').should('exist');
        promptManagementModal.findTableRow('code-review-prompt').should('exist');
        promptManagementModal.findTableRow('translation-prompt').should('exist');

        cy.step('Select a prompt row to open the drawer');
        promptManagementModal.findTableRow('summarization-prompt').click();

        cy.step('Verify drawer shows version details');
        promptDrawer.findPanel().should('be.visible');
        promptDrawer.findTemplate().should('be.visible');

        cy.step('Click Load in Playground');
        promptManagementModal.findLoadButton().should('be.enabled').click();

        cy.step('Verify modal closed and system instruction updated');
        promptManagementModal.find().should('not.exist');
      },
    );

    it(
      'should show empty state when no prompts match search',
      { tags: ['@GenAI', '@PromptManagement'] },
      () => {
        cy.step('Open the prompt table');
        openSettingsPromptTab();
        promptAssistant.findLoadPromptButton().click();
        cy.wait('@listPrompts');
        promptManagementModal.findTable().should('be.visible');

        cy.step('Override intercept to return empty results for filtered query');
        cy.interceptGenAi('GET /api/v1/mlflow/prompts', null, mockMLflowPromptsList([])).as(
          'filteredListPrompts',
        );

        cy.step('Search for a non-existent prompt');
        promptManagementModal.findSearchInput().type('nonexistent-prompt');

        cy.step('Verify empty state is shown');
        cy.wait('@filteredListPrompts');
        promptManagementModal.findEmptyState().should('be.visible');
        promptManagementModal.findLoadButton().should('be.disabled');

        cy.step('Cancel and close');
        promptManagementModal.findCancelButton().click();
        promptManagementModal.find().should('not.exist');
      },
    );
  });

  describe('Create and Save Prompts', () => {
    beforeEach(() => {
      const namespace = config.defaultNamespace;

      setupBaseMCPServerMocks(config, {
        lsdStatus: 'Ready',
        includeLsdModel: true,
        includeAAModel: true,
      });
      cy.interceptGenAi('GET /api/v1/aaa/mcps', { query: { namespace } }, mockMCPServers([]));
      cy.interceptGenAi('GET /api/v1/config', { data: { isCustomLSD: false } }).as('bffConfig');
      cy.intercept('GET', '**/api/v1/mcp/status**', {
        statusCode: 200,
        body: { status: 'ready' },
      });
      setupPromptMocks(namespace);

      appChrome.visit(['genAiStudio', 'promptManagement']);
      chatbotPage.visit(namespace);
      chatbotPage.verifyOnChatbotPage(namespace);
      cy.wait('@bffConfig');
      cy.wait('@aaModels');

      openSettingsPromptTab();
    });

    it(
      'should create a new prompt and verify the POST payload',
      { tags: ['@GenAI', '@PromptManagement'] },
      () => {
        cy.step('Type new instructions in the prompt assistant');
        promptAssistant.findTextarea().clear().type('You are a code reviewer.');

        cy.step('Click Save to open the create modal');
        promptAssistant.findSaveButton().should('be.enabled').click();

        cy.step('Fill the create form');
        createPromptModal.find().should('be.visible');
        createPromptModal.findNameInput().type('my-new-prompt');
        createPromptModal.findCommitMessageInput().type('First version');

        cy.step('Submit and verify payload');
        createPromptModal.findSaveButton().click();
        cy.wait('@createPrompt').then((interception) => {
          expect(interception.request.body).to.have.property('name', 'my-new-prompt');
          expect(interception.request.body).to.have.property('create_only', true);
          expect(interception.request.body).to.have.property('commit_message', 'First version');
          expect(interception.request.body).to.have.property('messages');
        });
      },
    );

    it(
      'should save a new version of a loaded prompt',
      { tags: ['@GenAI', '@PromptManagement'] },
      () => {
        cy.step('Load an existing prompt');
        promptAssistant.findLoadPromptButton().click();
        cy.wait('@listPrompts');
        promptManagementModal.findTableRow('summarization-prompt').click();
        promptManagementModal.findLoadButton().should('be.enabled').click();

        cy.step('Edit the loaded prompt');
        promptAssistant.findEditButton().should('be.visible').click();
        promptAssistant.findTextarea().clear().type('You are an improved summarization assistant.');

        cy.step('Click Save to open the edit modal');
        promptAssistant.findSaveButton().should('be.enabled').click();

        cy.step('Verify edit modal shows name as read-only');
        createPromptModal.find().should('be.visible');
        createPromptModal.findNameInput().should('have.attr', 'readonly');

        cy.step('Fill commit message and submit');
        createPromptModal.findCommitMessageInput().type('Improved instructions');
        createPromptModal.findSaveButton().click();
        cy.wait('@createPrompt').then((interception) => {
          expect(interception.request.body).to.have.property('name', 'summarization-prompt');
          expect(interception.request.body).to.have.property('create_only', false);
          expect(interception.request.body).to.have.property(
            'commit_message',
            'Improved instructions',
          );
        });
      },
    );
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      const namespace = config.defaultNamespace;

      setupBaseMCPServerMocks(config, {
        lsdStatus: 'Ready',
        includeLsdModel: true,
        includeAAModel: true,
      });
      cy.interceptGenAi('GET /api/v1/aaa/mcps', { query: { namespace } }, mockMCPServers([]));
      cy.interceptGenAi('GET /api/v1/config', { data: { isCustomLSD: false } }).as('bffConfig');
      cy.intercept('GET', '**/api/v1/mcp/status**', {
        statusCode: 200,
        body: { status: 'ready' },
      });
      setupPromptMocks(namespace);

      appChrome.visit(['genAiStudio', 'promptManagement']);
      chatbotPage.visit(namespace);
      chatbotPage.verifyOnChatbotPage(namespace);
      cy.wait('@bffConfig');
      cy.wait('@aaModels');

      openSettingsPromptTab();
    });

    it(
      'should display error alert when save fails',
      { tags: ['@GenAI', '@PromptManagement'] },
      () => {
        cy.step('Type instructions and open create modal');
        promptAssistant.findTextarea().clear().type('You are a test assistant.');
        promptAssistant.findSaveButton().should('be.enabled').click();

        cy.step('Fill the create form');
        createPromptModal.find().should('be.visible');
        createPromptModal.findNameInput().type('failing-prompt');
        createPromptModal.findCommitMessageInput().type('This will fail');

        cy.step('Override intercept to return server error');
        cy.intercept('POST', '**/api/v1/mlflow/prompts**', {
          statusCode: 500,
          body: { error: { message: 'Internal server error' } },
        }).as('createPromptError');

        cy.step('Submit and verify error alert appears');
        createPromptModal.findSaveButton().click();
        cy.wait('@createPromptError');
        createPromptModal.findErrorAlert().should('be.visible');
        createPromptModal.find().should('exist');
        createPromptModal.findSaveButton().should('not.be.disabled');
      },
    );

    it(
      'should display name error when prompt already exists',
      { tags: ['@GenAI', '@PromptManagement'] },
      () => {
        cy.step('Type instructions and open create modal');
        promptAssistant.findTextarea().clear().type('Duplicate prompt instructions.');
        promptAssistant.findSaveButton().should('be.enabled').click();

        cy.step('Fill the create form with an existing name');
        createPromptModal.find().should('be.visible');
        createPromptModal.findNameInput().type('summarization-prompt');
        createPromptModal.findCommitMessageInput().type('Duplicate attempt');

        cy.step('Override intercept to return already exists error');
        cy.intercept('POST', '**/api/v1/mlflow/prompts**', {
          statusCode: 409,
          body: { error: { message: 'Prompt already exists' } },
        }).as('createPromptDuplicate');

        cy.step('Submit and verify name validation error');
        createPromptModal.findSaveButton().click();
        cy.wait('@createPromptDuplicate');
        createPromptModal.findNameError().should('be.visible');
        createPromptModal.findErrorAlert().should('not.exist');
      },
    );
  });

  describe('Version Switching', () => {
    beforeEach(() => {
      const namespace = config.defaultNamespace;

      setupBaseMCPServerMocks(config, {
        lsdStatus: 'Ready',
        includeLsdModel: true,
        includeAAModel: true,
      });
      cy.interceptGenAi('GET /api/v1/aaa/mcps', { query: { namespace } }, mockMCPServers([]));
      cy.interceptGenAi('GET /api/v1/config', { data: { isCustomLSD: false } }).as('bffConfig');
      cy.intercept('GET', '**/api/v1/mcp/status**', {
        statusCode: 200,
        body: { status: 'ready' },
      });

      cy.interceptGenAi(
        'GET /api/v1/mlflow/prompts',
        { query: { namespace } },
        mockMLflowPromptsList(),
      ).as('listPrompts');

      cy.intercept('GET', '**/api/v1/mlflow/prompts/*/versions**', {
        statusCode: 200,
        body: mockMLflowPromptVersionsResponse(),
      }).as('listVersions');

      cy.intercept('GET', '**/api/v1/mlflow/prompts/*', (req) => {
        if (req.url.includes('/versions')) {
          return;
        }
        const isVersion1 = req.url.includes('version=1');
        req.reply({
          statusCode: 200,
          body: {
            data: isVersion1
              ? mockMLflowPromptVersion({
                  name: 'summarization-prompt',
                  version: 1,
                  template: 'Original summarization instructions.',
                  commit_message: 'Initial version',
                })
              : mockMLflowPromptVersion({
                  name: 'summarization-prompt',
                  version: 2,
                  template: 'Updated summarization instructions.',
                  commit_message: 'Updated instructions',
                }),
          },
        });
      }).as('getPrompt');

      appChrome.visit(['genAiStudio', 'promptManagement']);
      chatbotPage.visit(namespace);
      chatbotPage.verifyOnChatbotPage(namespace);
      cy.wait('@bffConfig');
      cy.wait('@aaModels');
    });

    it(
      'should switch between versions in the drawer and update template content',
      { tags: ['@GenAI', '@PromptManagement'] },
      () => {
        cy.step('Open prompt table and select a prompt');
        openSettingsPromptTab();
        promptAssistant.findLoadPromptButton().click();
        cy.wait('@listPrompts');
        promptManagementModal.findTableRow('summarization-prompt').click();

        cy.step('Verify drawer opens with latest version selected');
        promptDrawer.findPanel().should('be.visible');
        promptDrawer.findTemplate().should('be.visible');

        cy.step('Open version select and choose Version 1');
        promptDrawer.findVersionSelect().click();
        cy.findByRole('option', { name: 'Version 1' }).click();

        cy.step('Verify template updated to version 1 content');
        promptDrawer.findTemplate().should('have.value', 'Original summarization instructions.');

        cy.step('Switch back to Version 2');
        promptDrawer.findVersionSelect().click();
        cy.findByRole('option', { name: 'Version 2' }).click();

        cy.step('Verify template updated to version 2 content');
        promptDrawer.findTemplate().should('have.value', 'Updated summarization instructions.');
      },
    );
  });

  describe('Pagination', () => {
    beforeEach(() => {
      const namespace = config.defaultNamespace;

      setupBaseMCPServerMocks(config, {
        lsdStatus: 'Ready',
        includeLsdModel: true,
        includeAAModel: true,
      });
      cy.interceptGenAi('GET /api/v1/aaa/mcps', { query: { namespace } }, mockMCPServers([]));
      cy.interceptGenAi('GET /api/v1/config', { data: { isCustomLSD: false } }).as('bffConfig');
      cy.intercept('GET', '**/api/v1/mcp/status**', {
        statusCode: 200,
        body: { status: 'ready' },
      });

      cy.interceptGenAi(
        'GET /api/v1/mlflow/prompts',
        { query: { namespace } },
        mockMLflowPromptsList(undefined, 'page-2-token'),
      ).as('listPromptsPage1');

      cy.intercept('GET', '**/api/v1/mlflow/prompts/*/versions**', {
        statusCode: 200,
        body: mockMLflowPromptVersionsResponse(),
      }).as('listVersions');

      cy.intercept('GET', '**/api/v1/mlflow/prompts/*', (req) => {
        if (req.url.includes('/versions')) {
          return;
        }
        req.reply({
          statusCode: 200,
          body: {
            data: mockMLflowPromptVersion({
              name: 'summarization-prompt',
              template: 'You are a helpful summarization assistant.',
            }),
          },
        });
      }).as('getPrompt');

      cy.intercept('POST', '**/api/v1/mlflow/prompts**', {
        statusCode: 200,
        body: {
          data: mockMLflowPromptVersion({
            name: 'my-new-prompt',
            version: 1,
            template: 'You are a helpful assistant.',
            commit_message: 'First version',
          }),
        },
      }).as('createPrompt');

      appChrome.visit(['genAiStudio', 'promptManagement']);
      chatbotPage.visit(namespace);
      chatbotPage.verifyOnChatbotPage(namespace);
      cy.wait('@bffConfig');
      cy.wait('@aaModels');
    });

    it(
      'should show pagination controls when more prompts are available',
      { tags: ['@GenAI', '@PromptManagement'] },
      () => {
        cy.step('Open prompt table');
        openSettingsPromptTab();
        promptAssistant.findLoadPromptButton().click();
        cy.wait('@listPromptsPage1');

        cy.step('Verify first page prompts are shown');
        promptManagementModal.findTable().should('be.visible');
        promptManagementModal.findTableRow('summarization-prompt').should('exist');
        promptManagementModal.findTableRow('code-review-prompt').should('exist');
        promptManagementModal.findTableRow('translation-prompt').should('exist');

        cy.step('Verify pagination controls are present');
        promptManagementModal.findPagination().should('exist');
      },
    );
  });

  describe('Revert and Reset', () => {
    beforeEach(() => {
      const namespace = config.defaultNamespace;

      setupBaseMCPServerMocks(config, {
        lsdStatus: 'Ready',
        includeLsdModel: true,
        includeAAModel: true,
      });
      cy.interceptGenAi('GET /api/v1/aaa/mcps', { query: { namespace } }, mockMCPServers([]));
      cy.interceptGenAi('GET /api/v1/config', { data: { isCustomLSD: false } }).as('bffConfig');
      cy.intercept('GET', '**/api/v1/mcp/status**', {
        statusCode: 200,
        body: { status: 'ready' },
      });
      setupPromptMocks(namespace);

      appChrome.visit(['genAiStudio', 'promptManagement']);
      chatbotPage.visit(namespace);
      chatbotPage.verifyOnChatbotPage(namespace);
      cy.wait('@bffConfig');
      cy.wait('@aaModels');

      openSettingsPromptTab();
    });

    it(
      'should revert edits on a loaded prompt and reset to default',
      { tags: ['@GenAI', '@PromptManagement'] },
      () => {
        cy.step('Load an existing prompt');
        promptAssistant.findLoadPromptButton().click();
        cy.wait('@listPrompts');
        promptManagementModal.findTableRow('summarization-prompt').click();
        promptManagementModal.findLoadButton().should('be.enabled').click();

        cy.step('Verify prompt loaded into assistant');
        promptAssistant.findEditButton().should('be.visible').click();

        cy.step('Edit the prompt');
        promptAssistant.findTextarea().clear().type('Some temporary edits');
        promptAssistant.findUnsavedIndicator().should('exist');
        promptAssistant.findSaveButton().should('be.enabled');

        cy.step('Revert edits');
        promptAssistant.findRevertButton().should('be.enabled').click();
        cy.findByRole('dialog').findByRole('button', { name: 'Revert' }).click();

        cy.step('Verify reverted to original template');
        promptAssistant.findEditButton().should('be.visible');

        cy.step('Reset to default');
        promptAssistant.findResetButton().should('be.visible').click();

        cy.step('Verify reset to new prompt state');
        promptAssistant.findNameTitle().should('contain.text', 'New Prompt');

        cy.step('Edit new prompt to trigger unsaved state');
        promptAssistant.findTextarea().clear().type('Unsaved draft instructions');

        cy.step('Click Reset and confirm the dialog');
        promptAssistant.findResetButton().should('be.enabled').click();
        cy.findByTestId('confirmation-modal').should('be.visible');
        cy.findByTestId('confirmation-modal-confirm').click();

        cy.step('Verify reset back to new prompt state');
        promptAssistant.findNameTitle().should('contain.text', 'New Prompt');
      },
    );
  });
});
