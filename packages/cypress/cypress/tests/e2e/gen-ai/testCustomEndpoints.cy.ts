import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  deleteOpenShiftProject,
  waitForUserProjectAccess,
} from '../../../utils/oc_commands/project';
import { checkLlamaStackDistributionReady } from '../../../utils/oc_commands/llamaStackDistribution';
import { waitForResource, waitForPodReady } from '../../../utils/oc_commands/baseCommands';
import {
  enableExternalProviders,
  disableExternalProviders,
  verifyEndpointResourcesCleanedUp,
  waitForModelInLSD,
  forceDashboardConfigRefresh,
} from '../../../utils/oc_commands/genAi';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { CustomEndpointTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import { genAiPlayground } from '../../../pages/genAiPlayground';

const ALLOWED_ENDPOINT_HOSTS = ['generativelanguage.googleapis.com'];

describe('Verify Custom Endpoints in Playground - Full Lifecycle', () => {
  let testData: CustomEndpointTestData;
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
  });

  after(() => {
    cy.step('Revert externalProviders in OdhDashboardConfig');
    disableExternalProviders();

    if (projectName) {
      deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
    }
  });

  it(
    'Verify custom endpoint full lifecycle: create, verify, playground, delete',
    {
      tags: ['@GenAI', '@FeatureFlagged', '@NonConcurrent'],
    },
    () => {
      cy.step('Log into the application with custom endpoints enabled');
      cy.visitWithLogin(
        `/?devFeatureFlags=genAiStudio=true,aiAssetCustomEndpoints=true`,
        HTPASSWD_CLUSTER_ADMIN_USER,
      );

      cy.step('Force backend to refresh config from cluster');
      forceDashboardConfigRefresh();

      cy.step('Navigate to AI asset endpoints page with custom endpoints enabled');
      genAiPlayground.navigateToAssetsWithCustomEndpoints(projectName);

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

      cy.step('Click Add to playground for the custom endpoint model');
      genAiPlayground.findAddToPlaygroundButton().should('be.visible').click();

      cy.step('Verify configuration modal opens with model pre-selected');
      genAiPlayground.findConfigurationTable().should('be.visible');
      genAiPlayground.ensureModelCheckboxIsChecked(testData.modelId);

      cy.step('Click Create in the configuration modal');
      genAiPlayground.findCreateButtonInDialog().should('be.enabled').click();

      cy.step('Wait for LlamaStack Distribution to be ready');
      checkLlamaStackDistributionReady(projectName);

      cy.step('Wait for playground service to be created');
      waitForResource('service', testData.lsdServiceName, projectName);

      cy.step('Wait for LSD pod to be fully ready');
      waitForPodReady(testData.lsdPodPrefix, testData.lsdPodReadyTimeout, projectName);

      cy.step('Wait for custom model to be registered in LSD');
      waitForModelInLSD(testData.lsdServiceName, testData.modelId, projectName);

      cy.step('Navigate to playground and wait for model selector');
      genAiPlayground.navigateToPlaygroundWithRetry(projectName);

      cy.step(`Select ${testData.displayName} model from dropdown`);
      genAiPlayground.selectModelFromDropdown(testData.displayName);

      cy.step(`Verify ${testData.displayName} model is selected`);
      genAiPlayground.verifyModelIsSelected(testData.displayName);

      cy.step('Verify message input is ready');
      genAiPlayground.findMessageInput().should('be.enabled').and('be.visible');

      cy.step('Send a test message to the custom endpoint model');
      genAiPlayground.sendMessage(testData.testMessage);

      cy.step('Verify user message appears in chat');
      genAiPlayground.findUserMessage().should('exist').and('contain', testData.testMessage);

      cy.step('Verify assistant response is received');
      genAiPlayground.findAssistantMessage({ timeout: 60000 }).should('exist').and('not.be.empty');

      cy.step('Navigate back to AI Assets to delete the endpoint');
      genAiPlayground.navigateToAssetsWithCustomEndpoints(projectName);

      cy.step('Open kebab menu for the custom endpoint model');
      genAiPlayground.findModelActionsKebab(testData.displayName).click();

      cy.step('Click Delete endpoint action');
      genAiPlayground.findRemoveAssetAction().click();

      cy.step('Confirm deletion in the modal');
      genAiPlayground.findDeleteModelModal().should('be.visible');
      genAiPlayground.findDeleteModelConfirmButton().click();

      cy.step('Reload page and verify endpoint is deleted');
      genAiPlayground.navigateToAssetsWithCustomEndpoints(projectName);
      genAiPlayground.findEmptyStateCreateEndpointButton().should('be.visible');

      cy.step('Verify ConfigMap and Secret are cleaned up');
      verifyEndpointResourcesCleanedUp(testData.modelId, projectName);
    },
  );
});
