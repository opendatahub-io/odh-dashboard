import { HTPASSWD_CLUSTER_ADMIN_USER } from './e2eUsers';
import { waitForAutoXDspaReady } from './oc_commands/autoX';
import { waitForAutoragManagedPipelines } from './autoXPipelines';
import {
  getVectorDatabaseConnection,
  resetAutoragConnections,
  verifyAutoragVectorDatabaseConnectionSecret,
} from './oc_commands/autoragInfra';
import { AWS_BUCKETS } from './s3Buckets';
import { resolveAutoXS3Endpoint } from './autoXS3';
import { autoragExperimentsPage } from '../pages/autorag/experimentsPage';
import { autoragConfigurePage } from '../pages/autorag/configurePage';
import { autoragResultsPage } from '../pages/autorag/resultsPage';
import type { AutoragTestData } from '../types';
import {
  AUTORAG_CANCELLATION_TIMEOUT_MS,
  AUTORAG_COMPLETION_TIMEOUT_MS,
} from '../support/timeouts';

const RESOURCES_PATH = 'resources/autorag';
const DOCUMENT_KEYS_FIELD = 'correct_answer_document_keys';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const renderAutoragEvaluationData = (
  evaluationData: string,
  documentFile: string,
  uploadFileName: string,
): string => {
  let parsedEvaluationData: unknown;
  try {
    parsedEvaluationData = JSON.parse(evaluationData);
  } catch {
    throw new Error('AutoRAG evaluation dataset is not valid JSON.');
  }

  if (!Array.isArray(parsedEvaluationData)) {
    throw new Error('AutoRAG evaluation dataset must be a JSON array.');
  }

  let replacedDocumentReferenceCount = 0;
  const renderedEvaluationData = parsedEvaluationData.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`AutoRAG evaluation entry ${index} must be a JSON object.`);
    }

    const documentKeys = entry[DOCUMENT_KEYS_FIELD];
    if (
      !Array.isArray(documentKeys) ||
      documentKeys.some((documentKey) => typeof documentKey !== 'string')
    ) {
      throw new Error(
        `AutoRAG evaluation entry ${index} must contain string correct_answer_document_keys.`,
      );
    }

    return {
      ...entry,
      [DOCUMENT_KEYS_FIELD]: documentKeys.map((documentKey) => {
        if (documentKey !== documentFile) {
          return documentKey;
        }

        replacedDocumentReferenceCount += 1;
        return uploadFileName;
      }),
    };
  });

  if (replacedDocumentReferenceCount === 0) {
    throw new Error(
      `Evaluation dataset does not reference the configured document ${documentFile}.`,
    );
  }

  return JSON.stringify(renderedEvaluationData, null, 2);
};

type MaaSModel = { id?: unknown; ready?: unknown };

type MaaSConfig = {
  MAAS_URL?: unknown;
  MAAS_API_KEY?: unknown;
  MAAS_GENERATION_MODEL_ID?: unknown;
  MAAS_EMBEDDING_MODEL_ID?: unknown;
};

export type AutoragMaaSFixture =
  | {
      mode: 'external';
      maasUrl: string;
      apiKey: string;
      generationModelId: string;
      embeddingModelId: string;
      ownership: 'external-readonly';
      supportsCompletionResults: boolean;
    }
  | {
      mode: 'simulator';
      maasUrl: string;
      apiKey: string;
      generationModelId: string;
      embeddingModelId: string;
      ownership: 'dummy-lifecycle-only';
      supportsCompletionResults: false;
    };

export type AutoragConnectionOwnership = {
  maasSecretCreated: boolean;
  vectorDbSecretCreated: boolean;
};

const MAAS_CONFIG_KEYS = [
  'MAAS_URL',
  'MAAS_API_KEY',
  'MAAS_GENERATION_MODEL_ID',
  'MAAS_EMBEDDING_MODEL_ID',
] as const;

const SIMULATOR_MAAS_FIXTURE: Omit<Extract<AutoragMaaSFixture, { mode: 'simulator' }>, 'mode'> = {
  maasUrl: 'https://autorag-maas.invalid',
  apiKey: 'autorag-cypress-dummy-api-key',
  generationModelId: 'autorag-cypress-generation-dummy',
  embeddingModelId: 'autorag-cypress-embedding-dummy',
  ownership: 'dummy-lifecycle-only',
  supportsCompletionResults: false,
};

