import { LDAP_ADMIN_USER } from './e2eUsers';
import { ensureAdminOcSession } from './oc_commands/baseCommands';
import { deleteOpenShiftProject } from './oc_commands/project';
import {
  cleanupEvalHubMlflowExperiment,
  waitForEvaluationJobComplete,
} from './oc_commands/evalHubInstance';
import { doesMlflowExperimentNameExist } from './oc_commands/mlflow';
import { removeEvalHubTenantLabel } from './oc_commands/evalHubModelDeploy';
import { cleanupEvalHubHardwareProfile } from './oc_commands/evalHubHardwareProfile';
import {
  assertEvalHubOfflineDataRequest,
  interceptEvalHubOfflineDataRequest,
} from './oc_commands/evalHubOfflineData';
import { evaluationsPage } from '../pages/evalHub/evaluationsPage';
import { createEvaluationPage } from '../pages/evalHub/createEvaluationPage';
import { evaluationResultsPage } from '../pages/evalHub/evaluationResultsPage';

// EvalHub API cleanup helpers
const EVAL_HUB_API_MAX_ATTEMPTS = 6;
const EVAL_HUB_API_RETRY_INTERVAL_MS = 5000;
const EVAL_HUB_TRANSIENT_STATUSES = new Set([502, 503, 504]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasEvalHubListPayload = (body: unknown): boolean => {
  if (!isRecord(body)) {
    return false;
  }

  const { data } = body;
  return Array.isArray(data) || (isRecord(data) && Array.isArray(data.items));
};

type EvalHubApiRequest = {
  method: 'GET' | 'DELETE';
  url: string;
  qs?: Record<string, string | number>;
};

const requestEvalHubApi = (
  request: EvalHubApiRequest,
  operation: string,
  attempt = 1,
): Cypress.Chainable<Cypress.Response<unknown>> =>
  cy
    .request({
      ...request,
      failOnStatusCode: false,
      retryOnNetworkFailure: true,
      log: false,
    })
    .then((response) => {
      if (EVAL_HUB_TRANSIENT_STATUSES.has(response.status) && attempt < EVAL_HUB_API_MAX_ATTEMPTS) {
        cy.log(
          `${operation} returned HTTP ${response.status}; retrying ` +
            `(${attempt}/${EVAL_HUB_API_MAX_ATTEMPTS})`,
        );
        // eslint-disable-next-line cypress/no-unnecessary-waiting -- bounded API readiness backoff
        return cy
          .wait(EVAL_HUB_API_RETRY_INTERVAL_MS)
          .then(() => requestEvalHubApi(request, operation, attempt + 1));
      }

      return cy.wrap(response as Cypress.Response<unknown>);
    });

const extractJobIds = (body: unknown): string[] => {
  if (!isRecord(body)) {
    return [];
  }

  const { data } = body;
  const items = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.items)
    ? data.items
    : [];

  return items.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const { resource } = item;
    const id = isRecord(resource) ? resource.id : undefined;
    return typeof id === 'string' ? [id] : [];
  });
};

type EvalHubCollectionRecord = {
  id: string;
  name: string;
};

const extractCollectionRecords = (body: unknown): EvalHubCollectionRecord[] => {
  if (!isRecord(body)) {
    return [];
  }

  const { data } = body;
  const items = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.items)
    ? data.items
    : [];

  return items.flatMap((item) => {
    if (!isRecord(item) || typeof item.name !== 'string' || !isRecord(item.resource)) {
      return [];
    }

    const { id } = item.resource;
    return typeof id === 'string' ? [{ id, name: item.name }] : [];
  });
};

const extractCollectionTotalCount = (body: unknown): number | undefined => {
  if (!isRecord(body) || !isRecord(body.data)) {
    return undefined;
  }

  const { total_count: totalCount } = body.data;
  return typeof totalCount === 'number' ? totalCount : undefined;
};

