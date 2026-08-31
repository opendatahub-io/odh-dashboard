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
  waitForModelInLSD,
  forceDashboardConfigRefresh,
  createExternalModelViaAPI,
} from '../../../utils/oc_commands/genAi';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import type { MultimodalTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import { genAiPlayground } from '../../../pages/genAiPlayground';

describe('Verify multimodal inferencing in playground', { testIsolation: false }, () => {
  let testData: MultimodalTestData;
  const projectName = `multimodal-e2e-${generateTestUUID()}`;

  retryableBefore(() => {
    cy.fixture('e2e/genAi/testMultimodalInferencing.yaml', 'utf8').then((yamlContent: string) => {
      testData = yaml.load(yamlContent) as MultimodalTestData;

      const apiKey = Cypress.env('OPENAI_API_KEY');
      if (!apiKey) {
        throw new Error(
          'OPENAI_API_KEY is not set in test-variables.yml — cannot run multimodal tests',
        );
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

      cy.step('Wait for OGX Server to be ready');
      waitForOGXServerReady(projectName);

      cy.step('Wait for playground service to be created');
      waitForResource('service', testData.model.lsdServiceName, projectName);

      cy.step('Wait for LSD pod to be fully ready');
      waitForPodReady(testData.model.lsdPodPrefix, testData.model.lsdPodReadyTimeout, projectName);

      cy.step('Wait for vision model to be registered in LSD');
      waitForModelInLSD(testData.model.lsdServiceName, testData.model.modelId, projectName);
    });
  });

  after(() => {
    cy.step('Revert externalProviders in OdhDashboardConfig');
    disableExternalProviders();

    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'Upload and preview an image in playground',
    {
      tags: ['@GenAI', '@Playground', '@Multimodal', '@ImageUpload'],
    },
    () => {
      cy.step('Navigate to Gen AI playground');
      genAiPlayground.navigateWithCustomEndpoints(projectName);

      cy.step('Wait for playground to be ready');
      genAiPlayground.findMessageInput({ timeout: 30000 }).should('be.visible');

      cy.step('Upload a test image file');
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
    },
  );

  it(
    'Remove an uploaded image in playground',
    {
      tags: ['@GenAI', '@Playground', '@Multimodal', '@ImageUpload'],
    },
    () => {
      cy.step('Navigate to Gen AI playground');
      genAiPlayground.navigateWithCustomEndpoints(projectName);

      cy.step('Wait for playground to be ready');
      genAiPlayground.findMessageInput({ timeout: 30000 }).should('be.visible');

      cy.step('Upload a test image');
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

      cy.step('Click remove button on the image preview');
      genAiPlayground
        .findImagePreview()
        .findByRole('button', { name: /remove/i })
        .click();

      cy.step('Verify image preview is removed');
      genAiPlayground.findImagePreview().should('not.exist');
    },
  );

  it(
    'Validate file size limits for image uploads',
    {
      tags: ['@GenAI', '@Playground', '@Multimodal', '@Validation'],
    },
    () => {
      cy.step('Navigate to Gen AI playground');
      genAiPlayground.navigateWithCustomEndpoints(projectName);

      cy.step('Wait for playground to be ready');
      genAiPlayground.findMessageInput({ timeout: 30000 }).should('be.visible');

      cy.step('Attempt to upload a file exceeding size limit');
      const largeContent = 'A'.repeat(testData.validation.maxFileSizeBytes + 1000);
      genAiPlayground.findImageFileInput().selectFile(
        {
          contents: largeContent,
          fileName: 'large-image.png',
          mimeType: 'image/png',
        },
        { force: true },
      );

      cy.step('Verify validation error appears');
      genAiPlayground.findMediaValidationError({ timeout: 10000 }).should('be.visible');
    },
  );

  it(
    'Validate file type restrictions for image uploads',
    {
      tags: ['@GenAI', '@Playground', '@Multimodal', '@Validation'],
    },
    () => {
      cy.step('Navigate to Gen AI playground');
      genAiPlayground.navigateWithCustomEndpoints(projectName);

      cy.step('Wait for playground to be ready');
      genAiPlayground.findMessageInput({ timeout: 30000 }).should('be.visible');

      cy.step('Attempt to upload an invalid file type');
      genAiPlayground.findImageFileInput().selectFile(
        {
          contents: 'This is plain text, not an image',
          fileName: 'invalid-file.txt',
          mimeType: 'text/plain',
        },
        { force: true },
      );

      cy.step('Verify validation error appears');
      genAiPlayground.findMediaValidationError({ timeout: 10000 }).should('be.visible');
    },
  );

  it(
    'Upload an audio file in playground',
    {
      tags: ['@GenAI', '@Playground', '@Multimodal', '@AudioUpload'],
    },
    () => {
      cy.step('Navigate to Gen AI playground');
      genAiPlayground.navigateWithCustomEndpoints(projectName);

      cy.step('Wait for playground to be ready');
      genAiPlayground.findMessageInput({ timeout: 30000 }).should('be.visible');

      cy.step('Upload a test audio file');
      genAiPlayground.findAudioFileInput().selectFile(
        {
          contents: testData.audio.sampleContent,
          fileName: testData.audio.fileName,
          mimeType: testData.audio.mimeType,
        },
        { force: true },
      );

      cy.step('Verify audio file chip appears');
      genAiPlayground.findAudioFileChip({ timeout: 10000 }).should('be.visible');
    },
  );

  it(
    'Remove an uploaded audio file',
    {
      tags: ['@GenAI', '@Playground', '@Multimodal', '@AudioUpload'],
    },
    () => {
      cy.step('Navigate to Gen AI playground');
      genAiPlayground.navigateWithCustomEndpoints(projectName);

      cy.step('Wait for playground to be ready');
      genAiPlayground.findMessageInput({ timeout: 30000 }).should('be.visible');

      cy.step('Upload a test audio file');
      genAiPlayground.findAudioFileInput().selectFile(
        {
          contents: testData.audio.sampleContent,
          fileName: testData.audio.fileName,
          mimeType: testData.audio.mimeType,
        },
        { force: true },
      );

      cy.step('Verify audio file chip appears');
      genAiPlayground.findAudioFileChip({ timeout: 10000 }).should('be.visible');

      cy.step('Remove the audio file');
      genAiPlayground
        .findAudioFileChip()
        .findByRole('button', { name: /remove/i })
        .click();

      cy.step('Verify audio file chip is removed');
      genAiPlayground.findAudioFileChip().should('not.exist');
    },
  );

  it(
    'Verify upload controls are displayed based on model capabilities',
    {
      tags: ['@GenAI', '@Playground', '@Multimodal', '@ModelSelection'],
    },
    () => {
      cy.step('Navigate to Gen AI playground');
      genAiPlayground.navigateWithCustomEndpoints(projectName);

      cy.step('Wait for playground to be ready');
      genAiPlayground.findMessageInput({ timeout: 30000 }).should('be.visible');

      cy.step('Open the attachment menu');
      genAiPlayground.findAttachmentButton().click();

      cy.step('Verify image upload option is available');
      genAiPlayground.findImageUploadMenuItem().should('be.visible');

      cy.step('Verify audio upload option is available');
      genAiPlayground.findAudioUploadMenuItem().should('be.visible');
    },
  );

  it(
    'Send a message with an attached image to test vision model inference',
    {
      tags: ['@GenAI', '@Playground', '@Multimodal', '@Inference', '@VisionModel'],
    },
    () => {
      cy.step('Navigate to Gen AI playground');
      genAiPlayground.navigateWithCustomEndpoints(projectName);

      cy.step('Wait for playground to be ready');
      genAiPlayground.findMessageInput({ timeout: 30000 }).should('be.visible');

      cy.step('Upload an image');
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

      cy.step('Type a message and send');
      const message = testData.inference.visionTestMessage;
      genAiPlayground.findMessageInput().type(message);
      genAiPlayground.findSendButton().click();

      cy.step('Verify user message appears in chat');
      genAiPlayground.findAllUserMessages().should('contain.text', message);

      cy.step('Verify image is included in the sent message');
      genAiPlayground.findImageInUserMessage().should('exist');
    },
  );
});