const readMaaSConfig = (): MaaSConfig => ({
  MAAS_URL: Cypress.env('MAAS_URL'),
  MAAS_API_KEY: Cypress.env('MAAS_API_KEY'),
  MAAS_GENERATION_MODEL_ID: Cypress.env('MAAS_GENERATION_MODEL_ID'),
  MAAS_EMBEDDING_MODEL_ID: Cypress.env('MAAS_EMBEDDING_MODEL_ID'),
});

/**
 * Resolve the AutoRAG MaaS dependency without creating or changing any MaaS resources.
 * External mode is selected only when all four MaaS configuration values are non-empty.
 */
export const resolveAutoragMaaSFixture = (
  config: MaaSConfig = readMaaSConfig(),
): AutoragMaaSFixture => {
  const values = MAAS_CONFIG_KEYS.map((key) => {
    const value = config[key];
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  });

  if (values.some((value): value is undefined => value === undefined)) {
    return {
      mode: 'simulator',
      ...SIMULATOR_MAAS_FIXTURE,
    };
  }

  const [maasUrl, apiKey, generationModelId, embeddingModelId] = values as [
    string,
    string,
    string,
    string,
  ];
  return {
    mode: 'external',
    maasUrl,
    apiKey,
    generationModelId,
    embeddingModelId,
    ownership: 'external-readonly',
    supportsCompletionResults: false,
  };
};

const getMaaSServiceRoot = (configuredUrl: string): string => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error('MaaS readiness check requires MAAS_URL to be an HTTPS service root.');
  }

  if (
    parsedUrl.protocol !== 'https:' ||
    !parsedUrl.hostname ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error('MaaS readiness check requires MAAS_URL to be an HTTPS service root.');
  }

  return `${parsedUrl.origin}${parsedUrl.pathname.replace(/\/+$/, '')}`;
};

const isMaaSModel = (value: unknown): value is MaaSModel =>
  typeof value === 'object' && value !== null;

const isValidAutoragS3Configuration = (
  testData: Pick<AutoragTestData, 'awsBucket' | 's3SecretName'>,
): boolean => {
  const buckets: unknown = AWS_BUCKETS;
  if (!isRecord(buckets) || !isNonEmptyString(testData.s3SecretName)) {
    return false;
  }

  const bucket = buckets[testData.awsBucket];
  if (
    !isRecord(bucket) ||
    !isNonEmptyString(bucket.NAME) ||
    !isNonEmptyString(bucket.REGION) ||
    !isNonEmptyString(bucket.ENDPOINT) ||
    !isNonEmptyString(buckets.AWS_ACCESS_KEY_ID) ||
    !isNonEmptyString(buckets.AWS_SECRET_ACCESS_KEY)
  ) {
    return false;
  }

  try {
    const endpoint = resolveAutoXS3Endpoint(bucket.ENDPOINT);
    const normalizedEndpoint = /^https?:\/\//i.test(endpoint) ? endpoint : `https://${endpoint}`;
    const parsedEndpoint = new URL(normalizedEndpoint);
    return (
      (parsedEndpoint.protocol === 'http:' || parsedEndpoint.protocol === 'https:') &&
      !!parsedEndpoint.hostname &&
      parsedEndpoint.pathname === '/' &&
      !parsedEndpoint.username &&
      !parsedEndpoint.password &&
      !parsedEndpoint.search &&
      !parsedEndpoint.hash
    );
  } catch {
    return false;
  }
};

/**
 * Verify the hosted MaaS models before provisioning AutoRAG resources.
 * Response details and credentials are intentionally never logged or included in failures.
 */