const listEvalHubTenantCollections = (
  namespace: string,
  offset = 0,
  collectedCollections: EvalHubCollectionRecord[] = [],
): Cypress.Chainable<EvalHubCollectionRecord[]> =>
  requestEvalHubApi(
    {
      method: 'GET',
      url: '/eval-hub/api/v1/evaluations/collections',
      qs: { namespace, scope: 'tenant', limit: 100, offset },
    },
    'List EvalHub tenant collections',
  ).then((response) => {
    if (response.status !== 200) {
      throw new Error(`Failed to list EvalHub tenant collections: HTTP ${response.status}`);
    }
    if (!hasEvalHubListPayload(response.body)) {
      throw new Error('Failed to list EvalHub tenant collections: unexpected response payload');
    }

    const pageCollections = extractCollectionRecords(response.body);
    const allCollections = [...collectedCollections, ...pageCollections];
    const totalCount = extractCollectionTotalCount(response.body);
    const hasMorePages =
      pageCollections.length === 100 &&
      (totalCount === undefined || allCollections.length < totalCount);

    return hasMorePages
      ? listEvalHubTenantCollections(namespace, offset + 100, allCollections)
      : cy.wrap(allCollections);
  });

/** Finds a tenant collection by its exact name for cleanup tracking. */
export const findEvalHubCollectionIdByName = (
  namespace: string,
  collectionName: string,
  attempt = 1,
): Cypress.Chainable<string> =>
  listEvalHubTenantCollections(namespace).then((collections) => {
    const collection = collections.find(({ name }) => name === collectionName);
    if (collection) {
      return cy.wrap(collection.id);
    }
    if (attempt < EVAL_HUB_API_MAX_ATTEMPTS) {
      cy.log(
        `EvalHub tenant collection "${collectionName}" is not visible yet; retrying ` +
          `(${attempt}/${EVAL_HUB_API_MAX_ATTEMPTS})`,
      );
      // eslint-disable-next-line cypress/no-unnecessary-waiting -- bounded collection propagation backoff
      return cy
        .wait(EVAL_HUB_API_RETRY_INTERVAL_MS)
        .then(() => findEvalHubCollectionIdByName(namespace, collectionName, attempt + 1));
    }
    throw new Error(`Unable to find EvalHub tenant collection "${collectionName}".`);
  });

const listEvalHubJobIds = (
  namespace: string,
  offset = 0,
  collectedIds: string[] = [],
): Cypress.Chainable<string[]> =>
  requestEvalHubApi(
    {
      method: 'GET',
      url: '/eval-hub/api/v1/evaluations/jobs',
      qs: { namespace, limit: 100, offset },
    },
    'List EvalHub evaluation jobs',
  ).then((response) => {
    if (response.status !== 200) {
      throw new Error(`Failed to list EvalHub evaluation jobs: HTTP ${response.status}`);
    }
    if (!hasEvalHubListPayload(response.body)) {
      throw new Error('Failed to list EvalHub evaluation jobs: unexpected response payload');
    }

    const pageIds = extractJobIds(response.body);
    const allIds = [...collectedIds, ...pageIds];
    return pageIds.length === 100
      ? listEvalHubJobIds(namespace, offset + 100, allIds)
      : cy.wrap(allIds);
  });

const deleteEvalHubEvaluationJob = (namespace: string, jobId: string): Cypress.Chainable<void> =>
  requestEvalHubApi(
    {
      method: 'DELETE',
      url: `/eval-hub/api/v1/evaluations/jobs/${encodeURIComponent(jobId)}`,
      // eslint-disable-next-line camelcase
      qs: { namespace, hard_delete: 'true' },
    },
    `Delete EvalHub evaluation job ${jobId}`,
  )
    .then((response) => {
      if (![200, 204, 404].includes(response.status)) {
        throw new Error(
          `Failed to delete EvalHub evaluation job ${jobId}: HTTP ${response.status}`,
        );
      }
    })
    .then(() => cy.wrap(undefined as void));

/** Permanently deletes all evaluation jobs for a tenant used by an E2E test. */
export const deleteEvalHubEvaluationJobs = (namespace: string): Cypress.Chainable<void> =>
  listEvalHubJobIds(namespace).then((jobIds) =>
    jobIds.reduce<Cypress.Chainable<void>>(
      (chain, jobId) => chain.then(() => deleteEvalHubEvaluationJob(namespace, jobId)),
      cy.wrap(undefined as void),
    ),
  );

