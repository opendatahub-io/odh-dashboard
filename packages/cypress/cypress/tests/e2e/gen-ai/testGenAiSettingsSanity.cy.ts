import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  deleteOpenShiftProject,
  waitForUserProjectAccess,
} from '../../../utils/oc_commands/project';
import { waitForOGXServerReady } from '../../../utils/oc_commands/ogxServer';
import { waitForResource, waitForPodReady } from '../../../utils/oc_commands/baseCommands';
import {
  enableExternalProviders,
  disableExternalProviders,
  verifyEndpointResourcesCleanedUp,
  waitForModelInLSD,
  forceDashboardConfigRefresh,
  createGenAiPromptViaAPI,
  deleteGenAiPromptViaAPI,
} from '../../../utils/oc_commands/genAi';
import {
  enableMlflowBackend,
  disablePromptManagementFeatures,
} from '../../../utils/oc_commands/mlflow';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { CustomEndpointTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import { genAiPlayground } from '../../../pages/genAiPlayground';

const ALLOWED_ENDPOINT_HOSTS = ['generativelanguage.googleapis.com'];

describe('Verify settings in playground using custom endpoint', { testIsolation: false }, () => {
  let testData: CustomEndpointTestData;
  const projectName = `custom-ep-e2e-${generateTestUUID()}`;

  retryableBefore(() => {
    cy.fixture('e2e/genAi/testGenAiSettingsSanity.yaml', 'utf8').then((yamlContent: string) => {
      testData = yaml.load(yamlContent) as CustomEndpointTestData;

      const apiKey = Cypress.env('GEMINI_API_KEY');
      if (!apiKey) {
        throw new Error(
          'GEMINI_API_KEY is not set in test-variables.yml — cannot run custom endpoint tests',
        );
      }

      // Enable external providers first — includes a 30 s wait for the
      // backend ResourceWatcher to propagate before any UI validation fires.
      cy.step('Enable externalProviders in OdhDashboardConfig');
      enableExternalProviders();

      cy.step(`Create project ${projectName}`);
      createCleanProject(projectName);
      waitForUserProjectAccess(projectName, HTPASSWD_CLUSTER_ADMIN_USER.USERNAME);

      cy.step('Enable MLflow backend (tracking server only — no MF remote check)');
      enableMlflowBackend();

      cy.step(
        'Log into the application with custom endpoints, prompt management, and guardrails enabled',
      );
      cy.visitWithLogin(
        `/?devFeatureFlags=genAiStudio=true,aiAssetCustomEndpoints=true,promptManagement=true,guardrails=true,modelAsService=false`,
        HTPASSWD_CLUSTER_ADMIN_USER,
      );

      cy.step('Force backend to refresh config from cluster');
      forceDashboardConfigRefresh();

      cy.step('Create prompt via Gen AI BFF API');
      createGenAiPromptViaAPI(
        projectName,
        testData.prompt.name,
        testData.prompt.template,
        testData.prompt.commitMessage,
      )
        .its('status')
        .should('be.oneOf', [200, 201]);

      cy.step('Create second prompt via Gen AI BFF API');
      createGenAiPromptViaAPI(
        projectName,
        testData.prompt2.name,
        testData.prompt2.template,
        testData.prompt2.commitMessage,
      )
        .its('status')
        .should('be.oneOf', [200, 201]);
    });
  });

  after(() => {
    cy.step('Delete test prompt from MLflow');
    deleteGenAiPromptViaAPI(projectName, testData.prompt.name);

    cy.step('Revert externalProviders in OdhDashboardConfig');
    disableExternalProviders();

    cy.step('Clean up MLflow features');
    disablePromptManagementFeatures();

    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Create custom endpoint in AI asset endpoints page',
    {
      tags: ['@GenAI', '@FeatureFlagged', '@NonConcurrent'],
    },
    () => {
      cy.step('Navigate to AI asset endpoints page');
      genAiPlayground.navigateToAssetsWithGuardrailsAndPromptManagement(projectName);

      cy.step('Force backend to refresh config from cluster');
      forceDashboardConfigRefresh();

      cy.step('Click Create endpoint button from empty state');
      genAiPlayground
        .findEmptyStateCreateEndpointButton({ timeout: 30000 })
        .should('be.visible')
        .click();

      cy.step('Verify Create endpoint modal is open');
      genAiPlayground.findCreateExternalModelModal().should('be.visible');

      cy.step('Fill in Model ID');
      genAiPlayground.findModelIdInput().clear().type(testData.modelId);

      cy.step('Fill in Display name');
      genAiPlayground.findDisplayNameInput().clear().type(testData.displayName);

      cy.step('Fill in Endpoint URL');
      const endpointHost = new URL(testData.endpointUrl).hostname;
      expect(ALLOWED_ENDPOINT_HOSTS).to.include(
        endpointHost,
        `Fixture endpoint host "${endpointHost}" is not in the allowlist — refusing to send API key`,
      );
      genAiPlayground.findEndpointUrlInput().clear().type(testData.endpointUrl);

      cy.step('Fill in API key');
      genAiPlayground.findTokenInput().clear().type(Cypress.env('GEMINI_API_KEY'), { log: false });

      cy.step('Click Verify model button');
      genAiPlayground.findVerifyModelButton().should('be.enabled').click();

      cy.step('Verify model verification succeeds');
      genAiPlayground.findVerifySuccessAlert({ timeout: 30000 }).should('be.visible');

      cy.step('Click Create button to create the endpoint');
      genAiPlayground.findCreateEndpointSubmitButton().should('be.enabled').click();

      cy.step('Verify modal closes and model appears in AI Assets table');
      genAiPlayground.findCreateExternalModelModal().should('not.exist');
      genAiPlayground.findAiModelsTable().should('contain', testData.displayName);
    },
  );

  it(
    'Add endpoint to playground and wait for OGX Server to be ready',
    {
      tags: ['@GenAI', '@FeatureFlagged', '@NonConcurrent'],
    },
    () => {
      cy.step('Add endpoint to playground');
      genAiPlayground.findAddToPlaygroundButton().should('be.visible').click();
      genAiPlayground.findConfigurationTable().should('be.visible');
      genAiPlayground.ensureModelCheckboxIsChecked(testData.modelId);
      genAiPlayground.findCreateButtonInDialog().should('be.enabled').click();

      cy.step('Wait for OGX Server to be ready');
      waitForOGXServerReady(projectName);

      cy.step('Wait for playground service to be created');
      waitForResource('service', testData.lsdServiceName, projectName);

      cy.step('Wait for LSD pod to be fully ready');
      waitForPodReady(testData.lsdPodPrefix, testData.lsdPodReadyTimeout, projectName);

      cy.step('Wait for custom model to be registered in LSD');
      waitForModelInLSD(testData.lsdServiceName, testData.modelId, projectName);
    },
  );

  it(
    'Verify guardrails lifecycle — user input toggle blocks malicious message',
    {
      tags: ['@GenAI', '@FeatureFlagged', '@NonConcurrent'],
    },
    () => {
      cy.step('Navigate to playground with guardrails enabled');
      genAiPlayground.navigateToPlaygroundWithGuardrails(projectName);

      cy.step('Open settings panel and navigate to Guardrails tab');
      genAiPlayground.ensureSettingsPanelOpen();
      genAiPlayground.findGuardrailsTab().should('be.visible').click();

      cy.step('Verify guardrails panel shows model dropdown and both toggles defaulting to OFF');
      genAiPlayground.findGuardrailsSection().should('be.visible');
      genAiPlayground.findGuardrailModelToggle().should('be.visible');
      genAiPlayground.findUserInputGuardrailsSwitch().should('not.be.checked');
      genAiPlayground.findModelOutputGuardrailsSwitch().should('not.be.checked');

      cy.step(`Select guardrail model ending with "${testData.displayName}"`);
      genAiPlayground.selectGuardrailModel(testData.displayName);
      genAiPlayground.findGuardrailModelToggle().should('contain', testData.displayName);

      cy.step('Toggle user input guardrails ON');
      genAiPlayground.toggleUserInputGuardrails(true);
      genAiPlayground.findUserInputGuardrailsSwitch().should('be.checked');

      cy.step(`Send safe message: "${testData.guardrails.safeMessage}"`);
      genAiPlayground.sendMessage(testData.guardrails.safeMessage);
      genAiPlayground
        .findUserMessage()
        .should('exist')
        .and('contain', testData.guardrails.safeMessage);

      cy.step('Verify assistant responds normally (safe message passes input guardrail)');
      genAiPlayground.waitForStreamingComplete({ timeout: 120000 });
      genAiPlayground.findAssistantMessage({ timeout: 120000 }).should('exist').and('not.be.empty');

      cy.step(`Send malicious message: "${testData.guardrails.maliciousMessage}"`);
      genAiPlayground.sendMessage(testData.guardrails.maliciousMessage);
      genAiPlayground
        .findAllUserMessages()
        .last()
        .should('exist')
        .and('contain', testData.guardrails.maliciousMessage);

      cy.step('Verify input guardrail violation alert is displayed');
      genAiPlayground.findGuardrailViolationAlert({ timeout: 120000 }).should('exist');

      cy.step('Toggle user input guardrails OFF and clear chat');
      genAiPlayground.toggleUserInputGuardrails(false);
      genAiPlayground.findUserInputGuardrailsSwitch().should('not.be.checked');
      genAiPlayground.clearChat();
    },
  );

  it(
    'Verify prompt management — load and use a saved prompt',
    {
      tags: ['@GenAI', '@FeatureFlagged', '@PromptManagement', '@NonConcurrent'],
    },
    () => {
      cy.step('Navigate to playground with prompt management enabled');
      genAiPlayground.navigateToPlaygroundWithPromptManagementRetry(projectName);

      cy.step(`Select ${testData.displayName} model from dropdown`);
      genAiPlayground.selectModelFromDropdown(testData.displayName);
      genAiPlayground.verifyModelIsSelected(testData.displayName);

      cy.step('Open settings panel, navigate to Prompt tab, and load prompt');
      genAiPlayground.ensureSettingsPanelOpen();
      genAiPlayground.findSettingsPromptTab().should('be.visible').click();
      genAiPlayground.findLoadPromptButton().should('be.visible').click();

      cy.step('Select the prompt from the table');
      genAiPlayground.findPromptManagementModal().should('exist');
      genAiPlayground.findPromptTableRow(testData.prompt.name).should('be.visible').click();
      genAiPlayground.findPromptLoadConfirmButton().should('be.enabled').click();

      cy.step('Verify prompt is loaded in the settings panel');
      genAiPlayground
        .findPromptNameTitle()
        .should('be.visible')
        .and('contain', testData.prompt.name);

      cy.step('Send a test message using the loaded prompt context');
      genAiPlayground.findMessageInput().should('be.enabled').and('be.visible');
      genAiPlayground.sendMessage(testData.prompt.testMessageWithPrompt);

      cy.step('Verify user message appears in chat');
      genAiPlayground
        .findUserMessage()
        .should('exist')
        .and('contain', testData.prompt.testMessageWithPrompt);

      cy.step('Verify assistant response is received');
      genAiPlayground.waitForStreamingComplete({ timeout: 60000 });
      genAiPlayground.findAssistantMessage({ timeout: 60000 }).should('exist').and('not.be.empty');
    },
  );

  it(
    'Verify RAG — upload document and retrieve relevant content',
    {
      tags: ['@GenAI', '@FeatureFlagged', '@NonConcurrent'],
    },
    () => {
      cy.step('Navigate to playground with prompt management enabled');
      genAiPlayground.navigateToPlaygroundWithPromptManagementRetry(projectName);

      cy.step('Open settings panel and navigate to Knowledge tab');
      genAiPlayground.ensureSettingsPanelOpen();
      genAiPlayground.findKnowledgeTab().should('be.visible').click();

      cy.step('Upload RAG document via the message bar attachment');
      genAiPlayground.uploadDocumentViaAttachMenu(`cypress/fixtures/${testData.rag.fixturePath}`);

      cy.step('Confirm upload in source settings modal');
      genAiPlayground.findSourceSettingsModal().should('be.visible');
      genAiPlayground.findSourceSettingsUploadButton().should('be.enabled').click();

      cy.step('Navigate to Knowledge tab and verify uploaded file');
      genAiPlayground.findKnowledgeTab().should('be.visible').click();
      genAiPlayground
        .findUploadedFileName(testData.rag.fileName, { timeout: 120000 })
        .should('be.visible');

      cy.step('Send a question about the uploaded RAG document');
      genAiPlayground.findMessageInput().should('be.enabled').and('be.visible');
      genAiPlayground.sendMessage(testData.rag.testQuestion);

      cy.step('Verify RAG question appears in chat');
      genAiPlayground
        .findAllUserMessages()
        .last()
        .should('exist')
        .and('contain', testData.rag.testQuestion);

      cy.step('Wait for RAG response streaming to complete');
      genAiPlayground.waitForStreamingComplete({ timeout: 120000 });

      cy.step('Verify assistant response references uploaded document content');
      genAiPlayground
        .findAllAssistantMessages({ timeout: 10000 })
        .last()
        .should('exist')
        .and('contain.text', testData.rag.expectedContentFragment);

      cy.step('Verify file search results (RAG citations) are displayed');
      genAiPlayground.findFileSearchResults({ timeout: 10000 }).should('exist');
    },
  );

  it(
    'Verify agent configuration persistence — save, load, update, and delete',
    {
      tags: ['@GenAI', '@FeatureFlagged', '@AgentConfig', '@NonConcurrent'],
    },
    () => {
      // ── Step 1: select model + load prompt + save as agent ────────────────
      cy.step('Navigate to playground with agent management enabled');
      genAiPlayground.navigateToPlaygroundWithAgentManagement(projectName);

      cy.step(`Select ${testData.displayName} model from dropdown`);
      genAiPlayground.selectModelFromDropdown(testData.displayName);
      genAiPlayground.verifyModelIsSelected(testData.displayName);

      cy.step('Open settings panel and load saved prompt from registry');
      genAiPlayground.ensureSettingsPanelOpen();
      genAiPlayground.findSettingsPromptTab().should('be.visible').click();
      genAiPlayground.findLoadPromptButton().should('be.visible').click();
      genAiPlayground.findPromptManagementModal().should('exist');
      genAiPlayground.findPromptTableRow(testData.prompt.name).should('be.visible').click();
      genAiPlayground.findPromptLoadConfirmButton().should('be.enabled').click();
      genAiPlayground
        .findPromptNameTitle()
        .should('be.visible')
        .and('contain', testData.prompt.name);

      cy.step('Navigate to Knowledge tab and enable RAG (vector store already populated)');
      genAiPlayground.findKnowledgeTab().should('be.visible').click();
      genAiPlayground.findRagToggle().should('not.be.checked').click({ force: true });
      genAiPlayground.findRagToggle().should('be.checked');

      cy.step('Save current configuration as a new agent');
      genAiPlayground.findSettingsPanelSaveAsButton().should('be.visible').click();
      genAiPlayground.findSaveAgentProfileModal().should('be.visible');
      genAiPlayground.findSaveAgentNameInput().clear().type(testData.agent.name);
      genAiPlayground.findSaveAgentSubmitButton().should('be.enabled').click();
      genAiPlayground.findSaveAgentProfileModal().should('not.exist');

      // ── Step 2: load agent from AAE and verify settings are restored ──────
      cy.step('Navigate to AI Assets Agents tab');
      genAiPlayground.navigateToAssetsWithAgentManagement(projectName);
      genAiPlayground.findAgentsTab().should('be.visible').click();
      genAiPlayground.findAgentRowByName(testData.agent.name).should('be.visible');

      cy.step('Open the agent in playground via Try in Playground');
      genAiPlayground.findTryInPlaygroundByName(testData.agent.name).should('be.visible').click();
      cy.findByTestId('chatbot-message-bar', { timeout: 120000 }).should('be.visible');

      cy.step('Verify agent name appears in playground header');
      genAiPlayground.findAgentNameTitle({ timeout: 10000 }).should('contain', testData.agent.name);

      cy.step('Verify model, RAG, and prompt are restored from agent configuration');
      genAiPlayground.verifyModelIsSelected(testData.displayName);
      genAiPlayground.ensureSettingsPanelOpen();
      genAiPlayground.findKnowledgeTab().should('be.visible').click();
      genAiPlayground.findRagToggle().should('be.checked');
      genAiPlayground.findSettingsPromptTab().should('be.visible').click();
      genAiPlayground
        .findPromptNameTitle()
        .should('be.visible')
        .and('contain', testData.prompt.name);

      // ── Step 3: turn off RAG, clear prompt, overwrite the saved agent ─────
      cy.step('Turn off RAG in Knowledge tab');
      genAiPlayground.findKnowledgeTab().should('be.visible').click();
      genAiPlayground.findRagToggle().should('be.checked').click({ force: true });
      genAiPlayground.findRagToggle().should('not.be.checked');

      cy.step('Switch to second prompt to modify the prompt configuration');
      genAiPlayground.findSettingsPromptTab().should('be.visible').click();
      genAiPlayground.findLoadPromptButton().should('be.visible').click();
      genAiPlayground.findPromptManagementModal().should('exist');
      genAiPlayground.findPromptTableRow(testData.prompt2.name).should('be.visible').click();
      genAiPlayground.findPromptLoadConfirmButton().should('be.enabled').click();
      genAiPlayground
        .findPromptNameTitle()
        .should('be.visible')
        .and('contain', testData.prompt2.name);

      cy.step('Save updated configuration to the existing agent (overwrite)');
      genAiPlayground.findSettingsPanelSaveButton().should('be.visible').and('be.enabled').click();
      genAiPlayground.findSaveAgentProfileModal().should('be.visible');
      genAiPlayground.findSaveAgentSubmitButton().should('be.enabled').click();
      genAiPlayground.findSaveAgentProfileModal().should('not.exist');
      genAiPlayground.findAgentUnsavedIndicator().should('not.exist');

      // ── Step 4: fresh playground → load agent → verify updated settings ───
      cy.step('Navigate to fresh playground without a pre-loaded agent');
      genAiPlayground.navigateToPlaygroundWithAgentManagement(projectName);

      cy.step('Load the agent from the settings panel');
      genAiPlayground.ensureSettingsPanelOpen();
      genAiPlayground.loadAgentByName(testData.agent.name);
      genAiPlayground.findAgentNameTitle({ timeout: 10000 }).should('contain', testData.agent.name);

      cy.step('Verify updated settings: RAG is off and second prompt is loaded');
      genAiPlayground.findKnowledgeTab().should('be.visible').click();
      genAiPlayground.findRagToggle().should('not.be.checked');
      genAiPlayground.findSettingsPromptTab().should('be.visible').click();
      genAiPlayground
        .findPromptNameTitle()
        .should('be.visible')
        .and('contain', testData.prompt2.name);

      // ── Step 5: delete agent from AAE and verify it is gone ───────────────
      cy.step('Navigate to AI Assets Agents tab to delete the agent');
      genAiPlayground.navigateToAssetsWithAgentManagement(projectName);
      genAiPlayground.findAgentsTab().should('be.visible').click();
      genAiPlayground.findAgentRowByName(testData.agent.name).should('be.visible');
      genAiPlayground.findAgentKebabByName(testData.agent.name).click();
      genAiPlayground.findDeleteAgentDropdownItem().should('be.visible').click();
      genAiPlayground.findDeleteAgentModal().should('be.visible');
      genAiPlayground.findDeleteAgentConfirmButton().should('be.enabled').click();

      cy.step('Verify agent is no longer visible in the Agents table');
      genAiPlayground.findDeleteAgentModal().should('not.exist');
      genAiPlayground.findAgentProfilesEmptyState().should('be.visible');
    },
  );

  it(
    'Verify endpoint deletion and resource cleanup',
    {
      tags: ['@GenAI', '@FeatureFlagged', '@NonConcurrent'],
    },
    () => {
      cy.step('Navigate back to AI Assets to delete the endpoint');
      genAiPlayground.navigateToAssetsWithPromptManagement(projectName);

      cy.step('Wait for AI models table to load');
      genAiPlayground.findAiModelsTable({ timeout: 30000 }).should('be.visible');

      cy.step('Open kebab menu for the custom endpoint model');
      genAiPlayground.findModelActionsKebab(testData.displayName).click();

      cy.step('Click Delete endpoint action');
      genAiPlayground.findRemoveAssetAction().click();

      cy.step('Confirm deletion in the modal');
      genAiPlayground.findDeleteModelModal().should('be.visible');
      genAiPlayground.findDeleteModelConfirmButton().click();

      cy.step('Reload page and verify endpoint is deleted');
      genAiPlayground.navigateToAssetsWithPromptManagement(projectName);
      genAiPlayground.findEmptyStateCreateEndpointButton().should('be.visible');

      cy.step('Verify ConfigMap and Secret are cleaned up');
      verifyEndpointResourcesCleanedUp(testData.modelId, projectName);
    },
  );
});