export const checkAutoragMaaSReadiness = (
  testData: Pick<AutoragTestData, 'awsBucket' | 's3SecretName'>,
): Cypress.Chainable<AutoragMaaSFixture> => {
  const fixture = resolveAutoragMaaSFixture();
  const hasValidS3Configuration = isValidAutoragS3Configuration(testData);
  if (fixture.mode === 'simulator') {
    return cy.wrap<AutoragMaaSFixture>(fixture);
  }

  // Completion/results require both live MaaS models and a complete, usable AutoX S3 setup.
  // Keep this boolean-only check free of endpoint, access-key, and secret logging.
  const supportsCompletionResults = hasValidS3Configuration;

  const serviceRoot = getMaaSServiceRoot(fixture.maasUrl);

  return cy
    .request({
      method: 'GET',
      url: `${serviceRoot}/v1/models`,
      headers: { Authorization: `Bearer ${fixture.apiKey}` },
      failOnStatusCode: false,
      log: false,
    })
    .then((response): AutoragMaaSFixture => {
      if (response.status !== 200) {
        throw new Error(`MaaS readiness check returned HTTP ${response.status}.`);
      }

      const payload: unknown = response.body;
      if (typeof payload !== 'object' || payload === null || !('data' in payload)) {
        throw new Error('MaaS readiness check returned invalid model data.');
      }

      const models = Array.isArray(payload.data) ? payload.data.filter(isMaaSModel) : [];
      for (const modelId of [fixture.generationModelId, fixture.embeddingModelId]) {
        const model = models.find((candidate) => candidate.id === modelId);
        if (!model || model.ready !== true) {
          throw new Error('A configured MaaS model is missing or not ready.');
        }
      }
      return { ...fixture, supportsCompletionResults };
    });
};

const interceptSimulatorMaaSModels = (
  projectName: string,
  testData: AutoragTestData,
  maasFixture: AutoragMaaSFixture,
): void => {
  if (maasFixture.mode !== 'simulator') {
    return;
  }

  cy.intercept(
    {
      method: 'GET',
      pathname: '/autorag/api/v1/maas/models',
      query: { namespace: projectName, secretName: testData.maasSecretName },
    },
    {
      statusCode: 200,
      body: {
        data: {
          models: [
            { id: maasFixture.generationModelId, ready: true },
            { id: maasFixture.embeddingModelId, ready: true },
          ],
        },
      },
    },
  );
};

const createMaaSConnection = (testData: AutoragTestData, maasFixture: AutoragMaaSFixture): void => {
  autoragConfigurePage.findAddMaasConnectionButton().click();
  autoragConfigurePage.findMaasConnectionNameInput().clear().type(testData.maasSecretName);
  autoragConfigurePage.findMaasConnectionBaseUrlInput().type(maasFixture.maasUrl);
  autoragConfigurePage.findMaasConnectionApiKeyInput().type(maasFixture.apiKey, { log: false });
  autoragConfigurePage.findMaasConnectionSubmitButton().click();
};

const createVectorDbConnection = (
  testData: AutoragTestData,
  projectName: string,
): Cypress.Chainable<void> => {
  autoragConfigurePage.findAddDatabaseDropdownToggle().click();
  autoragConfigurePage.findAddPgvectorConnectionOption().click();
  const connection = getVectorDatabaseConnection(projectName);
  autoragConfigurePage.findPgvectorConnectionNameInput().clear().type(testData.vectorDbSecretName);
  autoragConfigurePage.findPgvectorInput('host').type(connection.host);
  autoragConfigurePage.findPgvectorInput('port').type(connection.port);
  autoragConfigurePage.findPgvectorInput('db').type(connection.db);
  autoragConfigurePage.findPgvectorInput('user').type(connection.user);
  autoragConfigurePage.findPgvectorInput('password').type(connection.password, { log: false });
  autoragConfigurePage.findPgvectorConnectionSubmitButton().click();
  return verifyAutoragVectorDatabaseConnectionSecret(
    testData.vectorDbSecretName,
    projectName,
    connection,
  );
};

/**
 * Full configure flow for an AutoRAG run.
 *
 * Handles: login, wait for DSPA, navigate to experiments, create run,
 * fill name/description, select MaaS secret, select S3 connection,
 * upload document, browse and select it, upload evaluation dataset,
 * and select the database connection.
 *
 * After this, optionally configure metric/patterns, then call `submitAutoragRun()`.
 */
