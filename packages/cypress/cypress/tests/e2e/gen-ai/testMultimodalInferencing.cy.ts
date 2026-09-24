import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import {
  deleteOpenShiftProject,
  waitForUserProjectAccess,
} from '../../../utils/oc_commands/project';
import { waitForOGXServerReady } from '../../../utils/oc_commands/ogxServer';
import { waitForResource } from '../../../utils/oc_commands/baseCommands';
import {
  enableExternalProviders,
  disableExternalProviders,
  waitForModelInLSD,
  forceDashboardConfigRefresh,
  createExternalModelViaAPI,
  getExternalProviders,
} from '../../../utils/oc_commands/genAi';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { createCleanProject } from '../../../utils/projectChecker';
import { genAiPlayground } from '../../../pages/genAiPlayground';

type MultimodalTestData = {
  image: {
    fileName: string;
    base64Content: string;
    mimeType: string;
  };
  inference: {
    visionTestMessage: string;
    expectedResponseKeywords: string[];
  };
  model: {
    modelId: string;
    displayName: string;
    endpointUrl: string;
    configMapName: string;
    lsdServiceName: string;
  };
};

describe('Verify multimodal inferencing in playground', { testIsolation: false }, () => {
  let testData: MultimodalTestData;
  let originalExternalProviders: boolean | undefined;
  const projectName = `multimodal-e2e-${generateTestUUID()}`;

  retryableBefore(() => {
    cy.fixture('e2e/genAi/testMultimodalInferencing.yaml', 'utf8').then((yamlContent: string) => {
      testData = yaml.load(yamlContent) as MultimodalTestData;

      const apiKey = Cypress.env('GEMINI_API_KEY');
      if (!apiKey) {
        throw new Error(
          'GEMINI_API_KEY is not set in test-variables.yml — cannot run multimodal tests',
        );
      }

      if (originalExternalProviders === undefined) {
        getExternalProviders().then((externalProviders) => {
          originalExternalProviders = externalProviders;
        });
      }

      cy.step('Enable externalProviders in OdhDashboardConfig');
      enableExternalProviders();

      cy.step(`Create project ${projectName}`);
      createCleanProject(projectName);
      waitForUserProjectAccess(projectName, HTPASSWD_CLUSTER_ADMIN_USER.USERNAME);

      cy.step('Log into the application with genAiStudio and custom endpoints enabled');
      cy.visitWithLogin(
        `/?devFeatureFlags=genAiStudio=true,aiAssetCustomEndpoints=true,modelAsService=false`,
        HTPASSWD_CLUSTER_ADMIN_USER,
      );

      cy.step('Force backend to refresh config from cluster');
      forceDashboardConfigRefresh();

      cy.step('Create external vision model endpoint via API');
      createExternalModelViaAPI(
        projectName,
        testData.model.modelId,
        testData.model.displayName,
        testData.model.endpointUrl,
        apiKey,
        'llm',
        ['vision'],
      )
        .its('status')
        .should('be.oneOf', [200, 201]);

      cy.step('Navigate to AI assets and add model to playground');
      genAiPlayground.navigateToAssetsWithCustomEndpoints(projectName);
      genAiPlayground
        .findAiModelsTable({ timeout: 30000 })
        .should('contain', testData.model.displayName);
      genAiPlayground.findAddToPlaygroundButton().should('be.visible').click();
      genAiPlayground.findConfigurationTable().should('be.visible');
      genAiPlayground.ensureModelCheckboxIsChecked(testData.model.modelId);
      genAiPlayground.findCreateButtonInDialog().should('be.enabled').click();

      cy.step('Wait for llama-stack-config ConfigMap to be created');
      waitForResource('configmap', testData.model.configMapName, projectName);

      cy.step('Wait for OGX Server to be ready');
      waitForOGXServerReady(projectName);

      cy.step('Wait for playground service to be created');
      waitForResource('service', testData.model.lsdServiceName, projectName);

      cy.step('Wait for vision model to be registered in LSD');
      waitForModelInLSD(testData.model.lsdServiceName, testData.model.modelId, projectName, 60);
    });
  });

  after(() => {
    cy.step('Revert externalProviders in OdhDashboardConfig');
    if (originalExternalProviders !== undefined) {
      disableExternalProviders(originalExternalProviders);
    }

    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Send a message with an attached image to test vision model inference',
    {
      tags: [
        '@GenAI',
        '@Playground',
        '@Multimodal',
        '@Inference',
        '@VisionModel',
        '@FeatureFlagged',
      ],
    },
    () => {
      cy.step('Navigate to Gen AI playground');
      genAiPlayground.navigateWithCustomEndpoints(projectName);

      cy.step('Wait for playground to be ready');
      genAiPlayground.findMessageInput({ timeout: 30000 }).should('be.visible');

      cy.step('Upload an image');
      genAiPlayground.findAttachmentButton().click();
      genAiPlayground
        .findImageUploadMenuItem()
        .should('be.visible')
        .and('not.have.attr', 'aria-disabled', 'true')
        .click();
      genAiPlayground.findImageFileInput().selectFile(
        {
          contents: Cypress.Buffer.from(testData.image.base64Content, 'base64'),
          fileName: testData.image.fileName,
          mimeType: testData.image.mimeType,
        },
        { force: true },
      );

      cy.step('Verify image preview appears');
      genAiPlayground.findImagePreview({ timeout: 10000 }).should('be.visible');
      genAiPlayground.findImagePreviewCloseButton(testData.image.fileName).should('be.visible');

      cy.step('Type a message and send');
      const message = testData.inference.visionTestMessage;
      genAiPlayground.findMessageInput().type(message);
      cy.intercept('POST', '**/api/v1/lsd/responses**').as('createResponse');
      genAiPlayground.findSendButton().click();
      cy.wait('@createResponse')
        .its('request.body.input')
        .should('be.an', 'array')
        .and((input: unknown[]) => {
          expect(
            input.some((part) => {
              if (typeof part !== 'object' || part === null) {
                return false;
              }
              const inputPart = part as Record<string, unknown>;
              return (
                inputPart.type === 'input_image' &&
                typeof inputPart.file_id === 'string' &&
                inputPart.file_id.trim().length > 0
              );
            }),
          ).to.equal(true);
        });

      cy.step('Verify user message appears in chat');
      genAiPlayground.findAllUserMessages().should('contain.text', message);

      cy.step('Verify image is included in the sent message');
      genAiPlayground.findSentImage(testData.image.fileName).should('exist');

      cy.step('Wait for and verify model response to image');
      genAiPlayground
        .findAllAssistantMessages({ timeout: 60000 })
        .last()
        .invoke('text')
        .should('match', /\S/)
        .and((response) => {
          testData.inference.expectedResponseKeywords.forEach((keyword) => {
            expect(response.toLowerCase()).to.contain(keyword.toLowerCase());
          });
        });
      genAiPlayground.findChatbotErrorAlerts().should('not.exist');
    },
  );
});