/** Deletes a tenant-scoped EvalHub collection created by an E2E test. */
export const deleteEvalHubCollection = (
  namespace: string,
  collectionId: string,
): Cypress.Chainable<Cypress.Response<unknown>> =>
  requestEvalHubApi(
    {
      method: 'DELETE',
      url: `/eval-hub/api/v1/evaluations/collections/${encodeURIComponent(collectionId)}`,
      qs: { namespace },
    },
    `Delete EvalHub collection ${collectionId}`,
  ).then((response) => {
    if (![204, 404].includes(response.status)) {
      throw new Error(
        `Failed to delete EvalHub collection ${collectionId}: HTTP ${response.status}`,
      );
    }
    return response;
  });

/** Deletes every tenant collection in an isolated E2E namespace. */
const deleteEvalHubCollectionAndReturnVoid = (
  namespace: string,
  collectionId: string,
): Cypress.Chainable<void> =>
  deleteEvalHubCollection(namespace, collectionId).then(() => cy.wrap(undefined as void));

export const deleteEvalHubTenantCollections = (namespace: string): Cypress.Chainable<void> =>
  listEvalHubTenantCollections(namespace).then((collections) =>
    collections.reduce<Cypress.Chainable<void>>(
      (chain, { id }) => chain.then(() => deleteEvalHubCollectionAndReturnVoid(namespace, id)),
      cy.wrap(undefined as void),
    ),
  );

export type SingleBenchmarkEvaluationOptions = {
  benchmarkCardTitle: string;
  evaluationRunName: string;
  inferenceServiceName: string;
  mlflowExperimentName: string;
  additionalBenchmarkParams?: string;
};

export type BenchmarkSuiteEvaluationOptions = {
  suiteName: string;
  evaluationRunName: string;
  inferenceServiceName: string;
  mlflowExperimentName: string;
};

export type BenchmarkSuiteCreationOptions = {
  suiteName: string;
  benchmarkProviderId: string;
  benchmarks: {
    id: string;
    name: string;
    numExamples?: number;
  }[];
  additionalBenchmarkParams?: string;
  runAfterSave?: boolean;
};

/**
 * Finds a suffix that is available for every experiment name used by the
 * benchmark-suite spec, including soft-deleted MLflow experiments.
 */
export const findAvailableBenchmarkSuiteExperimentSuffix = (
  workspace: string,
  baseName: string,
  startSuffix: string,
  experimentSuffixes: string[],
  attempt = 0,
): Cypress.Chainable<string> => {
  if (attempt >= 20) {
    throw new Error(
      `Could not find an available benchmark-suite experiment suffix after ${attempt} attempts ` +
        `(last tried: ${startSuffix})`,
    );
  }

  const candidateNames = experimentSuffixes.map(
    (experimentSuffix) => `${baseName}-${startSuffix}-${experimentSuffix}`,
  );
  const results: boolean[] = [];

  return candidateNames
    .reduce<Cypress.Chainable<boolean>>(
      (chain, experimentName) =>
        chain.then(() =>
          doesMlflowExperimentNameExist(workspace, experimentName).then((exists) => {
            results.push(exists);
            return exists;
          }),
        ),
      cy.wrap(false),
    )
    .then(() => {
      if (!results.some(Boolean)) {
        return cy.wrap(startSuffix);
      }

      const taken = candidateNames.filter((_, index) => results[index]);
      cy.log(`Suffix ${startSuffix} collides on: ${taken.join(', ')}. Trying next suffix.`);
      const next = String(Number(startSuffix) + 1).padStart(startSuffix.length, '0');
      return findAvailableBenchmarkSuiteExperimentSuffix(
        workspace,
        baseName,
        next,
        experimentSuffixes,
        attempt + 1,
      );
    });
};

// Shared form helpers
const selectNewMlflowExperiment = (mlflowExperimentName: string, modalId?: string): void => {
  cy.step(`Create MLflow experiment: ${mlflowExperimentName}`);
  createEvaluationPage.findExperimentModeNew(modalId).click().should('be.checked');
  createEvaluationPage
    .findNewExperimentNameInput(modalId)
    .should('be.visible')
    .clear()
    .type(mlflowExperimentName);
};

