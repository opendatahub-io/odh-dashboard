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
  waitForModelInLSD,
} from '../../../utils/oc_commands/genAi';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import { createCleanProject } from '../../../utils/projectChecker';
import { genAiPlayground } from '../../../pages/genAiPlayground';

const ALLOWED_ENDPOINT_HOSTS = ['generativelanguage.googleapis.com'];

type DocumentTestData = {
  model: {
    modelId: string;
    displayName: string;
    endpointUrl: string;
    configMapName: string;
    lsdServiceName: string;
    lsdPodPrefix: string;
    lsdPodReadyTimeout: string;
  };
  documents: {
    cedar: {
      path: string;
      fileName: string;
      extractedText: string;
      expectedAnswer: string;
    };
    maple: {
      path: string;
      fileName: string;
      extractedText: string;
      expectedAnswer: string;
    };
    question: string;
  };
};

type DocumentUploadBody = {
  data?: { id?: string; filename?: string; text?: string };
};

type ResponseRequestBody = {
  input?: unknown;
  attachments?: { file_id: string; filename: string; text: string }[];
};

describe(
  'Verify document attachments in the Gen AI playground',
  { retries: { runMode: 0, openMode: 0 } },
  () => {
    let testData: DocumentTestData;
    let portForwardHandle: PortForwardHandle | null = null;
    const projectName = `documents-e2e-${generateTestUUID()}`;

    const openPlayground = () => {
      genAiPlayground.navigateToPlaygroundWithRetry(projectName);
      genAiPlayground.findMessageInput({ timeout: 120000 }).should('be.visible');
      genAiPlayground.selectModelFromDropdown(testData.model.displayName);
      genAiPlayground.verifyModelIsSelected(testData.model.displayName);
    };

    const attachDocuments = (paths: string[]) => {
      genAiPlayground.findAttachmentButton().click();
      genAiPlayground.findDocumentUploadMenuItem().should('be.visible').click();
      genAiPlayground.findDocumentFileInput().selectFile(paths, { force: true });
    };

    retryableBefore(() => {
      if (portForwardHandle) {
        stopPortForward(portForwardHandle).then(() => {
          portForwardHandle = null;
        });
      }

      cy.fixture('e2e/genAi/testDocumentAttachments.yaml', 'utf8').then((yamlContent: string) => {
        testData = yaml.load(yamlContent) as DocumentTestData;

        const apiKey = Cypress.env('GEMINI_API_KEY');
        if (!apiKey) {
          throw new Error(
            'GEMINI_API_KEY is not set in test-variables.yml — cannot run document attachment tests',
          );
        }

        cy.step('Enable external providers and create a dedicated project');
        enableExternalProviders();
        createCleanProject(projectName);
        waitForUserProjectAccess(projectName, HTPASSWD_CLUSTER_ADMIN_USER.USERNAME);

        cy.step('Log in and refresh the dashboard configuration');
        cy.visitWithLogin(
          '/?devFeatureFlags=genAiStudio=true,aiAssetCustomEndpoints=true,modelAsService=false',
          HTPASSWD_CLUSTER_ADMIN_USER,
        );
        forceDashboardConfigRefresh();

        cy.step('Create a custom endpoint for document questions');
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
        genAiPlayground.findVerifyModelButton().should('be.enabled').click();
        genAiPlayground.findVerifySuccessAlert({ timeout: 30000 }).should('be.visible');
        genAiPlayground.findCreateEndpointSubmitButton().should('be.enabled').click();
        genAiPlayground.findCreateExternalModelModal().should('not.exist');

        cy.step('Add the endpoint to Playground and wait for services');
        genAiPlayground.navigateToAssetsWithCustomEndpoints(projectName);
        genAiPlayground
          .findAiModelsTable({ timeout: 30000 })
          .should('contain', testData.model.displayName);
        genAiPlayground.findAddToPlaygroundButton().should('be.visible').click();
        genAiPlayground.findConfigurationTable().should('be.visible');
        genAiPlayground.ensureModelCheckboxIsChecked(testData.model.modelId);
        genAiPlayground.findCreateButtonInDialog().should('be.enabled').click();
        waitForResource('configmap', testData.model.configMapName, projectName);
        waitForOGXServerReady(projectName);
        waitForResource('service', testData.model.lsdServiceName, projectName);
        waitForPodReady(
          testData.model.lsdPodPrefix,
          testData.model.lsdPodReadyTimeout,
          projectName,
        );
        waitForModelInLSD(testData.model.lsdServiceName, testData.model.modelId, projectName);
        startPortForward(projectName, testData.model.lsdServiceName, 8321).then((handle) => {
          portForwardHandle = handle;
        });
      });
    });

    after(() => {
      stopPortForward(portForwardHandle);

      cy.step('Revert externalProviders in OdhDashboardConfig');
      disableExternalProviders();

      deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
    });

    it(
      'attaches two documents and answers a question about both',
      {
        tags: [
          '@GenAI',
          '@Playground',
          '@Documents',
          '@Inference',
          '@FeatureFlagged',
          '@NonConcurrent',
        ],
      },
      () => {
        const documents = [testData.documents.cedar, testData.documents.maple];

        cy.step('Open Playground with the text model');
        openPlayground();
        cy.intercept('POST', '**/api/v1/lsd/documents**').as('uploadDocument');
        cy.intercept('POST', '**/api/v1/lsd/responses**').as('createResponse');

        cy.step('Attach both documents in one selection and verify extraction');
        attachDocuments(documents.map(({ path: documentPath }) => documentPath));
        const uploadedFileNames: string[] = [];
        documents.forEach(() => {
          cy.wait('@uploadDocument', { responseTimeout: 120000 }).then(({ request, response }) => {
            expect(new URL(request.url).searchParams.get('namespace')).to.equal(projectName);
            expect(response?.statusCode).to.equal(200);
            const uploaded = (response?.body as DocumentUploadBody | undefined)?.data;
            const expected = documents.find(({ fileName }) => fileName === uploaded?.filename);
            expect(
              expected,
              `Unexpected uploaded file: ${uploaded?.filename ?? 'unknown'}`,
            ).not.to.equal(undefined);
            expect(uploaded?.id).to.be.a('string');
            expect(uploaded?.text).to.contain(expected?.extractedText);
            if (uploaded?.filename) {
              uploadedFileNames.push(uploaded.filename);
            }
          });
        });
        cy.then(() => {
          expect(uploadedFileNames).to.have.members(documents.map(({ fileName }) => fileName));
        });
        documents.forEach(({ fileName }) => {
          genAiPlayground.findDocumentAttachmentByName(fileName).should('be.visible');
        });

        cy.step('Ask about both documents and verify the request and answer');
        genAiPlayground.sendMessage(testData.documents.question);
        cy.wait('@createResponse', { responseTimeout: 120000 }).then(({ request }) => {
          const body = request.body as ResponseRequestBody;
          expect(body.input).to.equal(testData.documents.question);
          expect(body.attachments).to.have.length(2);
          expect(body.attachments?.map(({ filename }) => filename)).to.have.members(
            documents.map(({ fileName }) => fileName),
          );
          documents.forEach(({ fileName, extractedText }) => {
            const attachment = body.attachments?.find(({ filename }) => filename === fileName);
            expect(attachment?.file_id).to.be.a('string');
            expect(attachment?.text).to.contain(extractedText);
          });
        });
        genAiPlayground.findAllUserMessages().last().should('contain', testData.documents.question);
        genAiPlayground
          .findAllAssistantMessages({ timeout: 120000 })
          .last()
          .invoke('text')
          .should((answer) => {
            documents.forEach(({ expectedAnswer }) => {
              expect(answer.toLowerCase()).to.contain(expectedAnswer.toLowerCase());
            });
          });
        genAiPlayground.findChatbotErrorAlerts().should('not.exist');
      },
    );
  },
);