export const configureAutoragRun = (
  testData: AutoragTestData,
  projectName: string,
  uuid: string,
  maasFixture: AutoragMaaSFixture,
  options: {
    createConnections?: boolean;
    connectionOwnership?: AutoragConnectionOwnership;
  } = {},
): void => {
  const { connectionOwnership } = options;
  cy.step('Login and wait for pipeline server');
  interceptSimulatorMaaSModels(projectName, testData, maasFixture);
  cy.visitWithLogin(autoragExperimentsPage.pathWithDevFlags(), HTPASSWD_CLUSTER_ADMIN_USER);
  waitForAutoXDspaReady(projectName);
  waitForAutoragManagedPipelines(projectName);

  cy.step('Navigate to AutoRAG experiments page');
  autoragExperimentsPage.visit(projectName);

  cy.step('Wait for pipeline server to be fully ready and click Create run');
  autoragExperimentsPage.findAnyCreateRunButton({ timeout: 120000 }).click();

  cy.step('Fill name and description');
  autoragConfigurePage.findNameInput({ timeout: 30000 }).type(testData.runName);
  autoragConfigurePage.findDescriptionInput().type(testData.runDescription);

  if (options.createConnections) {
    resetAutoragConnections(projectName, testData.maasSecretName, testData.vectorDbSecretName);
    cy.step('Create MaaS connection through the dashboard');
    createMaaSConnection(testData, maasFixture);
    if (connectionOwnership) {
      connectionOwnership.maasSecretCreated = true;
    }
  }

  cy.step('Select MaaS secret');
  // SecretSelector renders a skeleton until type=maas secrets load.
  autoragConfigurePage.findMaasSecretSelector({ timeout: 60000 }).should('not.be.disabled');
  if (options.createConnections) {
    autoragConfigurePage
      .findMaasSecretSelector()
      .find('input')
      .should('have.value', testData.maasSecretName);
  } else {
    autoragConfigurePage.findMaasSecretSelector().click();
    autoragConfigurePage
      .findMaasSecretSelector()
      .find('input')
      .clear()
      .type(testData.maasSecretName);
    autoragConfigurePage.findSelectOption(testData.maasSecretName).click();
  }
  cy.step('Click Next to go to Configure step');
  autoragConfigurePage.findNextButton().click();

  cy.step('Verify configure step subtitle shows the run name');
  autoragConfigurePage.findConfigureStepSubtitle().should('contain.text', testData.runName);

  cy.step('Select S3 connection');
  autoragConfigurePage.findSecretSelector().click();
  autoragConfigurePage.findSecretSelector().type(testData.s3SecretName);
  autoragConfigurePage.findSelectOption(testData.s3SecretName).click();

  cy.step('Upload document file');
  const uploadFileName = `${testData.documentFile.replace('.txt', '')}-${uuid}.txt`;
  autoragConfigurePage.findUploadFileToggle().click();
  autoragConfigurePage
    .findUploadFileInput()
    .selectFile(
      { contents: `${RESOURCES_PATH}/${testData.documentFile}`, fileName: uploadFileName },
      { force: true },
    );

  cy.step('Wait for upload to complete');
  autoragConfigurePage.findUploadSpinner().should('not.exist');
  autoragConfigurePage.findUploadedFileCell().should('be.visible');

  cy.step('Verify uploaded file is browsable in file explorer and select it');
  autoragConfigurePage.findSelectFileToggle().click();
  autoragConfigurePage.findBrowseBucketButton().click();
  autoragConfigurePage.findFileExplorerTable().should('be.visible');
  autoragConfigurePage.findFileExplorerSearch().type(uploadFileName);
  autoragConfigurePage.findFileExplorerTable().contains('td', uploadFileName).should('be.visible');
  autoragConfigurePage.findFileExplorerTable().contains('td', uploadFileName).click();
  autoragConfigurePage.findFileExplorerSelectBtn().click();

  cy.step('Create evaluation file via creator modal');
  autoragConfigurePage.findEvaluationCreateButton().should('exist').click();
  autoragConfigurePage.findEvaluationCreatorModal().should('be.visible');
  autoragConfigurePage.findEvalQuestion().type('What information does this document contain?');
  autoragConfigurePage.findEvalAnswer().type('It contains test data for AutoRAG evaluation.');
  autoragConfigurePage.findEvalAddRow().should('be.enabled');
  autoragConfigurePage.findEvalAddRow().click();
  autoragConfigurePage
    .findEvalEntriesTable()
    .contains('What information does this document contain?')
    .should('be.visible');
  autoragConfigurePage.findEvalSubmit().should('be.enabled');
  autoragConfigurePage.findEvalSubmit().click();
  autoragConfigurePage.findEvaluationCreatorModal().should('not.exist');

  cy.step('Verify created evaluation file appears in the selector');
  autoragConfigurePage.findEvaluationFileValue().invoke('val').should('not.be.empty');

  cy.step('Clear creator-uploaded evaluation file to test dropzone upload path');
  autoragConfigurePage.findEvaluationFileClearButton().click();
  autoragConfigurePage.findEvaluationFileValue().should('have.value', '');

  cy.step('Upload evaluation dataset JSON');
  const evalFileName = `${testData.evaluationFile.replace('.json', '')}-${uuid}.json`;
  cy.readFile(`${RESOURCES_PATH}/${testData.evaluationFile}`, null).then((evaluationData) => {
    const renderedEvaluationData = renderAutoragEvaluationData(
      evaluationData.toString('utf8'),
      testData.documentFile,
      uploadFileName,
    );

    autoragConfigurePage
      .findEvaluationFileInput()
      .selectFile(
        { contents: Cypress.Buffer.from(renderedEvaluationData, 'utf8'), fileName: evalFileName },
        { force: true },
      );
  });

  cy.step('Wait for evaluation file upload to complete');
  autoragConfigurePage.findEvaluationFileValue().invoke('val').should('not.be.empty');

  cy.step('Select database connection');
  if (options.createConnections) {
    cy.step('Create PGVector connection through the dashboard');
    createVectorDbConnection(testData, projectName);
    if (connectionOwnership) {
      connectionOwnership.vectorDbSecretCreated = true;
    }
  }
  autoragConfigurePage.findDatabaseSelector({ timeout: 60000 }).should('not.be.disabled');
  if (options.createConnections) {
    autoragConfigurePage
      .findDatabaseSelector()
      .find('input')
      .should('have.value', testData.vectorDbSecretName);
  } else {
    autoragConfigurePage.findDatabaseSelector().click();
    autoragConfigurePage
      .findDatabaseSelector()
      .find('input')
      .clear()
      .type(testData.vectorDbSecretName);
    autoragConfigurePage.findDatabaseOption(testData.vectorDbSecretName).click();
  }
  cy.step('Select the configured hosted generation and embedding models');
  autoragConfigurePage.findSelectModelsButton().click();
  autoragConfigurePage.findExperimentSettingsModal().should('be.visible');
  autoragConfigurePage.findFoundationModelsTab().click();
  const selectModel = (
    modelType: 'llm' | 'embedding',
    modelId: string,
  ): Cypress.Chainable<JQuery<HTMLElement>> =>
    autoragConfigurePage.findModelRowOnCurrentPage(modelType, modelId).then(($row) => {
      if ($row.length > 0) {
        return autoragConfigurePage
          .findModelCheckboxOnCurrentPage(modelType, modelId)
          .should('not.be.disabled')
          .check();
      }

      return autoragConfigurePage.findNextModelPageButton(modelType).then(($nextButton) => {
        if ($nextButton.is(':disabled')) {
          throw new Error(`Configured MaaS model ${modelId} was not found.`);
        }
        cy.wrap($nextButton).click();
        return selectModel(modelType, modelId);
      });
    });

  selectModel('llm', maasFixture.generationModelId).then(() => {
    autoragConfigurePage.findEmbeddingModelsTab().click();
    return selectModel('embedding', maasFixture.embeddingModelId);
  });
  autoragConfigurePage.findExperimentSettingsSaveButton().click();
};

