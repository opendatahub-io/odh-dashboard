import * as yaml from 'js-yaml';
import { genAiPlayground } from '../../../pages/genAiPlayground';
import type { GenAiMaaSTestData } from '../../../types';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  ensureAdminOcSession,
  startPortForward,
  stopPortForward,
  waitForPodReady,
  waitForResource,
  type PortForwardHandle,
} from '../../../utils/oc_commands/baseCommands';
import { waitForModelInLSD } from '../../../utils/oc_commands/genAi';
import {
  checkMaaSAuthPolicyState,
  checkMaaSSubscriptionState,
  cleanupAuthPolicy,
  cleanupSubscription,
  createLLMInferenceServiceWithMaaSEnabled,
  createMaaSModelRef,
  createMaaSSubscription,
  createMaaSAuthPolicy,
  modelsAsAServiceNamespace,
  verifyMaaSUserAccess,
  waitForMaaSModelReady,
} from '../../../utils/oc_commands/maas';
import {
  checkLLMInferenceServiceState,
  cleanupLLMInferenceService,
} from '../../../utils/oc_commands/modelServing';
import { waitForOGXServerReady } from '../../../utils/oc_commands/ogxServer';
import {
  deleteOpenShiftProject,
  waitForUserProjectAccess,
} from '../../../utils/oc_commands/project';
import { createCleanProject } from '../../../utils/projectChecker';
import { retryableBefore, wasSetupPerformed } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';

