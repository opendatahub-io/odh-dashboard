import * as yaml from 'js-yaml';
import { HTPASSWD_CLUSTER_ADMIN_USER } from '../../../utils/e2eUsers';
import { genAiPlayground } from '../../../pages/genAiPlayground';
import type { ExternalVectorStoreTestData } from '../../../types';
import { createCleanProject } from '../../../utils/projectChecker';
import { retryableBefore } from '../../../utils/retryableHooks';
import { generateTestUUID } from '../../../utils/uuidGenerator';
import {
  deleteOpenShiftProject,
  waitForUserProjectAccess,
} from '../../../utils/oc_commands/project';
import { waitForOGXServerReady } from '../../../utils/oc_commands/ogxServer';
import {
  startPortForward,
  stopPortForward,
  type PortForwardHandle,
} from '../../../utils/oc_commands/baseCommands';
import {
  createExternalModelViaAPI,
  disableExternalProviders,
  enableExternalProviders,
  forceDashboardConfigRefresh,
  getExternalProviders,
} from '../../../utils/oc_commands/genAi';
import {
  provisionExternalVectorStoreFixture,
  seedExternalVectorStoreFixture,
} from '../../../utils/oc_commands/externalVectorStore';

describe('External vector store full lifecycle', () => {
  let testData: ExternalVectorStoreTestData;
  let externalProvidersBaseline: boolean | undefined;
  let portForwardHandle: PortForwardHandle | null = null;
  const projectName = `external-vs-e2e-${generateTestUUID()}`;

  retryableBefore(() => {
    cy.fixture('e2e/genAi/testExternalVectorStores.yaml', 'utf8').then((yamlContent: string) => {
      testData = yaml.load(yamlContent) as ExternalVectorStoreTestData;

      const apiKey = Cypress.env('GEMINI_API_KEY');
      if (!apiKey) {
        throw new Error(
          'GEMINI_API_KEY is not set in test-variables.yml — cannot run external vector store E2E tests',
        );
      }

      if (externalProvidersBaseline === undefined) {
        getExternalProviders().then((enabled) => {
          externalProvidersBaseline = enabled;
        });
      }

      cy.step('Enable external model providers');
      enableExternalProviders();

      cy.step(`Create isolated project ${projectName}`);
      createCleanProject(projectName);
      waitForUserProjectAccess(projectName, HTPASSWD_CLUSTER_ADMIN_USER.USERNAME);

      cy.step('Log into the application with external vector stores enabled');
      cy.visitWithLogin(
        '/?devFeatureFlags=genAiStudio=true,aiAssetCustomEndpoints=true,externalVectorStores=true,modelAsService=false',
        HTPASSWD_CLUSTER_ADMIN_USER,
      );
      forceDashboardConfigRefresh();

      cy.step('Create the inference endpoint used by the Playground');
      createExternalModelViaAPI(
        projectName,
        testData.model.id,
        testData.model.displayName,
        testData.model.endpointUrl,
        apiKey,
      )
        .its('status')
        .should('be.oneOf', [200, 201]);

      cy.step('Provision the registered external vector store fixture before Playground install');
      provisionExternalVectorStoreFixture(projectName, testData);
    });
  });

  after(() => {
    stopPortForward(portForwardHandle);

    if (externalProvidersBaseline !== undefined) {
      cy.step('Restore the external providers setting');
      disableExternalProviders(externalProvidersBaseline);
    }
    deleteOpenShiftProject(projectName, { wait: false, ignoreNotFound: true });
  });

  it(
    'validates the registered store through a grounded Playground response',
    {
      tags: ['@GenAI', '@FeatureFlagged', '@NonConcurrent', '@Playground'],
    },
    () => {
      cy.step('Open the Vector stores tab');
      genAiPlayground.navigateToAssetsWithExternalVectorStores(projectName);
      genAiPlayground.findVectorStoresTab().should('be.visible').click();

      cy.step('Verify the provider-neutral vector store table metadata');
      genAiPlayground.findVectorStoresTable({ timeout: 30000 }).should('be.visible');
      genAiPlayground
        .findVectorStoreRow(testData.vectorStore.id)
        .should('contain.text', testData.vectorStore.name)
        .and('contain.text', testData.vectorStore.embeddingModel)
        .and('contain.text', String(testData.vectorStore.embeddingDimension));

      cy.step('Verify the vector store details popup');
      genAiPlayground.findVectorStoreInfoButton(testData.vectorStore.id).click();
      genAiPlayground.findVectorStoreDetails(testData.vectorStore.id).should('be.visible');
      genAiPlayground
        .findVectorStoreProviderId(testData.vectorStore.id)
        .should('have.value', testData.provider.id);
      genAiPlayground
        .findVectorStoreProviderType(testData.vectorStore.id)
        .should('have.value', testData.provider.type);
      genAiPlayground
        .findVectorStoreId(testData.vectorStore.id)
        .should('have.value', testData.vectorStore.id);
      genAiPlayground.findVectorStoreInfoButton(testData.vectorStore.id).click();
      genAiPlayground.findVectorStoreDetails(testData.vectorStore.id).should('not.exist');

      cy.step('Add the vector store and inference endpoint to the Playground');
      genAiPlayground.findVectorStoreAddToPlaygroundButton(testData.vectorStore.id).click();
      genAiPlayground.findConfigurationCollectionsTable().should('be.visible');
      genAiPlayground
        .findConfigurationVectorStoreCheckbox(testData.vectorStore.id)
        .should('be.checked');
      genAiPlayground.findCreateButtonInDialog().should('be.enabled').click();

      cy.step('Wait for the Playground runtime to be Ready');
      waitForOGXServerReady(projectName, { maxAttempts: 90, pollIntervalMs: 5000 });

      cy.step('Connect the local E2E BFF to the namespace Playground service');
      stopPortForward(portForwardHandle).then(() => {
        startPortForward(projectName, 'lsd-genai-playground-service', 8321).then((handle) => {
          portForwardHandle = handle;
        });
      });

      cy.step('Populate the provider table after LlamaStack registers the store');
      seedExternalVectorStoreFixture(projectName, testData);

      cy.step('Launch the registered store using Try in playground');
      genAiPlayground.navigateToAssetsWithExternalVectorStores(projectName);
      genAiPlayground.findVectorStoresTab().should('be.visible').click();
      genAiPlayground
        .findVectorStoreTryInPlaygroundButton(testData.vectorStore.id, { timeout: 120000 })
        .should('be.visible')
        .click();

      cy.step('Verify the store is automatically selected in Knowledge settings');
      genAiPlayground.findMessageInput({ timeout: 120000 }).should('be.visible');
      genAiPlayground.findKnowledgeTabButton().should('have.attr', 'aria-pressed', 'true');
      genAiPlayground.findRagToggle().should('be.checked');
      genAiPlayground.findExternalKnowledgeModeRadio().should('be.checked');
      genAiPlayground
        .findExternalVectorStoreToggle({ timeout: 30000 })
        .should('contain.text', testData.vectorStore.name);
      genAiPlayground.verifyModelIsSelected(testData.model.displayName);

      cy.step('Ask a question grounded by the seeded external vector store');
      genAiPlayground.sendMessage(testData.seed.question);
      genAiPlayground.findUserMessage().should('exist').and('contain.text', testData.seed.question);
      genAiPlayground.waitForStreamingComplete({ timeout: 120000 });

      cy.step('Verify the grounded answer and retrieval evidence');
      genAiPlayground
        .findAllAssistantMessages({ timeout: 30000 })
        .last()
        .should('contain.text', testData.seed.expectedContentFragment);
      genAiPlayground.findFileSearchResults({ timeout: 30000 }).should('exist');
    },
  );
});
