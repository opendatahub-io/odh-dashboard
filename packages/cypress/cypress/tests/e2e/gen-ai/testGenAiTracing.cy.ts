import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  deleteOpenShiftProject,
  waitForUserProjectAccess,
} from '../../../utils/oc_commands/project';
import { waitForOGXServerReady } from '../../../utils/oc_commands/ogxServer';
import {
  startPortForward,
  stopPortForward,
  waitForResource,
  waitForPodReady,
  type PortForwardHandle,
} from '../../../utils/oc_commands/baseCommands';
import {
  disableExternalProviders,
  enableExternalProviders,
  getExternalProviders,
  waitForDsciCondition,
  waitForModelInLSD,
  verifyPlaygroundTracingEnabledViaAPI,
  waitForExternalProvidersEnabledViaAPI,
} from '../../../utils/oc_commands/genAi';
import {
  enableMlflowFeatures,
  disablePromptManagementFeatures,
  getPromptManagementFeaturesEnabled,
} from '../../../utils/oc_commands/mlflow';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { GenAiTracingTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import { genAiPlayground } from '../../../pages/genAiPlayground';

const ALLOWED_ENDPOINT_HOSTS = ['generativelanguage.googleapis.com'];
const GENAI_TRACING_COLLECTOR = 'gen-ai-trace-collector-collector';
const GENAI_TRACING_COLLECTOR_PORT = 4318;

describe('Verify tracing and observability in Gen AI Playground', { testIsolation: false }, () => {
  let testData: GenAiTracingTestData;
  let playgroundPortForwardHandle: PortForwardHandle | null = null;
  let traceCollectorPortForwardHandle: PortForwardHandle | null = null;
  let originalExternalProviders: boolean | undefined;
  let originalPromptManagementFeaturesEnabled: boolean | undefined;
  const projectName = `tracing-e2e-${generateTestUUID()}`;

  retryableBefore(() => {
    cy.fixture('e2e/genAi/testGenAiTracing.yaml', 'utf8').then((yamlContent: string) => {
      testData = yaml.load(yamlContent) as GenAiTracingTestData;

      const apiKey = Cypress.env('GEMINI_API_KEY');
      if (!apiKey) {
        throw new Error(
          'GEMINI_API_KEY is not set in test-variables.yml — cannot run tracing tests',
        );
      }

      cy.step('Verify platform tracing conditions are available in DSCI status');
      waitForDsciCondition(testData.tracing.openTelemetryCondition);
      waitForDsciCondition(testData.tracing.tempoCondition);

      if (originalExternalProviders === undefined) {
        cy.step('Record original externalProviders setting');
        getExternalProviders().then((externalProviders) => {
          originalExternalProviders = externalProviders;
        });
      }

      if (originalPromptManagementFeaturesEnabled === undefined) {
        cy.step('Record original Prompt Management feature state');
        getPromptManagementFeaturesEnabled().then((enabled) => {
          originalPromptManagementFeaturesEnabled = enabled;
        });
      }

      cy.step('Enable externalProviders in OdhDashboardConfig');
      enableExternalProviders();

      cy.step(`Create project ${projectName}`);
      createCleanProject(projectName);
      waitForUserProjectAccess(projectName, HTPASSWD_CLUSTER_ADMIN_USER.USERNAME);

      cy.step('Enable MLflow backend and verify the embedded MLflow remote is loadable');
      enableMlflowFeatures();

      cy.step('Log into the application with custom endpoints and tracing enabled');
      cy.visitWithLogin(
        '/?devFeatureFlags=genAiStudio=true,aiAssetCustomEndpoints=true,modelAsService=false&genAiTracing=true',
        HTPASSWD_CLUSTER_ADMIN_USER,
      );
    });
  });

  after(() => {
    stopPortForward(playgroundPortForwardHandle);
    stopPortForward(traceCollectorPortForwardHandle);

    cy.step('Restore externalProviders in OdhDashboardConfig');
    if (originalExternalProviders !== undefined) {
      disableExternalProviders(originalExternalProviders);
    }

    cy.step('Restore Prompt Management feature state');
    if (originalPromptManagementFeaturesEnabled === false) {
      disablePromptManagementFeatures(true);
    }

    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Enables tracing, sends a chat message, opens trace details, and persists tracing state',
    {
      tags: ['@GenAI', '@FeatureFlagged', '@NonConcurrent'],
    },
    () => {
      cy.step('Navigate to AI asset endpoints page with tracing enabled');
      genAiPlayground.navigateToAssetsWithTracing(projectName);

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

      cy.step('Wait for backend config to report externalProviders enabled');
      waitForExternalProvidersEnabledViaAPI();

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

      cy.step('Add endpoint to playground with tracing enabled');
      cy.intercept('POST', '**/gen-ai/api/v1/lsd/install*').as('installLSD');
      genAiPlayground.findAddToPlaygroundButton().should('be.visible').click();
      genAiPlayground.findConfigurationTable().should('be.visible');
      genAiPlayground
        .findEnableTracingSwitch({ timeout: 120000 })
        .should('exist')
        .and('not.be.checked');
      genAiPlayground.findEnableTracingSwitch().click({ force: true });
      genAiPlayground.findEnableTracingSwitch().should('be.checked');
      genAiPlayground.ensureModelCheckboxIsChecked(testData.modelId);
      genAiPlayground.findCreateButtonInDialog().should('be.enabled').click();

      cy.step('Verify install request enables tracing');
      cy.wait('@installLSD').then(({ request }) => {
        const requestBody = request.body as { enable_tracing?: boolean };
        expect(requestBody.enable_tracing).to.eq(true);
      });

      cy.step('Wait for OGX Server to be ready');
      waitForOGXServerReady(projectName);

      cy.step('Wait for playground service to be created');
      waitForResource('service', testData.lsdServiceName, projectName);

      cy.step('Wait for LSD pod to be fully ready');
      waitForPodReady(testData.lsdPodPrefix, testData.lsdPodReadyTimeout, projectName);

      cy.step('Start port-forward for LSD service');
      startPortForward(projectName, testData.lsdServiceName, 8321, 3000).then((handle) => {
        playgroundPortForwardHandle = handle;
      });

      cy.step('Wait for custom model to be registered in LSD');
      waitForModelInLSD(testData.lsdServiceName, testData.modelId, projectName);

      cy.step('Verify BFF reports tracing enabled for the playground');
      verifyPlaygroundTracingEnabledViaAPI(projectName);

      cy.step('Start port-forward for tracing service');
      startPortForward(
        Cypress.env('APPLICATIONS_NAMESPACE'),
        GENAI_TRACING_COLLECTOR,
        GENAI_TRACING_COLLECTOR_PORT,
      ).then((handle) => {
        traceCollectorPortForwardHandle = handle;
      });

      cy.step('Navigate to Playground with tracing enabled');
      genAiPlayground.navigateToPlaygroundWithTracing(projectName);

      cy.step(`Select ${testData.displayName} model from dropdown`);
      genAiPlayground.selectModelFromDropdown(testData.displayName, { timeout: 120000 });
      genAiPlayground.verifyModelIsSelected(testData.displayName);

      cy.step('Send deterministic prompt and wait for response to complete');
      genAiPlayground.findMessageInput().should('be.enabled').and('be.visible');
      genAiPlayground.sendMessage(testData.tracing.testPrompt);
      genAiPlayground.findUserMessage().should('exist').and('contain', testData.tracing.testPrompt);
      genAiPlayground.waitForStreamingComplete({ timeout: 120000 });
      genAiPlayground.findAssistantMessage({ timeout: 120000 }).should('exist').and('not.be.empty');

      cy.step('Verify View trace link is shown for the completed bot message');
      genAiPlayground
        .findViewTraceLink({ timeout: 30000 })
        .should('be.visible')
        .invoke('attr', 'data-trace-id')
        .then((attrTraceId) => {
          expect(attrTraceId, 'trace ID on View trace link').to.be.a('string');
          expect(attrTraceId, 'trace ID on View trace link').to.not.equal('');
          return attrTraceId ?? '';
        })
        .as('traceId');

      cy.step('Wait for trace to be ingested by MLflow');
      // Trace export and MLflow ingestion are asynchronous after the response completes.
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(7000);

      cy.step('Open the trace details drawer');
      genAiPlayground.findViewTraceLink().click();
      genAiPlayground.findTracePanel({ timeout: 30000 }).should('be.visible');
      genAiPlayground.findTracePanelTitle().should('be.visible');
      cy.get<string>('@traceId').then((traceId) => {
        genAiPlayground
          .findMlflowTraceDetail({ timeout: 120000 })
          .should('be.visible')
          .and('have.attr', 'data-trace-id', traceId);
      });
      genAiPlayground.findMlflowTraceDetailLoading({ timeout: 120000 }).should('not.exist');
      genAiPlayground.findMlflowTraceUnavailable().should('not.exist');
      genAiPlayground
        .findMlflowTraceDetail()
        .invoke('text')
        .should((text) => {
          const normalizedText = text.replace(/\s+/g, ' ').trim();
          expect(normalizedText, 'MLflow trace detail content').not.to.eq('');
          for (const expectedSpan of testData.tracing.mlflowTraceDetailExpectedSpans) {
            expect(normalizedText, `MLflow trace detail contains span: ${expectedSpan}`).to.include(
              expectedSpan,
            );
          }
        });
      genAiPlayground.findTracePanelCloseButton().should('be.visible').click();
      genAiPlayground.findTracePanel().should('not.exist');

      cy.step('Reopen playground configuration and verify tracing state is persisted');
      genAiPlayground.findHeaderKebabMenuToggle().should('be.visible').click();
      genAiPlayground.findConfigurePlaygroundMenuItem().should('be.visible').click();
      genAiPlayground.findConfigurePlaygroundModal().should('be.visible');
      genAiPlayground.findEnableTracingSwitch().should('exist').and('be.checked');
    },
  );
});