describe('Verify Gen AI Playground inference with a MaaS model', () => {
  const uuid = generateTestUUID();
  const modelProjectName = `genai-maas-model-${uuid}`;
  const playgroundProjectName = `genai-maas-playground-${uuid}`;
  const modelName = `genai-maas-llm-${uuid}`;
  const subscriptionName = `genai-maas-sub-${uuid}`;
  const policyName = `genai-maas-policy-${uuid}`;
  let testData: GenAiMaaSTestData | undefined;
  let maasModelId: string;
  let portForwardHandle: PortForwardHandle | null = null;

  const cleanupResources = () => {
    stopPortForward(portForwardHandle);
    portForwardHandle = null;
    ensureAdminOcSession();
    cleanupSubscription(subscriptionName, modelsAsAServiceNamespace);
    cleanupAuthPolicy(policyName, modelsAsAServiceNamespace);
    // Delete the LLMIS first to avoid KServe finalizers holding up project deletion.
    cleanupLLMInferenceService(modelName, modelProjectName);
    deleteOpenShiftProject(modelProjectName, {
      wait: true,
      ignoreNotFound: true,
      timeout: 300000,
    });
    deleteOpenShiftProject(playgroundProjectName, {
      wait: true,
      ignoreNotFound: true,
      timeout: 300000,
    });
  };

  retryableBefore(() => {
    cy.fixture('e2e/genAi/testGenAiMaaS.yaml', 'utf8').then((yamlContent: string) => {
      const fixtureData = yaml.load(yamlContent) as GenAiMaaSTestData;
      testData = fixtureData;

      cy.step('Clean up any resources left by a previous attempt');
      cleanupResources();

      cy.step('Create separate projects for the served model and the playground');
      // Keeping the model outside the playground project prevents namespace-local inference
      // from accidentally satisfying this MaaS integration test.
      createCleanProject(modelProjectName);
      createCleanProject(playgroundProjectName);
      waitForUserProjectAccess(playgroundProjectName, HTPASSWD_CLUSTER_ADMIN_USER.USERNAME);

      cy.step('Deploy the MaaS-enabled LLMInferenceService simulator and wait for readiness');
      createLLMInferenceServiceWithMaaSEnabled(
        modelProjectName,
        modelName,
        fixtureData.llmInferenceServiceFixturePath,
      );
      checkLLMInferenceServiceState(modelName, modelProjectName, { checkReady: true });
      createMaaSModelRef(modelProjectName, modelName);

      cy.step('Apply a MaaS subscription and auth policy granting only the test user access');
      const accessReplacements = {
        MAAS_NAMESPACE: modelsAsAServiceNamespace,
        // JSON string quoting safely escapes the configured username as a YAML scalar.
        USERNAME: JSON.stringify(HTPASSWD_CLUSTER_ADMIN_USER.USERNAME),
      };
      createMaaSSubscription(
        subscriptionName,
        subscriptionName,
        modelProjectName,
        modelName,
        fixtureData.subscriptionFixturePath,
        accessReplacements,
      );
      createMaaSAuthPolicy(
        policyName,
        modelProjectName,
        modelName,
        fixtureData.authPolicyFixturePath,
        accessReplacements,
      );
      checkMaaSSubscriptionState(subscriptionName, modelsAsAServiceNamespace, {
        phase: fixtureData.phase,
        models: [modelName],
      });
      checkMaaSAuthPolicyState(policyName, modelsAsAServiceNamespace, {
        phase: fixtureData.phase,
      });
      verifyMaaSUserAccess(
        modelsAsAServiceNamespace,
        subscriptionName,
        policyName,
        HTPASSWD_CLUSTER_ADMIN_USER.USERNAME,
      );

      cy.step('Wait for MaaSModelRef readiness and resolve its catalog model ID');
      waitForMaaSModelReady(modelProjectName, modelName).then((alias) => {
        maasModelId = alias;
      });

      cy.step('Log in with Gen AI Studio and MaaS enabled');
      cy.visitWithLogin(
        '/?devFeatureFlags=genAiStudio=true,modelAsService=true,maasApiKeys=true',
        HTPASSWD_CLUSTER_ADMIN_USER,
      );
    });
  });

  after(() => {
    if (!wasSetupPerformed() || !testData) {
      return;
    }
    cy.step('Clean up MaaS policies, model and playground projects');
    cleanupResources();
  });

  it(
    'Creates a playground with a MaaS model and sends a message using its subscription',
    { tags: ['@GenAI', '@FeatureFlagged', '@NonConcurrent'] },
    () => {
      if (!testData) {
        throw new Error('Gen AI MaaS test data was not loaded');
      }

      cy.step('Verify Gen AI returns the MaaS model in the AI assets response');
      cy.intercept({
        method: 'GET',
        pathname: '/gen-ai/api/v1/aaa/models',
        query: { sources: '*maas*' },
      }).as('aiAssetsModels');
      genAiPlayground.navigateToAssetsWithMaaS(playgroundProjectName);
      cy.wait('@aiAssetsModels', { timeout: 120000 }).then(({ response }) => {
        expect(response?.statusCode, 'AI assets models API status').to.eq(200);
        expect(
          response?.headers['x-partial-reason'],
          'AI assets must not fall back to namespace models because MaaS is unavailable',
        ).to.eq(undefined);
        const body = response?.body as {
          data?: { model_id: string; model_source_type: string }[];
        };
        expect(body.data, 'AI assets models response data').to.be.an('array');
        const models = body.data ?? [];
        const returnedIds = models.map((model) => model.model_id).join(', ');
        expect(
          models.some(
            (model) => model.model_id === maasModelId && model.model_source_type === 'maas',
          ),
          `MaaS model ${maasModelId} must be returned by Gen AI; returned IDs: ${returnedIds}`,
        ).to.eq(true);
      });

      cy.step('Filter AI assets by model name before searching the paginated table');
      genAiPlayground.findAiModelsNameFilter().clear().type(`${modelName}{enter}`);
      genAiPlayground.findAiModelRow(maasModelId, { timeout: 10000 }).should('be.visible');

      cy.step('Create a playground in the fresh project and select the MaaS model');
      // A local LLAMA_STACK_URL override can expose passthrough MaaS models before this
      // project has a playground, replacing the asset row's Add action with Try.
      genAiPlayground.navigateToPlaygroundWithMaaS(playgroundProjectName);
      genAiPlayground.findCreatePlaygroundButton({ timeout: 10000 }).should('be.visible').click();
      genAiPlayground.findConfigurePlaygroundModal().should('be.visible');
      genAiPlayground.findModelCheckbox(maasModelId).should('be.checked');
      cy.intercept('POST', '**/gen-ai/api/v1/lsd/install*').as('installLSD');
      genAiPlayground.findCreateButtonInDialog().should('be.enabled').click();
      cy.wait('@installLSD', { timeout: 120000 }).then(({ request, response }) => {
        expect(request.body.models).to.deep.include({
          model_name: maasModelId, // eslint-disable-line camelcase
          model_source_type: 'maas', // eslint-disable-line camelcase
          model_type: 'llm', // eslint-disable-line camelcase
        });
        expect(response?.statusCode).to.be.oneOf([200, 201]);
      });

      cy.step('Wait for the playground server and MaaS model to be available');
      waitForOGXServerReady(playgroundProjectName);
      waitForResource('service', testData.playgroundServiceName, playgroundProjectName);
      waitForPodReady(
        testData.playgroundPodPrefix,
        testData.playgroundPodReadyTimeout,
        playgroundProjectName,
      );
      startPortForward(playgroundProjectName, testData.playgroundServiceName, 8321, 3000).then(
        (handle) => {
          portForwardHandle = handle;
        },
      );
      waitForModelInLSD(testData.playgroundServiceName, maasModelId, playgroundProjectName);

      cy.step('Select the MaaS model and verify its subscription is selected');
      genAiPlayground.navigateToPlaygroundWithMaaS(playgroundProjectName);
      genAiPlayground.findModelToggleButton({ timeout: 20000 }).should('be.visible');
      genAiPlayground.selectModelFromDropdown(modelName, { timeout: 10000 });
      genAiPlayground.verifyModelIsSelected(modelName);
      genAiPlayground
        .findSubscriptionToggle({ timeout: 30000 })
        .should('be.visible')
        .and('contain.text', subscriptionName);

      cy.step('Send a message and verify the request uses MaaS and the test subscription');
      cy.intercept('POST', '**/api/v1/lsd/responses**').as('createResponse');
      genAiPlayground.findMessageInput().should('be.enabled').clear().type(testData.testMessage);
      genAiPlayground.findSendButton().should('be.enabled').click();
      genAiPlayground.findUserMessage().should('contain.text', testData.testMessage);
      cy.wait('@createResponse', { timeout: 120000 }).then(({ request, response }) => {
        expect(request.body.model_source_type).to.eq('maas');
        expect(request.body.subscription).to.eq(subscriptionName);
        expect(response?.statusCode).to.eq(200);
      });

      cy.step('Verify a non-empty assistant response and no inference errors');
      // The simulator can finish before the stop button is observed, so assert the
      // completed response rather than requiring a transient streaming state.
      genAiPlayground
        .findAssistantMessage({ timeout: 20000 })
        .should('be.visible')
        .invoke('text')
        .should('match', /\S/);
      genAiPlayground.findStopButton({ timeout: 10000 }).should('not.exist');
      genAiPlayground.findChatbotErrorAlerts().should('not.exist');
    },
  );
});
