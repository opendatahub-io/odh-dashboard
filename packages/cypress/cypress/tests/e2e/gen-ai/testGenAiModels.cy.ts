import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  deleteOpenShiftProject,
  waitForUserProjectAccess,
} from '../../../utils/oc_commands/project';
import { waitForOGXServerReady } from '../../../utils/oc_commands/ogxServer';
import { waitForResource } from '../../../utils/oc_commands/baseCommands';
import {
  cleanupServingRuntimeTemplate,
  deployGenAiModel,
  enableExternalProviders,
  disableExternalProviders,
  forceDashboardConfigRefresh,
  waitForModelInLSD,
} from '../../../utils/oc_commands/genAi';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { GenAiTestData, CustomEndpointTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import { genAiPlayground } from '../../../pages/genAiPlayground';
import { getVllmCpuAmd64RuntimeInfo } from '../../../utils/fileParserUtil';
import { cleanupHardwareProfiles } from '../../../utils/oc_commands/hardwareProfiles';

const ALLOWED_ENDPOINT_HOSTS = ['generativelanguage.googleapis.com'];

describe('Verify Gen AI Models - Playground Integration', { testIsolation: false }, () => {
  let genAiTestData: GenAiTestData;
  let projectName: string;
  let servingRuntimeName: string;
  let hardwareProfileName: string;

  retryableBefore(() => {
    // Enable external providers first so the watcher has maximum time to propagate
    // before the custom endpoint UI validation fires later in the test run.
    cy.step('Enable externalProviders in OdhDashboardConfig');
    enableExternalProviders();

    cy.fixture('e2e/genAi/testGenAiModels.yaml', 'utf8')
      .then((yamlContent: string) => {
        genAiTestData = yaml.load(yamlContent) as GenAiTestData;
        hardwareProfileName = genAiTestData.hardwareProfileName;
      })
      .then(() => getVllmCpuAmd64RuntimeInfo())
      .then((info) => {
        servingRuntimeName = info.singleModelServingName;
        return cleanupServingRuntimeTemplate(servingRuntimeName);
      })
      .then(() => {
        const prefix = genAiTestData.projectNamePrefix;
        return cy
          .exec(`oc get projects -o jsonpath='{.items[*].metadata.name}'`, {
            failOnNonZeroExit: false,
          })
          .then((result) => {
            const existing = result.stdout.split(' ').find((name) => name.startsWith(prefix));
            if (existing) {
              projectName = existing;
              cy.log(`Reusing existing project: ${projectName}`);
              return;
            }

            projectName = `${prefix}-${generateTestUUID()}`;
            cy.step(`Create project ${projectName}`);
            createCleanProject(projectName);

            return waitForUserProjectAccess(projectName, HTPASSWD_CLUSTER_ADMIN_USER.USERNAME).then(
              () => {
                cy.step('Deploy Gen AI model via oc commands');
                deployGenAiModel(projectName, genAiTestData);
              },
            );
          });
      });
  });

  after(() => {
    cy.step('Revert externalProviders in OdhDashboardConfig');
    disableExternalProviders();

    if (projectName) {
      deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
    }

    if (servingRuntimeName) {
      cleanupServingRuntimeTemplate(servingRuntimeName);
    }

    if (hardwareProfileName) {
      cy.log(`Cleaning up Hardware Profile: ${hardwareProfileName}`);
      cleanupHardwareProfiles(hardwareProfileName);
    }
  });

  it(
    'Verify deployed model works in playground',
    {
      tags: [
        '@Sanity',
        '@SanitySet1',
        '@GenAI',
        '@ModelServing',
        '@Deployment',
        '@Playground',
        '@NonConcurrent',
      ],
    },
    () => {
      cy.step('Log into the application');
      cy.visitWithLogin(
        '/?devFeatureFlags=genAiStudio=true,modelAsService=false',
        HTPASSWD_CLUSTER_ADMIN_USER,
      );

      cy.step('Navigate to AI asset endpoints page');
      genAiPlayground.navigateToAssets(projectName);

      cy.step('Click Add to playground button');
      genAiPlayground.findAddToPlaygroundButton().should('be.visible').click();

      cy.step('Ensure model is selected in the configuration table');
      genAiPlayground.findConfigurationTable().should('be.visible');
      genAiPlayground.ensureModelCheckboxIsChecked(genAiTestData.modelDeploymentName);

      cy.step('Click Create button in the modal');
      genAiPlayground.findCreateButtonInDialog().should('be.enabled').click();

      cy.step('Wait for llama-stack-config ConfigMap to be created');
      waitForResource('configmap', genAiTestData.configMapName, projectName);

      cy.step('Wait for OGXServer to be ready');
      waitForOGXServerReady(projectName);

      cy.step('Wait for playground service to be created');
      waitForResource('service', genAiTestData.playgroundServiceName, projectName);

      cy.step('Navigate to playground');
      genAiPlayground.navigate(projectName);

      cy.step(`Select ${genAiTestData.inferenceServiceName} model from dropdown`);
      genAiPlayground.selectModelFromDropdown(genAiTestData.inferenceServiceName);

      cy.step(`Verify ${genAiTestData.inferenceServiceName} model is selected`);
      genAiPlayground.verifyModelIsSelected(genAiTestData.inferenceServiceName);

      cy.step('Verify message input is ready and functional');
      genAiPlayground.findMessageInput().should('be.enabled').and('be.visible');

      cy.step('Send a test message to verify chatbot interface is working');
      genAiPlayground.sendMessage(genAiTestData.testMessage);

      cy.step('Verify user message appears in chat');
      genAiPlayground.findUserMessage().should('exist').and('contain', genAiTestData.testMessage);

      cy.step(
        'Verify playground is functional (model inference not tested due to slow response time)',
      );
      cy.log('✅ Playground interface is functional and ready to receive messages');
    },
  );

  it(
    'Verify custom endpoint UI creation and integration with existing playground',
    {
      tags: ['@GenAI', '@Playground', '@NonConcurrent'],
    },
    () => {
      const apiKey = Cypress.env('GEMINI_API_KEY');
      if (!apiKey) {
        throw new Error(
          'GEMINI_API_KEY is not set in test-variables.yml — cannot run custom endpoint tests',
        );
      }

      cy.fixture('e2e/genAi/testGenAiSettings.yaml', 'utf8').then((yamlContent: string) => {
        const customData = yaml.load(yamlContent) as CustomEndpointTestData;

        // Ensure externalProviders is reflected in the backend before opening the form.
        cy.step('Force backend to refresh config from cluster');
        forceDashboardConfigRefresh();

        // Navigate to assets with custom endpoints feature enabled.
        // The vLLM model is already in the table so no empty state.
        cy.step('Navigate to AI asset endpoints page with custom endpoints enabled');
        genAiPlayground.navigateToAssetsWithCustomEndpoints(projectName);

        cy.step('Force backend to refresh config from cluster');
        forceDashboardConfigRefresh();

        // --- Create custom endpoint via UI ---

        cy.step('Click Create endpoint button');
        genAiPlayground.findCreateEndpointButton().should('be.visible').click();

        cy.step('Verify Create endpoint modal is open');
        genAiPlayground.findCreateExternalModelModal().should('be.visible');

        cy.step('Fill in Model ID');
        genAiPlayground.findModelIdInput().clear().type(customData.modelId);

        cy.step('Fill in Display name');
        genAiPlayground.findDisplayNameInput().clear().type(customData.displayName);

        cy.step('Fill in Endpoint URL');
        const endpointHost = new URL(customData.endpointUrl).hostname;
        expect(ALLOWED_ENDPOINT_HOSTS).to.include(
          endpointHost,
          `Fixture endpoint host "${endpointHost}" is not in the allowlist — refusing to send API key`,
        );
        genAiPlayground.findEndpointUrlInput().clear().type(customData.endpointUrl);

        cy.step('Fill in API key');
        genAiPlayground.findTokenInput().clear().type(apiKey, { log: false });

        cy.step('Click Verify model button');
        genAiPlayground.findVerifyModelButton().should('be.enabled').click();

        cy.step('Verify model verification succeeds');
        genAiPlayground.findVerifySuccessAlert({ timeout: 30000 }).should('be.visible');

        cy.step('Click Create button to create the endpoint');
        genAiPlayground.findCreateEndpointSubmitButton().should('be.enabled').click();

        cy.step('Verify modal closes and custom model appears in AI Assets table');
        genAiPlayground.findCreateExternalModelModal().should('not.exist');
        genAiPlayground.findAiModelsTable().should('contain', customData.displayName);

        // --- Add to existing playground (OGX already running from first it block) ---

        cy.step('Add custom endpoint to the existing playground');
        genAiPlayground.findAddToPlaygroundButton().should('be.visible').click();
        genAiPlayground.findConfigurationTable().should('be.visible');
        genAiPlayground.ensureModelCheckboxIsChecked(customData.modelId);
        genAiPlayground.findCreateButtonInDialog().should('be.enabled').click();

        cy.step('Wait for custom model to be registered in LSD');
        waitForModelInLSD(customData.lsdServiceName, customData.modelId, projectName);

        // --- Verify custom model in playground ---

        cy.step('Navigate to playground');
        genAiPlayground.navigate(projectName);

        cy.step(`Select ${customData.displayName} model from dropdown`);
        genAiPlayground.selectModelFromDropdown(customData.displayName);

        cy.step(`Verify ${customData.displayName} model is selected`);
        genAiPlayground.verifyModelIsSelected(customData.displayName);

        cy.step('Verify message input is ready');
        genAiPlayground.findMessageInput().should('be.enabled').and('be.visible');

        cy.step('Send a test message using the custom endpoint model');
        genAiPlayground.sendMessage(customData.testMessage);

        cy.step('Verify user message appears in chat');
        genAiPlayground.findUserMessage().should('exist').and('contain', customData.testMessage);

        cy.step('Verify assistant response is received from custom endpoint');
        genAiPlayground.waitForStreamingComplete({ timeout: 60000 });
        genAiPlayground
          .findAssistantMessage({ timeout: 60000 })
          .should('exist')
          .and('not.be.empty');
      });
    },
  );
});