// Navigation and test setup
export const navigateToEvaluationsPage = (evaluationTenantProject: string): void => {
  cy.step('Log into the application and open Evaluations page');
  cy.visitWithLogin(
    evaluationsPage.pathWithLmEvalDevFlags(evaluationTenantProject),
    LDAP_ADMIN_USER,
  );
  cy.url().should('include', `/evaluation/${evaluationTenantProject}`);
  evaluationsPage
    .findPageTitle({ timeout: 30000 })
    .should('be.visible')
    .and('contain.text', 'Evaluations');
  evaluationsPage.findEvaluateTabContent({ timeout: 30000 }).should('be.visible');
};

/** Removes stale EvalHub runs left by an earlier attempt using the same E2E tenant. */
export const clearEvalHubEvaluationJobs = (evaluationTenantProject: string): void => {
  cy.step(`[Setup] Remove stale EvalHub evaluation runs from ${evaluationTenantProject}`);
  deleteEvalHubEvaluationJobs(evaluationTenantProject);
};

// Single-benchmark flow
export const submitSingleBenchmarkEvaluation = (opts: SingleBenchmarkEvaluationOptions): void => {
  const {
    benchmarkCardTitle,
    evaluationRunName,
    inferenceServiceName,
    mlflowExperimentName,
    additionalBenchmarkParams,
  } = opts;

  cy.step('Open the benchmark gallery from the Evaluate tab');
  const navigationTimeout = { timeout: 120000 };
  evaluationsPage
    .findBrowseAllBenchmarksExplore(navigationTimeout)
    .should('be.visible')
    .and('have.attr', 'href');
  // Re-query immediately before clicking because the Evaluate tab can re-render while its
  // curated collection data finishes loading, detaching the original button subject.
  evaluationsPage.findBrowseAllBenchmarksExplore(navigationTimeout).click();
  cy.location('pathname', navigationTimeout).should('match', /\/create\/benchmarks$/);
  createEvaluationPage.findBenchmarksGallery(navigationTimeout).should('be.visible');

  cy.step(`Select benchmark: ${benchmarkCardTitle}`);
  createEvaluationPage
    .findBenchmarkCardByTitle(benchmarkCardTitle)
    .scrollIntoView()
    .within(() => {
      createEvaluationPage.findSelectBenchmarkButton().click();
    });
  createEvaluationPage.findStartEvaluationForm({ timeout: 120000 }).should('exist');

  selectNewMlflowExperiment(mlflowExperimentName);

  cy.step('Enter evaluation name');
  createEvaluationPage.findBenchmarkNameDisplay().should('contain.text', benchmarkCardTitle);
  createEvaluationPage.findEvaluationNameInput().clear().type(evaluationRunName);

  cy.step('Select deployed model from cluster picker');
  createEvaluationPage.findModelPickerToggle().click();
  createEvaluationPage.findModelOption(inferenceServiceName).click();

  if (additionalBenchmarkParams?.trim()) {
    cy.step('Add benchmark parameters');
    createEvaluationPage.findBenchmarkParametersCheckbox().check({ force: true });
    createEvaluationPage
      .findAdditionalBenchmarkParamsTextarea()
      .should('be.visible')
      .clear()
      .type(additionalBenchmarkParams.trim(), { parseSpecialCharSequences: false });
  }

  cy.step('Submit evaluation and confirm it appears in the list');
  const usesOfflineData = interceptEvalHubOfflineDataRequest();
  createEvaluationPage.findStartEvaluationSubmitButton().should('be.enabled').click();
  if (usesOfflineData) {
    assertEvalHubOfflineDataRequest();
  }
  cy.url({ timeout: 120000 }).should('not.include', '/create');
  evaluationsPage.findRunsTabContent({ timeout: 120000 }).should('be.visible');
  evaluationsPage
    .findEvaluationStatusButtonInRow(evaluationRunName, { timeout: 120000 })
    .should('be.visible');
};

