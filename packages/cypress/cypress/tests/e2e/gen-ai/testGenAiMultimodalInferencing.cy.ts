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
  enableExternalProviders,
  disableExternalProviders,
  forceDashboardConfigRefresh,
  deployWhisperTinyModel,
  getWhisperTinyPredictorDiagnostics,
  verifyWhisperTinyPortForward,
  getExternalProviders,
} from '../../../utils/oc_commands/genAi';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { createCleanProject } from '../../../utils/projectChecker';
import { genAiPlayground } from '../../../pages/genAiPlayground';

const ALLOWED_ENDPOINT_HOSTS = ['generativelanguage.googleapis.com'];

type MultimodalTestData = {
  audio: {
    fileName: string;
    base64Content: string;
    mimeType: string;
    asrModelId: string;
    asrDisplayName: string;
    prompt: string;
    expectedTranscriptKeywords: string[];
    expectedResponseKeywords: string[];
  };
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
    lsdPodPrefix: string;
    lsdPodReadyTimeout: string;
  };
};

describe('Verify multimodal inferencing in playground', { testIsolation: false }, () => {
  let testData: MultimodalTestData;
  let originalExternalProviders: boolean | undefined;
  let portForwardHandle: PortForwardHandle | null = null;
  let asrPortForwardHandle: PortForwardHandle | null = null;
  let audioTraceEvents: string[] | null = null;
  let stopAudioTrace: (() => void) | undefined;
  const projectName = `multimodal-e2e-${generateTestUUID()}`;

  afterEach(() => {
    stopAudioTrace?.();
    stopAudioTrace = undefined;
    if (audioTraceEvents) {
      cy.task('log', `[AUDIO TRACE]\n${audioTraceEvents.join('\n')}`);
      audioTraceEvents = null;
    }
  });

  retryableBefore(() => {
    if (asrPortForwardHandle) {
      stopPortForward(asrPortForwardHandle).then(() => {
        asrPortForwardHandle = null;
      });
    }
    if (portForwardHandle) {
      stopPortForward(portForwardHandle).then(() => {
        portForwardHandle = null;
      });
    }

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

      cy.step('Create and verify the external vision model endpoint in AI Assets');
      genAiPlayground.navigateToAssetsWithCustomEndpoints(projectName);
      forceDashboardConfigRefresh();
      genAiPlayground
        .findEmptyStateCreateEndpointButton({ timeout: 30000 })
        .should('be.visible')
        .click();
      genAiPlayground.findCreateExternalModelModal().should('be.visible');
      genAiPlayground.findModelIdInput().clear().type(testData.model.modelId);
      genAiPlayground.findDisplayNameInput().clear().type(testData.model.displayName);
      const endpointHost = new URL(testData.model.endpointUrl).hostname;
      expect(ALLOWED_ENDPOINT_HOSTS).to.include(
        endpointHost,
        `Fixture endpoint host "${endpointHost}" is not in the allowlist — refusing to send API key`,
      );
      genAiPlayground.findEndpointUrlInput().clear().type(testData.model.endpointUrl);
      genAiPlayground.findTokenInput().clear().type(apiKey, { log: false });
      cy.step('Set the vision capability');
      genAiPlayground.findAddCapabilityButton().click();
      genAiPlayground.findCapabilityMenuItem('vision').click();
      genAiPlayground.findSelectedCapability('vision').should('be.visible');
      genAiPlayground.findVerifyModelButton().should('be.enabled').click();
      genAiPlayground.findVerifySuccessAlert({ timeout: 30000 }).should('be.visible');
      genAiPlayground.findCreateEndpointSubmitButton().should('be.enabled').click();
      genAiPlayground.findCreateExternalModelModal().should('not.exist');
      genAiPlayground
        .findAiModelsTable({ timeout: 30000 })
        .should('contain', testData.model.displayName);

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

      cy.step('Wait for LSD pod to be fully ready');
      waitForPodReady(testData.model.lsdPodPrefix, testData.model.lsdPodReadyTimeout, projectName);

      cy.step('Start port-forward for LSD service');
      startPortForward(projectName, testData.model.lsdServiceName, 8321).then((handle) => {
        portForwardHandle = handle;
      });
    });
  });

  after(() => {
    stopPortForward(asrPortForwardHandle);
    stopPortForward(portForwardHandle);

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
      genAiPlayground.navigateToPlaygroundWithRetry(projectName);

      cy.step('Wait for playground to be ready');
      genAiPlayground.findMessageInput({ timeout: 120000 }).should('be.visible');

      cy.step(`Select ${testData.model.displayName} vision model`);
      genAiPlayground.selectModelFromDropdown(testData.model.displayName);
      genAiPlayground.verifyModelIsSelected(testData.model.displayName);

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

  it(
    'Send a message with attached audio to test transcription and inference',
    {
      tags: [
        '@GenAI',
        '@Playground',
        '@Multimodal',
        '@Inference',
        '@Audio',
        '@FeatureFlagged',
        '@NonConcurrent',
      ],
    },
    () => {
      audioTraceEvents = null;
      cy.step('Deploy the Whisper Tiny transcription model');
      deployWhisperTinyModel(projectName);

      cy.step('Forward the Whisper predictor to the local Gen AI BFF');
      startPortForward(projectName, 'whisper-tiny-predictor', 8790, 3000, 8080, 'deployment').then(
        (handle) => {
          asrPortForwardHandle = handle;
          if (handle) {
            verifyWhisperTinyPortForward(handle);
          }
        },
      );

      cy.intercept('GET', '**/lsd/models*').as('playgroundModels');
      cy.intercept('GET', '**/aaa/models*').as('assetModels');

      // CI traces show the Playground remounting and aborting transcription at a host poll.
      // Match the Cypress mock-test setup for this audio page only.
      cy.step('Disable dashboard polling on the audio test page');
      cy.on('window:before:load', (win) => {
        Object.assign(win, { POLL_INTERVAL: 999999 });
      });

      cy.step('Open a fresh Playground conversation with the Gemini chat model');
      genAiPlayground.navigateToPlaygroundWithRetry(projectName);
      cy.window().its('POLL_INTERVAL').should('eq', 999999);
      genAiPlayground.findMessageInput({ timeout: 120000 }).should('be.visible');

      cy.wait('@playgroundModels').then(({ request, response }) => {
        expect(new URL(request.url).searchParams.get('namespace')).to.equal(projectName);
        const body = response?.body as { data?: { id?: string }[] } | undefined;
        const modelIds = (body?.data ?? []).map((model) => model.id ?? '');
        expect(
          modelIds.some((id) => id.includes(testData.model.modelId)),
          `Playground models: ${modelIds.join(', ')}`,
        ).to.equal(true);
      });
      cy.wait('@assetModels').then(({ request, response }) => {
        expect(new URL(request.url).searchParams.get('namespace')).to.equal(projectName);
        const body = response?.body as { data?: { model_id?: string }[] } | undefined;
        const modelIds = (body?.data ?? []).map((model) => model.model_id ?? '');
        expect(modelIds, `AI Asset models: ${modelIds.join(', ')}`).to.include(
          testData.model.modelId,
        );
        expect(modelIds, `AI Asset models: ${modelIds.join(', ')}`).to.include(
          testData.audio.asrModelId,
        );
      });

      cy.step('Enable audio transcription and select the registered ASR model');
      genAiPlayground.ensureSettingsPanelOpen();
      genAiPlayground.selectModelFromDropdown(testData.model.displayName);
      genAiPlayground.verifyModelIsSelected(testData.model.displayName);
      genAiPlayground
        .findAddTranscriptionModelButton()
        .should('be.visible')
        .and('not.have.attr', 'aria-disabled', 'true')
        .click();
      genAiPlayground
        .findTranscriptionModelOption(testData.audio.asrModelId)
        .should('be.visible')
        .click();
      genAiPlayground
        .findTranscriptionModelSelector()
        .should('contain', testData.audio.asrDisplayName);

      let transcriptionStarted = false;
      const recordAudioTrace = (event: string): void => {
        audioTraceEvents?.push(`${new Date().toISOString()} ${event}`);
      };
      audioTraceEvents = [];

      cy.step('Trace browser requests and Playground state during transcription');
      cy.intercept({ method: 'GET', url: '**/api/**', middleware: true }, (request) => {
        if (transcriptionStarted) {
          const path = new URL(request.url).pathname;
          recordAudioTrace(`GET ${path} started`);
          request.on('after:response', (response) => {
            recordAudioTrace(`GET ${path} completed ${response.statusCode}`);
          });
        }
      });
      cy.window().then((win) => {
        const browserWindow = win;
        const originalFetch = win.fetch;
        const originalInput = win.document.querySelector('[data-testid="chatbot-message-bar"]');
        let currentInput = originalInput;
        let currentAudioChip = win.document.querySelector('[data-testid="audio-file-chip"]');
        let currentPath = win.location.pathname;

        const tracedFetch: typeof win.fetch = (input, init) => {
          if (!String(input).includes('/lsd/audio/transcriptions')) {
            return originalFetch.call(win, input, init);
          }

          transcriptionStarted = true;
          recordAudioTrace('transcription fetch started');
          init?.signal?.addEventListener(
            'abort',
            () => {
              const stack = new Error().stack?.split('\n').slice(1, 5).join(' | ');
              recordAudioTrace(`transcription abort signal fired${stack ? `: ${stack}` : ''}`);
            },
            { once: true },
          );

          return originalFetch.call(win, input, init).then(
            (response) => {
              recordAudioTrace(`transcription fetch resolved ${response.status}`);
              return response;
            },
            (error: unknown) => {
              recordAudioTrace(
                `transcription fetch rejected ${
                  error instanceof Error ? error.name : String(error)
                }`,
              );
              throw error;
            },
          );
        };
        browserWindow.fetch = tracedFetch;

        const onPageHide = (): void => recordAudioTrace('pagehide fired');
        const onBeforeUnload = (): void => recordAudioTrace('beforeunload fired');
        win.addEventListener('pagehide', onPageHide);
        win.addEventListener('beforeunload', onBeforeUnload);

        const observer = new win.MutationObserver(() => {
          if (!transcriptionStarted) {
            return;
          }
          if (win.location.pathname !== currentPath) {
            currentPath = win.location.pathname;
            recordAudioTrace(`browser path changed to ${currentPath}`);
          }
          const input = win.document.querySelector('[data-testid="chatbot-message-bar"]');
          if (input !== currentInput) {
            recordAudioTrace(`Playground input ${input ? 'mounted or replaced' : 'removed'}`);
            currentInput = input;
          }
          const audioChip = win.document.querySelector('[data-testid="audio-file-chip"]');
          if (audioChip !== currentAudioChip) {
            recordAudioTrace(`audio file chip ${audioChip ? 'added or replaced' : 'removed'}`);
            currentAudioChip = audioChip;
          }
        });
        observer.observe(win.document.body, { childList: true, subtree: true });

        stopAudioTrace = () => {
          observer.disconnect();
          win.removeEventListener('pagehide', onPageHide);
          win.removeEventListener('beforeunload', onBeforeUnload);
          if (win.fetch === tracedFetch) {
            browserWindow.fetch = originalFetch;
          }
        };
      });

      cy.intercept('POST', '**/api/v1/lsd/files/media**').as('uploadAudio');
      cy.intercept('POST', '**/api/v1/lsd/audio/transcriptions**', (request) => {
        transcriptionStarted = true;
        recordAudioTrace('transcription POST reached Cypress proxy');
        request.on('after:response', (response) => {
          recordAudioTrace(`transcription POST delivered ${response.statusCode}`);
        });
      }).as('transcribeAudio');
      let chatRequestCount = 0;
      cy.intercept('POST', '**/api/v1/lsd/responses**', (request) => {
        chatRequestCount += 1;
        request.continue();
      }).as('createAudioResponse');

      cy.step('Upload the JFK WAV through the attachment menu');
      genAiPlayground.findAttachmentButton().click();
      genAiPlayground
        .findAudioUploadMenuItem()
        .should('be.visible')
        .and('not.have.attr', 'aria-disabled', 'true')
        .click();
      genAiPlayground.findAudioFileInput().selectFile(
        {
          contents: Cypress.Buffer.from(testData.audio.base64Content, 'base64'),
          fileName: testData.audio.fileName,
          mimeType: testData.audio.mimeType,
        },
        { force: true },
      );

      let uploadedFileId = '';
      let transcribedText = '';

      cy.step('Verify the real media upload returns a file ID');
      cy.wait('@uploadAudio', { responseTimeout: 120000 }).then(({ request, response }) => {
        expect(new URL(request.url).searchParams.get('namespace')).to.equal(projectName);
        expect(response?.statusCode).to.be.oneOf([200, 201]);
        const body = response?.body as { data?: { id?: string } };
        expect(body.data?.id).to.be.a('string');
        expect((body.data?.id ?? '').length).to.be.greaterThan(0);
        uploadedFileId = body.data?.id ?? '';
      });

      cy.step('Verify transcription uses that file, selected ASR model, and namespace');
      cy.wait('@transcribeAudio', { responseTimeout: 120000 }).then(({ request, response }) => {
        expect(new URL(request.url).searchParams.get('namespace')).to.equal(projectName);
        const body = request.body as { file_id?: string; asr_model_id?: string };
        expect(body.file_id).to.equal(uploadedFileId);
        expect(body.asr_model_id).to.equal(testData.audio.asrModelId);
        if (response?.statusCode !== 200) {
          getWhisperTinyPredictorDiagnostics(projectName).then((diagnostics) => {
            throw new Error(
              `Transcription response: ${JSON.stringify(response?.body)}\n${diagnostics}`,
            );
          });
        } else {
          const transcription = response.body as { text?: string };
          expect(transcription.text).to.be.a('string');
          expect((transcription.text ?? '').length).to.be.greaterThan(0);
          transcribedText = transcription.text ?? '';
          const normalizedTranscript = transcribedText
            .toLowerCase()
            .replace(/[^\p{L}\p{N}]+/gu, ' ');
          testData.audio.expectedTranscriptKeywords.forEach((keyword) => {
            expect(normalizedTranscript).to.contain(keyword.toLowerCase());
          });
        }
      });

      cy.step('Verify audio is ready without submitting a chat request');
      genAiPlayground
        .findAudioFileChip()
        .should('be.visible')
        .and('contain', testData.audio.fileName.replace(/\.[^.]+$/, ''));
      genAiPlayground.findAudioTranscriptionError().should('not.exist');
      genAiPlayground.findMessageInput().should('have.value', '');
      cy.then(() => expect(chatRequestCount).to.equal(0));

      cy.step('Send a prompt and verify the exact transcript-to-chat payload');
      genAiPlayground.findMessageInput().type(testData.audio.prompt);
      genAiPlayground.findSendButton().should('be.enabled').click();
      cy.wait('@createAudioResponse', { responseTimeout: 120000 }).then(({ request, response }) => {
        expect(new URL(request.url).searchParams.get('namespace')).to.equal(projectName);
        expect(request.body.input).to.equal(`${transcribedText}\n\n${testData.audio.prompt}`);
        expect(response?.statusCode).to.equal(200);
        expect(chatRequestCount).to.equal(1);
      });

      cy.step('Verify the submitted message and completed assistant answer');
      // Streaming response headers can arrive before the answer is rendered in the chat.
      genAiPlayground
        .findAllAssistantMessages({ timeout: 120000 })
        .last()
        .invoke('text')
        .should('match', /\S/)
        .and((answer) => {
          const normalizedAnswer = answer.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ');
          testData.audio.expectedResponseKeywords.forEach((keyword) => {
            expect(normalizedAnswer).to.contain(keyword.toLowerCase());
          });
        });
      genAiPlayground
        .findAllUserMessages()
        .last()
        .should(($message) => {
          expect($message.text()).to.contain(transcribedText.trim());
          expect($message.text()).to.contain(testData.audio.prompt);
        });
      genAiPlayground.findStopButton().should('not.exist');
      genAiPlayground.findChatbotErrorAlerts().should('not.exist');
      genAiPlayground.findAudioFileChip().should('not.exist');
    },
  );
});