/**
 * Submit the AutoRAG run and verify redirect to results page.
 * Call after `configureAutoragRun()` and any custom configuration.
 */
export const submitAutoragRun = (
  testData: AutoragTestData,
  projectName: string,
  inputDataKey: string,
  maasFixture: AutoragMaaSFixture,
): Cypress.Chainable<string> => {
  cy.intercept('POST', '**/autorag/api/v1/pipeline-runs*').as('autoragCreateRun');
  cy.step('Submit the form');

  autoragConfigurePage.findCreateRunButton({ timeout: 120000 }).should('be.enabled').click();

  return cy
    .wait('@autoragCreateRun')
    .then(({ request, response }) => {
      const body = request.body as Record<string, unknown>;
      expect(body.input_data_keys).to.deep.equal([inputDataKey]);
      expect(body.maas_secret_name).to.equal(testData.maasSecretName);
      expect(body.db_secret_name).to.equal(testData.vectorDbSecretName);
      expect(body.generation_models).to.deep.equal([maasFixture.generationModelId]);
      expect(body.embedding_models).to.deep.equal([maasFixture.embeddingModelId]);
      expect(body.optimization_metric).to.equal(
        testData.optimizationMetric ?? 'custom:overall_score',
      );
      expect(body.preset).to.equal('speed');
      expect(body.optimization_max_rag_patterns).to.equal(testData.maxRagPatterns);

      const runId = response?.body?.data?.run_id;
      if (typeof runId !== 'string' || !runId) {
        throw new Error('AutoRAG create response did not include the submitted run ID.');
      }
      return runId;
    })
    .then((runId) => {
      cy.step('Verify redirect to results page');
      return cy
        .location('pathname')
        .should(
          'eq',
          `/gen-ai-studio/autorag/results/${encodeURIComponent(projectName)}/${encodeURIComponent(
            runId,
          )}`,
        )
        .then(() => {
          cy.step('Verify the run is in progress');
          return autoragResultsPage
            .findRunInProgressMessage()
            .should('be.visible')
            .then(() => runId);
        });
    });
};