// Benchmark-suite flow
export const createBenchmarkSuite = (opts: BenchmarkSuiteCreationOptions): void => {
  const {
    suiteName,
    benchmarkProviderId,
    benchmarks,
    additionalBenchmarkParams,
    runAfterSave = false,
  } = opts;

  cy.step(`Create benchmark suite: ${suiteName}`);
  const navigationTimeout = { timeout: 120000 };
  evaluationsPage
    .findCreateSuiteButton(navigationTimeout)
    .should('be.visible')
    .and('have.attr', 'href');
  // Re-query before clicking because the gallery can replace the card while its data finishes loading.
  evaluationsPage.findCreateSuiteButton(navigationTimeout).click();
  cy.location('pathname', navigationTimeout).should('match', /\/create\/collections\/new$/);

  createEvaluationPage.findSuiteNameInput().clear().type(suiteName);
  createEvaluationPage.findSuiteDescriptionInput().type('Created by the EvalHub Cypress E2E flow.');
  createEvaluationPage.findSuiteEvaluatesToggle().click();
  createEvaluationPage.findSuiteEvaluatesOption('model').click();
  createEvaluationPage.findCopySuiteNextButton().click();

  benchmarks.forEach(({ id, name }) => {
    cy.step(`Add benchmark to suite: ${name} (${id})`);
    createEvaluationPage.findBenchmarkCatalogSearch().should('be.visible').clear().type(id);
    createEvaluationPage
      .findBenchmarkCatalogCheckboxById(id, benchmarkProviderId)
      .should('be.visible')
      .check();
  });
  createEvaluationPage.findCopySuiteNextSelectBenchmarksButton().click();
  createEvaluationPage.findCopySuiteStepBenchmarks({ timeout: 120000 }).should('be.visible');

  benchmarks.forEach(({ name, numExamples }, index) => {
    if (numExamples !== undefined) {
      cy.step(`Set the dedicated Num examples parameter for ${name}`);
      createEvaluationPage
        .findBenchmarkParameterInput(index, 'num_examples')
        .clear()
        .type(String(numExamples));
    }

    if (additionalBenchmarkParams?.trim()) {
      cy.step(`Configure advanced benchmark parameters for ${name}`);
      createEvaluationPage.findBenchmarkAdvancedToggle(index).click();
      createEvaluationPage
        .findBenchmarkAdditionalParameters(index)
        .clear()
        .type(additionalBenchmarkParams.trim(), { parseSpecialCharSequences: false });
    }
  });

  if (runAfterSave) {
    cy.step('Save the suite and open the evaluation run form');
    createEvaluationPage.findCreateSuiteSaveAndRunButton().should('be.enabled').click();
    createEvaluationPage
      .findStartEvaluationRunModal('create-suite-run-evaluation-modal', { timeout: 120000 })
      .should('be.visible');
    return;
  }

  cy.step('Add the suite to my benchmark suites');
  createEvaluationPage.findCopySuiteSaveOnlyButton().should('be.enabled').click();
  cy.location('pathname', { timeout: 120000 }).should('match', /\/evaluation\/[^/]+\/collections$/);
};

type BenchmarkSuiteRunConfigurationOptions = BenchmarkSuiteEvaluationOptions & {
  modalId: string;
};

const configureAndSubmitBenchmarkSuiteEvaluation = ({
  modalId,
  suiteName,
  evaluationRunName,
  inferenceServiceName,
  mlflowExperimentName,
}: BenchmarkSuiteRunConfigurationOptions): void => {
  createEvaluationPage
    .findStartEvaluationRunModal(modalId, { timeout: 120000 })
    .should('be.visible');

  createEvaluationPage.findAdvancedConfigurationToggle(modalId).click();
  selectNewMlflowExperiment(mlflowExperimentName, modalId);

  cy.step('Enter evaluation name');
  createEvaluationPage.findStartEvaluationRunCollectionName().should('contain.text', suiteName);
  createEvaluationPage.findEvaluationNameInput(modalId).clear().type(evaluationRunName);

  cy.step('Select deployed model from cluster picker');
  createEvaluationPage.findModelPickerToggle(modalId).click();
  createEvaluationPage.findModelOption(inferenceServiceName, modalId).should('be.visible').click();
  createEvaluationPage.findModelPickerToggle(modalId).should('contain.text', inferenceServiceName);

  cy.step('Submit evaluation and confirm it appears in the list');
  const usesOfflineData = interceptEvalHubOfflineDataRequest();
  createEvaluationPage.findStartEvaluationSubmitButton(modalId).should('be.enabled').click();
  if (usesOfflineData) {
    assertEvalHubOfflineDataRequest();
  }
  evaluationsPage.findRunsTabContent({ timeout: 120000 }).should('be.visible');
  evaluationsPage.findEvaluationsTable().should('contain', evaluationRunName);
};

