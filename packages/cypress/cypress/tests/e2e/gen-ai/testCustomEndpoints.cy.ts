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
} from '../../../utils/oc_commands/genAi';
import {
  enablePromptManagementFeatures,
  disablePromptManagementFeatures,
  doesMlflowCRExist,
  createMlflowPromptViaAPI,
  deleteMlflowPromptViaAPI,
} from '../../../utils/oc_commands/mlflow';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { CustomEndpointTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import { genAiPlayground } from '../../../pages/genAiPlayground';

const ALLOWED_ENDPOINT_HOSTS = ['generativelanguage.googleapis.com'];

describe('Verify Custom Endpoints in Playground - Full Lifecycle', () => {
  let testData: CustomEndpointTestData;
  let crExisted: boolean | undefined;
  const projectName = `custom-ep-e2e-${generateTestUUID()}`;

  retryableBefore(() => {
    const apiKey = Cypress.env('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not set in test-variables.yml — cannot run custom endpoint tests',
      );
    }

    cy.fixture('e2e/genAi/testCustomEndpoints.yaml', 'utf8').then((yamlContent: string) => {
      testData = yaml.load(yamlContent) as CustomEndpointTestData;
    });

    cy.step('Enable externalProviders in OdhDashboardConfig');
    enableExternalProviders();

    cy.step(`Create project ${projectName}`);
    createCleanProject(projectName);
    waitForUserProjectAccess(projectName, HTPASSWD_CLUSTER_ADMIN_USER.USERNAME);

    cy.step('Check if MLflow CR already exists');
    doesMlflowCRExist().then((v) => {
      if (crExisted === undefined) {
        crExisted = v;
        cy.log(`Pre-test state: MLflow CR ${crExisted ? 'exists' : 'absent'}`);
      }
    });

    cy.step('Enable MLflow and prompt management features');
    enablePromptManagementFeatures();
  });

  after(() => {
    cy.step('Delete test prompt from MLflow');
    deleteMlflowPromptViaAPI(projectName, testData.prompt.name);

    cy.step('Revert externalProviders in OdhDashboardConfig');
    disableExternalProviders();

    cy.step('Clean up MLflow CR if it was created by this test');
    disablePromptManagementFeatures(crExisted ?? false);

    if (projectName) {
      deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
    }
  });

  it(
    'Verify custom endpoint lifecycle with prompt creation and playground usage',
    {
      tags: ['@GenAI', '@FeatureFlagged', '@PromptManagement', '@MLflow', '@NonConcurrent'],
    },
    () => {
      cy.step('Log into the application with custom endpoints and prompt management enabled');
      cy.visitWithLogin(
        `/?devFeatureFlags=genAiStudio=true,aiAssetCustomEndpoints=true,promptManagement=true,modelAsService=false`,
        HTPASSWD_CLUSTER_ADMIN_USER,
      );

      cy.step('Force backend to refresh config from cluster');
      forceDashboardConfigRefresh();

      // --- Create custom endpoint ---

      cy.step('Navigate to AI asset endpoints page');
      genAiPlayground.navigateToAssetsWithPromptManagement(projectName);

      cy.step('Click Create endpoint button from empty state');
      genAiPlayground.findEmptyStateCreateEndpointButton().should('be.visible').click();

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

      // --- Add to playground and wait for infrastructure ---

      cy.step('Click Add to playground for the custom endpoint model');
      genAiPlayground.findAddToPlaygroundButton().should('be.visible').click();

      cy.step('Verify configuration modal opens with model pre-selected');
      genAiPlayground.findConfigurationTable().should('be.visible');
      genAiPlayground.ensureModelCheckboxIsChecked(testData.modelId);

      cy.step('Click Create in the configuration modal');
      genAiPlayground.findCreateButtonInDialog().should('be.enabled').click();

      cy.step('Wait for OGX Server to be ready');
      waitForOGXServerReady(projectName);

      cy.step('Wait for playground service to be created');
      waitForResource('service', testData.lsdServiceName, projectName);

      cy.step('Wait for LSD pod to be fully ready');
      waitForPodReady(testData.lsdPodPrefix, testData.lsdPodReadyTimeout, projectName);

      cy.step('Wait for custom model to be registered in LSD');
      waitForModelInLSD(testData.lsdServiceName, testData.modelId, projectName);

      // --- Create a prompt via API ---

      cy.step('Create prompt via MLflow API');
      createMlflowPromptViaAPI(
        projectName,
        testData.prompt.name,
        testData.prompt.template,
        testData.prompt.commitMessage,
      )
        .its('status')
        .should('be.oneOf', [200, 201]);

      // --- Navigate to playground and load the prompt ---

      cy.step('Navigate to playground with prompt management enabled');
      genAiPlayground.navigateToPlaygroundWithPromptManagementRetry(projectName);

      cy.step(`Select ${testData.displayName} model from dropdown`);
      genAiPlayground.selectModelFromDropdown(testData.displayName);

      cy.step(`Verify ${testData.displayName} model is selected`);
      genAiPlayground.verifyModelIsSelected(testData.displayName);

      cy.step('Ensure settings panel is open, navigate to Prompt tab, and click Load Prompt');
      cy.get('body').then(($body) => {
        if ($body.find('[data-testid="chatbot-settings-panel-header"]').length === 0) {
          genAiPlayground.findSettingsButton().should('be.visible').click();
        }
      });
      cy.findByTestId('chatbot-settings-panel-header', { timeout: 10000 }).should('be.visible');
      genAiPlayground.findSettingsPromptTab().should('be.visible').click();
      genAiPlayground.findLoadPromptButton().should('be.visible').click();

      cy.step('Select the prompt from the table');
      genAiPlayground.findPromptManagementModal().should('exist');
      genAiPlayground.findPromptTableRow(testData.prompt.name).should('be.visible').click();

      cy.step('Click Load in Playground to apply the prompt');
      genAiPlayground.findPromptLoadConfirmButton().should('be.enabled').click();

      cy.step('Verify prompt is loaded in the settings panel');
      genAiPlayground
        .findPromptNameTitle()
        .should('be.visible')
        .and('contain', testData.prompt.name);

      // --- Use the prompt in the playground ---

      cy.step('Verify message input is ready');
      genAiPlayground.findMessageInput().should('be.enabled').and('be.visible');

      cy.step('Send a test message using the loaded prompt context');
      genAiPlayground.sendMessage(testData.prompt.testMessageWithPrompt);

      cy.step('Verify user message appears in chat');
      genAiPlayground
        .findUserMessage()
        .should('exist')
        .and('contain', testData.prompt.testMessageWithPrompt);

      cy.step('Verify assistant response is received');
      genAiPlayground.findAssistantMessage({ timeout: 60000 }).should('exist').and('not.be.empty');

      // --- Cleanup: delete the endpoint ---

      cy.step('Navigate back to AI Assets to delete the endpoint');
      genAiPlayground.navigateToAssetsWithPromptManagement(projectName);

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