export const getAutoragInputDataKey = (testData: AutoragTestData, uuid: string): string =>
  `${testData.documentFile.replace('.txt', '')}-${uuid}.txt`;

export const verifyAutoragRunTerminated = (projectName: string, runId: string): void => {
  cy.location('pathname').should(
    'eq',
    `/gen-ai-studio/autorag/results/${encodeURIComponent(projectName)}/${encodeURIComponent(
      runId,
    )}`,
  );

  // The timeout must be on `.invoke` for the `.should` to get the full cancellation timeout.
  // Putting it on `.findRunStatusLabel` will only give the initial label lookup the timeout
  // and not the retry period needed to reach the final terminal state. After the terminate request
  // is successfully acknowledged, the pipeline can report Failed instead of CANCELED/CANCELLED.
  // The caller must confirm that request before using this helper.
  autoragResultsPage
    .findRunStatusLabel()
    .invoke({ timeout: AUTORAG_CANCELLATION_TIMEOUT_MS }, 'text')
    .should('match', /CANCELED|CANCELLED|FAILED/i);
};

export const verifyAutoragRunListed = (projectName: string, runName: string): void => {
  cy.step('Verify the submitted run appears in the experiments list');
  autoragExperimentsPage.visit(projectName);
  autoragResultsPage.findRunsTable().should('be.visible');
  autoragResultsPage.findRunsTable().contains(runName).should('be.visible');
};

/**
 * Waits up to `timeoutMs` (default 60 min, configurable with AUTORAG_COMPLETION_TIMEOUT_MS)
 * for the run to complete.
 * Asserts that the leaderboard table appears.
 */
export const waitForAutoragRunCompletion = (timeoutMs = AUTORAG_COMPLETION_TIMEOUT_MS): void => {
  cy.step('Wait for run in-progress indicator to appear');
  autoragResultsPage.findRunInProgressMessage(60000).should('exist');

  cy.step('Wait for run to complete');
  autoragResultsPage.findRunInProgressMessage(timeoutMs).should('not.exist');
  autoragResultsPage
    .findRunStatusLabel()
    .invoke('text')
    .should('not.match', /CANCEL|FAIL/i);
  autoragResultsPage.findLeaderboardTable().should('be.visible');
  autoragResultsPage.findTopRankLabel().should('exist');
};