export const submitBenchmarkSuiteEvaluation = (opts: BenchmarkSuiteEvaluationOptions): void => {
  const { suiteName } = opts;

  cy.step(`Find the newly created suite on the Evaluate tab: ${suiteName}`);
  const suiteLookupTimeout = { timeout: 120000 };
  evaluationsPage.findBenchmarkSuiteCardByName(suiteName, suiteLookupTimeout).should('be.visible');
  evaluationsPage.findBenchmarkSuitePrimaryActionByName(suiteName, suiteLookupTimeout).click();
  configureAndSubmitBenchmarkSuiteEvaluation({
    ...opts,
    modalId: 'evaluations-page-start-evaluation-run-modal',
  });
};

export const submitCreatedBenchmarkSuiteEvaluation = (
  opts: BenchmarkSuiteEvaluationOptions,
): void => {
  cy.step(`Configure the newly created suite evaluation: ${opts.suiteName}`);
  configureAndSubmitBenchmarkSuiteEvaluation({
    ...opts,
    modalId: 'create-suite-run-evaluation-modal',
  });
};

// Run verification
export const verifyEvaluationProgressModal = (evaluationRunName: string): void => {
  cy.step('Open status modal and verify progress tab is visible');
  const statusTimeout = { timeout: 120000 };
  evaluationsPage.findRunsTabContent(statusTimeout).should('be.visible');
  evaluationsPage.findEvaluationStatusButtonInRow(evaluationRunName, statusTimeout).click();
  evaluationsPage.findStatusModal(statusTimeout).should('be.visible');
  evaluationsPage.findStatusModalProgressContent(statusTimeout).should('be.visible');

  cy.step('Switch to events log tab and verify it activates without error');
  evaluationsPage.findStatusModalEventsLogTab(statusTimeout).click();
  evaluationsPage
    .findStatusModalEventsLogTab(statusTimeout)
    .should('have.attr', 'aria-selected', 'true');
  evaluationsPage.findStatusModalCloseButton(statusTimeout).click();
  evaluationsPage.findStatusModal({ timeout: 30000 }).should('not.exist');
};

export const verifyEvaluationCompletedAndViewResults = (
  evaluationRunName: string,
  evaluationTenantProject: string,
  expectedBenchmarkIds: string[] = [],
): void => {
  cy.step('Re-open status modal after completion — View Results shown, Stop absent');
  cy.reload();
  const statusTimeout = { timeout: 120000 };
  evaluationsPage.findPageTitle({ timeout: 30000 }).should('be.visible');
  evaluationsPage.findRunsTabContent(statusTimeout).should('be.visible');
  evaluationsPage
    .findEvaluationStatusButtonInRow(evaluationRunName, statusTimeout)
    .should('contain.text', 'Complete')
    .click();
  evaluationsPage.findStatusModal(statusTimeout).should('be.visible');
  evaluationsPage.findStatusModalStopButton(statusTimeout).should('not.exist');
  evaluationsPage.findStatusModalViewResultsButton(statusTimeout).should('be.visible').click();

  cy.step('Verify evaluation results page renders with score and metadata');
  evaluationResultsPage.findResultsContent().should('be.visible');
  evaluationResultsPage.findScoreValue().should('be.visible');
  evaluationResultsPage.findMetadata().should('be.visible');
  evaluationResultsPage.findBenchmarkDetailsInfo().should('be.visible');

  if (expectedBenchmarkIds.length > 0) {
    cy.step(`Verify all ${expectedBenchmarkIds.length} benchmark results are displayed`);
    evaluationResultsPage.findBenchmarksGrid().should('be.visible');
    evaluationResultsPage
      .findBenchmarkResultCards()
      .should('have.length', expectedBenchmarkIds.length);
    expectedBenchmarkIds.forEach((benchmarkId) => {
      evaluationResultsPage
        .findBenchmarkResultCardById(benchmarkId)
        .should('have.length', 1)
        .and('be.visible');
    });
  }

  cy.step('Verify About this result popover opens');
  evaluationResultsPage.findFirstAboutResultButton().click();
  evaluationResultsPage.findAboutResultDialog().should('be.visible');
  evaluationResultsPage.findAboutResultCloseButton().click();

  cy.step('Open event log modal and verify it renders');
  evaluationResultsPage.findViewLogButton().click();
  evaluationResultsPage.findEventLogModal().should('be.visible');
  evaluationResultsPage.findLogContent().should('be.visible');
  evaluationResultsPage.findEventLogModalCloseButton().click();

  cy.step('Return to evaluations list and verify Complete status');
  cy.visitWithLogin(
    `${evaluationsPage.pathWithLmEvalDevFlags(evaluationTenantProject)}&tab=runs`,
    LDAP_ADMIN_USER,
  );
  evaluationsPage.findRunsTabContent({ timeout: 30000 }).should('be.visible');
  evaluationsPage
    .findEvaluationStatusButtonInRow(evaluationRunName)
    .should('contain.text', 'Complete');
};

