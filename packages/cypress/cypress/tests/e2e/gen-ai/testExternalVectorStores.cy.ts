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
      tags: ['@GenAI', '@Featureflagged', '@NonConcurrent', '@Playground'],
    },
    () => {
      cy.step('Wait for the inference endpoint in AI assets');
      genAiPlayground.navigateToAssetsWithExternalVectorStores(projectName);
      genAiPlayground.findAiModelRow(testData.model.id, { timeout: 120000 }).should('be.visible');

      cy.step('Open the Vector stores tab');
      genAiPlayground.findVectorStoresTab().click();

      cy.step('Add the vector store and inference endpoint to the Playground');
      genAiPlayground.findVectorStoreAddToPlaygroundButton(testData.vectorStore.id).click();
      genAiPlayground.findCreateButtonInDialog().click();

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
      genAiPlayground.findVectorStoresTab().click();
      genAiPlayground
        .findVectorStoreTryInPlaygroundButton(testData.vectorStore.id, { timeout: 120000 })
        .click();
      genAiPlayground
        .findExternalVectorStoreToggle({ timeout: 120000 })
        .should('contain.text', testData.vectorStore.name);
      genAiPlayground.findMessageInput({ timeout: 120000 }).should('be.visible');

      cy.step('Ask a question grounded by the seeded external vector store');
      cy.intercept('POST', '**/api/v1/lsd/responses**').as('groundedResponse');
      genAiPlayground.sendMessage(testData.seed.question);
      genAiPlayground.findAllUserMessages().last().should('contain.text', testData.seed.question);
      cy.wait('@groundedResponse', { timeout: 120000 }).then(({ request }) => {
        expect(request.body.vector_store_ids).to.deep.equal([testData.vectorStore.id]);
      });

      cy.step('Verify the grounded answer');
      genAiPlayground
        .findAllAssistantMessages({ timeout: 120000 })
        .last()
        .should('contain.text', testData.seed.expectedContentFragment);
    },
  );
});