/**
 * Full post-run results verification: leaderboard, drawer, manage columns,
 * pattern details modal with all tabs, CI scores chart, notebook download.
 */
export const verifyAutoragResultsInteraction = (): void => {
  cy.step('Verify leaderboard has at least one pattern row');
  autoragResultsPage.findLeaderboardRow(1).should('exist');

  cy.step('Verify any available invalid objective pattern remains visible as unranked');
  autoragResultsPage.findUnrankedLeaderboardRows().then(($rows) => {
    if ($rows.length > 0) {
      autoragResultsPage.findFirstUnrankedLeaderboardRow().should('be.visible');
      autoragResultsPage.findFirstUnrankedLeaderboardRankCell().should('contain.text', 'Unranked');
    }
  });

  cy.step('Open and close run details drawer');
  autoragResultsPage.findRunDetailsButton().click();
  autoragResultsPage.findRunDetailsDrawerPanel().should('be.visible');
  autoragResultsPage.findRunDetailsDrawerClose().click();
  autoragResultsPage.findRunDetailsDrawerPanel().should('not.exist');

  cy.step('Open manage columns modal and close it');
  autoragResultsPage.findManageColumnsButton().click();
  autoragResultsPage.findManageColumnsModal().should('be.visible');
  autoragResultsPage.findManageColumnsCancelButton().click();
  autoragResultsPage.findManageColumnsModal().should('not.exist');

  cy.step('Open pattern details modal for top-ranked pattern');
  autoragResultsPage.findPatternLink(1).click();
  autoragResultsPage.findPatternDetailsModal().should('be.visible');

  cy.step('Verify Pattern information tab (overview) is active by default');
  autoragResultsPage
    .findPatternDetailsTab('pattern_information')
    .should('have.attr', 'aria-selected', 'true');
  autoragResultsPage
    .findPatternDetailsContent()
    .should('have.attr', 'aria-label', 'Pattern information');

  cy.step('Verify CI scores chart on overview tab');
  autoragResultsPage.findCIScoresChart().should('exist');
  autoragResultsPage.findCIScoresLegend().should('exist');

  const selectPatternDetailsTab = (tabKey: string, tabLabel: string): void => {
    autoragResultsPage.findPatternDetailsTab(tabKey).click();
    autoragResultsPage.findPatternDetailsTab(tabKey).should('have.attr', 'aria-selected', 'true');
    autoragResultsPage.findPatternDetailsContent().should('have.attr', 'aria-label', tabLabel);
  };

  cy.step('Navigate to Vector store settings tab');
  selectPatternDetailsTab('store_binding', 'Store binding');

  cy.step('Navigate to Chunking settings tab');
  selectPatternDetailsTab('chunking', 'Chunking');

  cy.step('Navigate to Embedding settings tab');
  selectPatternDetailsTab('embedding', 'Embedding');

  cy.step('Navigate to Retrieval settings tab');
  selectPatternDetailsTab('retrieval', 'Retrieval');

  cy.step('Navigate to Generation settings tab');
  selectPatternDetailsTab('generation', 'Generation');

  cy.step('Check if Sample Q&A tab exists (conditional on evaluation results)');
  autoragResultsPage.findPatternDetailsTabIfPresent('sample_qa').then(($tab) => {
    if ($tab.length) {
      selectPatternDetailsTab('sample_qa', 'Sample Q&A');
    }
  });

  cy.step('Close pattern details modal');
  autoragResultsPage.findPatternDetailsModalCloseButton().click();
  autoragResultsPage.findPatternDetailsModal().should('not.exist');

  cy.step('Download notebook (stub window.print)');
  autoragResultsPage.findPatternLink(1).click();
  autoragResultsPage.findPatternDetailsModal().should('be.visible');
  cy.window().then((win) => cy.stub(win, 'print'));
  autoragResultsPage.findPatternDetailsDownload().click();
  cy.window().its('print').should('have.been.calledOnce');
  autoragResultsPage.findPatternDetailsModalCloseButton().click();
  autoragResultsPage.findPatternDetailsModal().should('not.exist');
};