// Stop and reconfigure flow
export const stopAndReconfigureEvaluation = (
  evaluationRunName: string,
  reconfiguredRunName: string,
): void => {
  cy.step('Wait for evaluation to reach Running status');
  const statusTimeout = { timeout: 120000 };
  evaluationsPage.findRunsTabContent(statusTimeout).should('be.visible');
  evaluationsPage
    .findEvaluationStatusButtonInRow(evaluationRunName, statusTimeout)
    .should('contain.text', 'Running');

  cy.step('Open status modal and stop the running evaluation');
  evaluationsPage.findEvaluationStatusButtonInRow(evaluationRunName, statusTimeout).click();
  evaluationsPage.findStatusModal(statusTimeout).should('be.visible');
  evaluationsPage
    .findStatusModalStopButton(statusTimeout)
    .should('be.visible')
    .and('be.enabled')
    .click();

  cy.step('Confirm stop in the stop evaluation modal');
  evaluationsPage.findStopModal(statusTimeout).should('be.visible');
  evaluationsPage.findStopConfirmButton(statusTimeout).click();
  evaluationsPage.findStopModal({ timeout: 30000 }).should('not.exist');

  cy.step('Wait for evaluation to reach Canceled status');
  cy.reload();
  evaluationsPage.findPageTitle({ timeout: 30000 }).should('be.visible');
  evaluationsPage.findRunsTabContent(statusTimeout).should('be.visible');
  evaluationsPage
    .findEvaluationStatusButtonInRow(evaluationRunName, statusTimeout)
    .should('contain.text', 'Canceled');

  cy.step('Open status modal and click Reconfigure');
  evaluationsPage.findEvaluationStatusButtonInRow(evaluationRunName, statusTimeout).click();
  evaluationsPage.findStatusModal(statusTimeout).should('be.visible');
  evaluationsPage.findStatusModalReconfigureButton(statusTimeout).should('be.visible').click();

  cy.step(`Submit the reconfigured evaluation run as "${reconfiguredRunName}"`);
  cy.url().should('include', '/reconfigure');
  createEvaluationPage.findStartEvaluationForm({ timeout: 30000 }).should('exist');
  createEvaluationPage.findEvaluationNameInput().clear().type(reconfiguredRunName);
  createEvaluationPage.findStartEvaluationSubmitButton().should('be.enabled').click();
  assertEvalHubOfflineDataRequest();
  cy.url({ timeout: 120000 }).should('not.include', '/reconfigure');
  evaluationsPage.findRunsTabContent(statusTimeout).should('be.visible');
  evaluationsPage
    .findEvaluationStatusButtonInRow(reconfiguredRunName, statusTimeout)
    .should('be.visible');
};

// End-to-end flow composition
export const runSingleBenchmarkEvaluationFlow = (
  evaluationTenantProject: string,
  opts: SingleBenchmarkEvaluationOptions,
): void => {
  navigateToEvaluationsPage(evaluationTenantProject);
  submitSingleBenchmarkEvaluation(opts);
  verifyEvaluationProgressModal(opts.evaluationRunName);
  waitForEvaluationJobComplete(evaluationTenantProject);
  verifyEvaluationCompletedAndViewResults(opts.evaluationRunName, evaluationTenantProject);
};

// Shared cleanup orchestration
export type EvalHubCleanupStep = {
  description: string;
  run: () => Cypress.Chainable | void;
};

export type EvalHubCleanupOptions = {
  evaluationTenantProject: string;
  mlflowExperimentName: string;
  hardwareProfileName: string;
  collectionId?: string;
  mlflowExperimentNames?: string[];
  collectionIds?: string[];
  deleteAllTenantCollections?: boolean;
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Builds the shared cleanup sequence used by the live EvalHub specs. */
export const createEvalHubCleanupSteps = ({
  evaluationTenantProject,
  mlflowExperimentName,
  hardwareProfileName,
  collectionId,
  mlflowExperimentNames = [],
  collectionIds = [],
  deleteAllTenantCollections = false,
}: EvalHubCleanupOptions): EvalHubCleanupStep[] => {
  const cleanupSteps: EvalHubCleanupStep[] = [];
  const experimentsToDelete = [
    ...new Set(
      mlflowExperimentName
        ? [mlflowExperimentName, ...mlflowExperimentNames]
        : mlflowExperimentNames,
    ),
  ];
  const collectionsToDelete = [
    ...new Set(collectionId ? [collectionId, ...collectionIds] : collectionIds),
  ];

  if (evaluationTenantProject) {
    cleanupSteps.push({
      description: `Delete EvalHub evaluation jobs for ${evaluationTenantProject}`,
      run: () => deleteEvalHubEvaluationJobs(evaluationTenantProject),
    });
  }

  if (evaluationTenantProject) {
    collectionsToDelete.forEach((createdCollectionId) => {
      cleanupSteps.push({
        description: `Delete EvalHub collection ${createdCollectionId}`,
        run: () => deleteEvalHubCollection(evaluationTenantProject, createdCollectionId),
      });
    });

    if (deleteAllTenantCollections) {
      cleanupSteps.push({
        description: `Delete remaining EvalHub tenant collections for ${evaluationTenantProject}`,
        run: () => deleteEvalHubTenantCollections(evaluationTenantProject),
      });
    }

    experimentsToDelete.forEach((experimentName) => {
      cleanupSteps.push({
        description: `Delete MLflow experiment ${experimentName}`,
        run: () => {
          cy.step(`Delete MLflow experiment: ${experimentName}`);
          return cleanupEvalHubMlflowExperiment(evaluationTenantProject, experimentName);
        },
      });
    });
  }

  if (evaluationTenantProject) {
    cleanupSteps.push({
      description: `Remove EvalHub tenant label from ${evaluationTenantProject}`,
      run: () => removeEvalHubTenantLabel(evaluationTenantProject),
    });
    cleanupSteps.push({
      description: `Delete tenant project ${evaluationTenantProject}`,
      run: () => {
        cy.step(`Delete tenant project: ${evaluationTenantProject}`);
        return deleteOpenShiftProject(evaluationTenantProject, {
          wait: true,
          ignoreNotFound: true,
        });
      },
    });
  }

  if (hardwareProfileName) {
    cleanupSteps.push({
      description: `Clean up Hardware Profile ${hardwareProfileName}`,
      run: () => {
        cy.step(`Clean up Hardware Profile: ${hardwareProfileName}`);
        return cleanupEvalHubHardwareProfile(hardwareProfileName);
      },
    });
  }

  return cleanupSteps;
};

/** Runs every cleanup step and reports all failures after the final attempt. */
export const runEvalHubCleanup = (steps: EvalHubCleanupStep[]): void => {
  const failures: string[] = [];
  let activeDescription = '';

  const recordFailure = (description: string, error: unknown): void => {
    failures.push(`${description}: ${getErrorMessage(error)}`);
  };

  const handleCypressFailure = (error: Cypress.CypressError): false | void => {
    if (!activeDescription) {
      throw error;
    }
    recordFailure(activeDescription, error);
    activeDescription = '';
    return false;
  };

  Cypress.on('fail', handleCypressFailure);

  steps.forEach(({ description, run }) => {
    cy.then(() => {
      activeDescription = description;
      try {
        return run();
      } catch (error) {
        recordFailure(description, error);
        activeDescription = '';
        return undefined;
      }
    }).then(() => {
      activeDescription = '';
    });
  });

  cy.then(() => {
    Cypress.off('fail', handleCypressFailure);
    if (failures.length > 0) {
      throw new Error(`EvalHub cleanup failed:\n${failures.join('\n')}`);
    }
  });
};

export const cleanupEvalHubTestResources = (options: EvalHubCleanupOptions): void => {
  ensureAdminOcSession();
  runEvalHubCleanup(createEvalHubCleanupSteps(options));
};
