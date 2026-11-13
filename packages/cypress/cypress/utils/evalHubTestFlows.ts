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
  interceptEvalHubOfflineDataReadForReconfigure,
  interceptEvalHubOfflineDataRequest,
} from './oc_commands/evalHubOfflineData';
import { evaluationsPage } from '../pages/evalHub/evaluationsPage';
import { createEvaluationPage } from '../pages/evalHub/createEvaluationPage';
import { evaluationResultsPage } from '../pages/evalHub/evaluationResultsPage';
import type { EvalHubBenchmarkSuiteTestData } from '../types';

// EvalHub API cleanup helpers
const EVAL_HUB_API_MAX_ATTEMPTS = 6;
const EVAL_HUB_API_RETRY_INTERVAL_MS = 5000;
const EVAL_HUB_TRANSIENT_STATUSES = new Set([502, 503, 504]);

/**
 * Use a fresh suffix for each local EvalHub setup while preserving deterministic CI names.
 * Generating it in the test flow gives repeated Cypress open-mode runs a new experiment name.
 */
export const getEvalHubExperimentSuffix = (defaultSuffix: string): Cypress.Chainable<string> =>
  cy.then(() =>
    Cypress.env('BUILD_NUMBER') || Cypress.env('GITHUB_RUN_ID')
      ? defaultSuffix
      : String(Date.now()),
  );

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const hasEvalHubListPayload = (body: unknown): boolean => {
  if (!isRecord(body)) {
    return false;
  }

  const { data } = body;
  return Array.isArray(data) || (isRecord(data) && Array.isArray(data.items));
};

/** Login pages reference the OAuth flow or Keycloak; other HTML (e.g. proxy error pages) does not. */
const isEvalHubLoginPage = (body: string): boolean =>
  body.includes('/oauth') || body.toLowerCase().includes('keycloak');

/** Distinguishes an HTML login page from other non-JSON payloads in cleanup errors. */
const describeEvalHubPayloadError = (body: unknown): string => {
  // cy.request leaves Content-Type: text/html responses (e.g. OAuth redirects) as raw strings
  // rather than JSON-parsing them, so a leading '<' reliably identifies HTML here.
  if (typeof body === 'string' && body.trimStart().startsWith('<')) {
    return isEvalHubLoginPage(body)
      ? 'received an HTML login page instead of JSON — the dashboard session is not established'
      : 'received an unexpected HTML response instead of JSON';
  }
  return 'unexpected response payload';
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
      throw new Error(
        `Failed to list EvalHub tenant collections: ${describeEvalHubPayloadError(response.body)}`,
      );
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
      throw new Error(
        `Failed to list EvalHub evaluation jobs: ${describeEvalHubPayloadError(response.body)}`,
      );
    }

    const pageIds = extractJobIds(response.body);
    const allIds = [...collectedIds, ...pageIds];
    return pageIds.length === 100
      ? listEvalHubJobIds(namespace, offset + 100, allIds)
      : cy.wrap(allIds);
  });

const findEvalHubJobState = (body: unknown, jobName: string): string | undefined => {
  if (!isRecord(body)) {
    return undefined;
  }
  const { data } = body;
  const items = Array.isArray(data)
    ? data
    : isRecord(data) && Array.isArray(data.items)
    ? data.items
    : [];
  const job = items.find((item) => isRecord(item) && item.name === jobName);
  return isRecord(job) && isRecord(job.status) && typeof job.status.state === 'string'
    ? job.status.state
    : undefined;
};

/** Waits for one named EvalHub run, so earlier Jobs in the same test tenant cannot satisfy the wait. */
export const waitForEvaluationRunComplete = (
  namespace: string,
  runName: string,
  timeoutMs = 900000,
): Cypress.Chainable<void> => {
  const pollIntervalMs = 10000;
  const failedStates = new Set(['failed', 'partially_failed', 'cancelled', 'stopped']);

  const poll = (deadline: number): Cypress.Chainable<void> =>
    requestEvalHubApi(
      {
        method: 'GET',
        url: '/eval-hub/api/v1/evaluations/jobs',
        qs: { namespace, limit: 100, offset: 0, name: runName },
      },
      `Check EvalHub evaluation ${runName}`,
    ).then((response) => {
      if (response.status !== 200 || !hasEvalHubListPayload(response.body)) {
        throw new Error(`Could not read EvalHub evaluation ${runName}: HTTP ${response.status}`);
      }

      const state = findEvalHubJobState(response.body, runName);
      if (state === 'completed') {
        return cy.wrap(undefined as void);
      }
      if (state && failedStates.has(state)) {
        throw new Error(`EvalHub evaluation ${runName} ended with status ${state}.`);
      }
      if (Date.now() >= deadline) {
        throw new Error(`EvalHub evaluation ${runName} did not complete within ${timeoutMs} ms.`);
      }

      // eslint-disable-next-line cypress/no-unnecessary-waiting -- bounded API status polling
      return cy.wait(pollIntervalMs).then(() => poll(deadline));
    });

  // Start the timeout after earlier Cypress commands (including submission) have completed.
  return cy.then(() => poll(Date.now() + timeoutMs));
};

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
  benchmarkProviderId: string;
  benchmarkId: string;
  evaluationRunName: string;
  inferenceServiceName: string;
  mlflowExperimentName: string;
  hardwareProfileName?: string;
  additionalBenchmarkParams?: string;
};

export type BenchmarkSuiteEvaluationOptions = {
  suiteName: string;
  evaluationRunName: string;
  inferenceServiceName: string;
  mlflowExperimentName: string;
  hardwareProfileName?: string;
};

export type BenchmarkSuiteCreationOptions = {
  suiteName: string;
  suiteDomains: string[];
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
 * benchmark collection spec, including soft-deleted MLflow experiments.
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

/** Non-Kueue tenants have no selector; Kueue tenants require an explicit profile. */
const configureEvaluationHardwareProfile = (profileName?: string, modalId?: string): void => {
  if (!profileName) {
    createEvaluationPage.findStartEvaluationSubmitButton(modalId).should('be.enabled');
    createEvaluationPage.findHardwareProfileToggle(modalId).should('not.exist');
    return;
  }

  createEvaluationPage.findStartEvaluationSubmitButton(modalId).should('be.disabled');
  createEvaluationPage
    .findHardwareProfileToggle(modalId)
    .should('be.visible')
    .and('be.enabled')
    .click();
  createEvaluationPage.findHardwareProfileOption(profileName).should('be.visible').click();
  createEvaluationPage.findHardwareProfileToggle(modalId).should('contain.text', profileName);
  createEvaluationPage
    .findHardwareProfileKueueInfo(modalId)
    .should('contain.text', 'Only hardware profiles configured with a local queue are shown');
};

/** Checks that a benchmark's submitted parameters contain all expected keys and values. */
const assertBenchmarkParametersIncluded = (
  actualParameters: Record<string, unknown> | undefined,
  expectedParameters: Record<string, unknown>,
  context: string,
): void => {
  expect(actualParameters, `${context} parameters`).to.deep.include(expectedParameters);
};

/** Confirms hardware selection and optional benchmark overrides in a create-job request body. */
const assertEvaluationJobOptionsForRequest = (
  requestBody: unknown,
  profileName?: string,
  benchmarkParameterOverrides?: Record<string, unknown>,
): void => {
  if (profileName) {
    expect(requestBody).to.have.nested.property(
      'hardware_config.hardware_profile_name',
      profileName,
    );
  } else {
    expect(requestBody).not.to.have.property('hardware_config');
  }

  if (benchmarkParameterOverrides) {
    const jobRequest = requestBody as {
      collection?: {
        benchmarks?: { parameters?: Record<string, unknown> }[];
      };
    };
    const collectionBenchmarks = jobRequest.collection?.benchmarks;
    expect(collectionBenchmarks, 'collection benchmarks in job request').to.have.length.greaterThan(
      0,
    );
    collectionBenchmarks?.forEach(({ parameters }, index) => {
      assertBenchmarkParametersIncluded(
        parameters,
        benchmarkParameterOverrides,
        `collection benchmark ${index + 1}`,
      );
    });
  }
};

/** Waits for and validates the standard create-job spy interception. */
const assertEvaluationJobOptions = (
  profileName?: string,
  benchmarkParameterOverrides?: Record<string, unknown>,
): void => {
  cy.wait('@createEvalHubJob', { timeout: 120000 }).then(({ request }) => {
    assertEvaluationJobOptionsForRequest(request.body, profileName, benchmarkParameterOverrides);
  });
};

/** Applies test-only parameters to each benchmark in a collection's create-job request. */
const overrideCollectionBenchmarkParameters = (
  requestBody: unknown,
  parameterOverrides: Record<string, unknown>,
): Record<string, unknown> => {
  if (!isRecord(requestBody)) {
    throw new Error('Expected a collection in the evaluation job request.');
  }

  const { collection } = requestBody;
  if (!isRecord(collection)) {
    throw new Error('Expected a collection in the evaluation job request.');
  }

  const collectionBenchmarks = collection.benchmarks;
  if (!Array.isArray(collectionBenchmarks) || collectionBenchmarks.length === 0) {
    throw new Error('Expected collection benchmarks in the evaluation job request.');
  }

  const benchmarks = collectionBenchmarks.map((benchmark) => {
    if (!isRecord(benchmark)) {
      throw new Error(
        'Expected each collection benchmark in the evaluation job request to be an object.',
      );
    }

    const parameters = isRecord(benchmark.parameters) ? benchmark.parameters : {};
    return {
      ...benchmark,
      parameters: { ...parameters, ...parameterOverrides },
    };
  });

  return { ...requestBody, collection: { ...collection, benchmarks } };
};

// Navigation and test setup

/**
 * The EvalHub REST cleanup endpoints are served through the dashboard and return the OAuth
 * login page when no browser session exists. Tracks whether setup reached the dashboard so
 * cleanup can skip the API steps instead of failing with an error that hides the real
 * setup failure.
 *
 * Scoped per spec file: Cypress re-evaluates this module for each spec (fresh browser
 * context), so the flag starts as false in every spec without an explicit reset.
 */
let dashboardSessionEstablished = false;

export const navigateToEvaluationsPage = (
  evaluationTenantProject: string,
  initialTab: 'gallery' | 'evaluate' = 'evaluate',
): void => {
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
  if (initialTab === 'evaluate') {
    cy.step('Open the Benchmark collections tab');
    evaluationsPage.findEvaluateTab({ timeout: 30000 }).should('be.visible').click();
    evaluationsPage.findEvaluateTabContent({ timeout: 30000 }).should('be.visible');
  } else {
    cy.step('Stay on the Gallery tab');
    evaluationsPage.findGalleryTab({ timeout: 30000 }).should('have.attr', 'aria-selected', 'true');
    evaluationsPage.findGalleryTabContent({ timeout: 30000 }).should('be.visible');
  }
  cy.then(() => {
    dashboardSessionEstablished = true;
  });
};

// Collection editor flow helpers
/** Names an edited or copied collection and opens its benchmark configuration. */
const advanceCollectionEditorToBenchmarks = (
  collectionName: string,
  navigationTimeout: Partial<Cypress.Timeoutable>,
): void => {
  createEvaluationPage.findSuiteNameInput().should('be.visible').clear().type(collectionName);
  createEvaluationPage.findCopySuiteNextButton().should('be.enabled').click();
  createEvaluationPage.findCopySuiteNextSelectBenchmarksButton().should('be.enabled').click();
  createEvaluationPage.findCopySuiteStepBenchmarks(navigationTimeout).should('be.visible');
};

/** Saves collection changes without starting an evaluation run. */
const saveCollectionWithoutRun = (): void => {
  createEvaluationPage.findCopySuiteSaveOnlyButton().should('be.enabled').click();
};

/** Confirms saved collections appear under Evaluate after returning from the editor. */
const verifySavedCollectionsVisible = (
  evaluationTenantProject: string,
  collectionNames: string[],
  navigationTimeout: Partial<Cypress.Timeoutable>,
): void => {
  cy.location('pathname', navigationTimeout).should(
    'eq',
    `/evaluation/${evaluationTenantProject}/collections`,
  );
  navigateToEvaluationsPage(evaluationTenantProject);
  collectionNames.forEach((collectionName) => {
    evaluationsPage
      .findBenchmarkSuiteCardByName(collectionName, navigationTimeout)
      .should('be.visible');
  });
};

/** Sets and verifies one benchmark's dedicated Num examples field. */
const setBenchmarkNumExamples = (
  index: number,
  numExamples: number,
  stepDescription: string,
): void => {
  cy.step(stepDescription);
  createEvaluationPage
    .findBenchmarkParameterInput(index, 'num_examples')
    .scrollIntoView()
    .should('be.visible')
    .clear()
    .type(String(numExamples))
    .should('have.value', String(numExamples));
};

// Curated collection customization flow
export const customizeCuratedCollection = (
  evaluationTenantProject: string,
  collectionId: string,
  customizedCollectionName: string,
): void => {
  const navigationTimeout = { timeout: 120000 };

  cy.step(`Select curated collection from the Gallery tab: ${collectionId}`);
  evaluationsPage
    .findGalleryTab({ timeout: navigationTimeout.timeout })
    .should('have.attr', 'aria-selected', 'true');
  evaluationsPage
    .findGalleryBenchmarkSuiteName(collectionId, navigationTimeout)
    .should('be.visible')
    .click();
  createEvaluationPage.findCollectionDrawerPanel().should('be.visible');
  createEvaluationPage
    .findCollectionDrawerPrerequisite()
    .should('contain.text', 'multiple tool/function calls');

  cy.step('Customize the curated collection');
  createEvaluationPage.findCustomizeBenchmarkSuiteButton().should('be.visible').click();
  cy.location('pathname', navigationTimeout).should(
    'eq',
    `/evaluation/${evaluationTenantProject}/create/collections/${collectionId}/copy`,
  );
  createEvaluationPage
    .findCopySuitePrerequisiteAlert()
    .should('contain.text', 'multiple tool/function calls');
  cy.step('Name the collection and keep the curated benchmarks selected');
  advanceCollectionEditorToBenchmarks(customizedCollectionName, navigationTimeout);
  createEvaluationPage.findBenchmarkParameterInput(0, 'judge_model').should('not.exist');
  cy.step('Limit each benchmark to five examples');
  createEvaluationPage
    .findBenchmarkSections()
    .its('length')
    .then((benchmarkCount) => {
      Array.from({ length: benchmarkCount }, (_value, index) => index).forEach((index) => {
        createEvaluationPage.findBenchmarkJumpLink(index).should('be.visible').click();
        setBenchmarkNumExamples(index, 5, `Set benchmark ${index + 1} to five examples`);

        cy.step(`Use Chat Completions for benchmark ${index + 1}`);
        const advancedParametersToggle = createEvaluationPage.findBenchmarkAdvancedToggle(index);
        advancedParametersToggle.should('be.visible').then(($toggle) => {
          if ($toggle.attr('aria-expanded') !== 'true') {
            cy.wrap($toggle).click();
          }
        });
        createEvaluationPage
          .findBenchmarkAdditionalParameters(index)
          .scrollIntoView()
          .should('be.visible')
          .invoke('val')
          .then((value) => {
            const rawParameters = String(value ?? '').trim();
            const parameters = rawParameters
              ? (JSON.parse(rawParameters) as Record<string, unknown>)
              : {};
            const modelArgs =
              isRecord(parameters.model_args) && !Array.isArray(parameters.model_args)
                ? parameters.model_args
                : {};
            const updatedParameters = JSON.stringify({
              ...parameters,
              // The vLLM fixture serves Chat Completions, so disable Inspect's Responses API.
              // eslint-disable-next-line camelcase
              model_args: { ...modelArgs, responses_api: false },
            });

            createEvaluationPage
              .findBenchmarkAdditionalParameters(index)
              .clear()
              .type(updatedParameters, { parseSpecialCharSequences: false })
              .should('have.value', updatedParameters);
          });
      });
    });
  // Save the customized collection without launching it; the spec verifies the run separately.
  saveCollectionWithoutRun();
  cy.step('Verify the customized collection is available under Evaluate');
  verifySavedCollectionsVisible(
    evaluationTenantProject,
    [customizedCollectionName],
    navigationTimeout,
  );
};

/** Duplicates a saved tenant collection and verifies the copy is saved to My collections. */
export const duplicateSavedBenchmarkCollection = (
  evaluationTenantProject: string,
  sourceCollectionName: string,
  duplicatedCollectionName: string,
  expectedBenchmarks: EvalHubBenchmarkSuiteTestData['benchmarks'],
  expectedBenchmarkParameters: Record<string, unknown>,
): void => {
  const navigationTimeout = { timeout: 120000 };

  navigateToEvaluationsPage(evaluationTenantProject);
  cy.step(`Open the saved collection actions: ${sourceCollectionName}`);
  findEvalHubCollectionIdByName(evaluationTenantProject, sourceCollectionName).then(
    (sourceCollectionId) => {
      evaluationsPage
        .findBenchmarkSuiteMenu(sourceCollectionId, navigationTimeout)
        .should('be.visible')
        .click();
      evaluationsPage
        .findBenchmarkSuiteAction('duplicate', sourceCollectionId)
        .should('be.visible')
        .click();
      cy.location('pathname', navigationTimeout).should(
        'eq',
        `/evaluation/${evaluationTenantProject}/create/collections/${sourceCollectionId}/copy`,
      );
    },
  );

  cy.step('Name the duplicate and keep the source benchmarks selected');
  advanceCollectionEditorToBenchmarks(duplicatedCollectionName, navigationTimeout);

  cy.step('Verify the duplicate retains its sample counts and tokenizer');
  createEvaluationPage.findBenchmarkSections().should('have.length', expectedBenchmarks.length);
  expectedBenchmarks.forEach(({ numExamples }, index) => {
    createEvaluationPage
      .findBenchmarkParameterInput(index, 'num_examples')
      .should('have.value', String(numExamples));
    // Provider-declared parameters such as tokenizer render as dedicated fields, not advanced JSON.
    Object.entries(expectedBenchmarkParameters).forEach(([parameterKey, parameterValue]) => {
      createEvaluationPage
        .findBenchmarkParameterInput(index, parameterKey)
        .should('have.value', String(parameterValue));
    });
  });

  cy.step('Add the duplicate to My collections');
  cy.intercept('POST', '**/eval-hub/api/v1/evaluations/collections/*/clones*').as(
    'cloneEvalHubCollection',
  );
  saveCollectionWithoutRun();
  cy.wait('@cloneEvalHubCollection', { timeout: 120000 }).then(({ request, response }) => {
    expect(response?.statusCode).to.equal(201);
    expect(request.body).to.have.property('name', duplicatedCollectionName);
    const clonedBenchmarks = (
      request.body as {
        benchmarks?: Array<{
          id: string;
          parameters?: Record<string, unknown>;
        }>;
      }
    ).benchmarks;
    expect(clonedBenchmarks, 'benchmarks in duplicate request').to.have.length(
      expectedBenchmarks.length,
    );
    clonedBenchmarks?.forEach((benchmark, index) => {
      expect(benchmark.id).to.equal(expectedBenchmarks[index].id);
      assertBenchmarkParametersIncluded(
        benchmark.parameters,
        {
          // eslint-disable-next-line camelcase
          num_examples: expectedBenchmarks[index].numExamples,
          ...expectedBenchmarkParameters,
        },
        `cloned benchmark ${benchmark.id}`,
      );
    });
  });
  verifySavedCollectionsVisible(
    evaluationTenantProject,
    [sourceCollectionName, duplicatedCollectionName],
    navigationTimeout,
  );
  findEvalHubCollectionIdByName(evaluationTenantProject, duplicatedCollectionName).then(
    (duplicatedCollectionId) =>
      findEvalHubCollectionIdByName(evaluationTenantProject, sourceCollectionName).then(
        (sourceCollectionId) => {
          expect(duplicatedCollectionId).not.to.equal(sourceCollectionId);
        },
      ),
  );
};

/** Edits a saved collection's sample count and verifies the saved PATCH payload. */
export const editSavedBenchmarkCollection = (
  evaluationTenantProject: string,
  collectionName: string,
  expectedBenchmarks: EvalHubBenchmarkSuiteTestData['benchmarks'],
  updatedNumExamples: number,
  expectedBenchmarkParameters: Record<string, unknown>,
): void => {
  const navigationTimeout = { timeout: 120000 };

  navigateToEvaluationsPage(evaluationTenantProject);
  cy.step(`Open the saved collection for editing: ${collectionName}`);
  findEvalHubCollectionIdByName(evaluationTenantProject, collectionName).then((collectionId) => {
    evaluationsPage
      .findBenchmarkSuiteMenu(collectionId, navigationTimeout)
      .should('be.visible')
      .click();
    evaluationsPage.findBenchmarkSuiteAction('edit', collectionId).should('be.enabled').click();
    cy.location('pathname', navigationTimeout).should(
      'eq',
      `/evaluation/${evaluationTenantProject}/create/collections/${collectionId}/edit`,
    );
  });

  cy.step('Check saved settings and update each benchmark sample count');
  advanceCollectionEditorToBenchmarks(collectionName, navigationTimeout);
  expectedBenchmarks.forEach(({ numExamples }, index) => {
    createEvaluationPage
      .findBenchmarkParameterInput(index, 'num_examples')
      .should('have.value', String(numExamples));
    Object.entries(expectedBenchmarkParameters).forEach(([parameterKey, parameterValue]) => {
      createEvaluationPage
        .findBenchmarkParameterInput(index, parameterKey)
        .should('have.value', String(parameterValue));
    });
    setBenchmarkNumExamples(
      index,
      updatedNumExamples,
      `Set benchmark ${index + 1} to ${updatedNumExamples} examples`,
    );
  });

  cy.step('Save the edited collection and verify the PATCH payload');
  cy.intercept('PATCH', '**/eval-hub/api/v1/evaluations/collections/*').as(
    'updateEvalHubCollection',
  );
  saveCollectionWithoutRun();
  cy.wait('@updateEvalHubCollection', { timeout: 120000 }).then(({ request, response }) => {
    expect(response?.statusCode).to.equal(200);
    const patchOperations = request.body as {
      op: string;
      path: string;
      value: unknown;
    }[];
    const benchmarksOperation = patchOperations.find(({ path }) => path === '/benchmarks');
    expect(benchmarksOperation?.op, 'benchmark patch operation').to.equal('replace');
    expect(benchmarksOperation?.value, 'edited benchmark values').to.be.an('array');
    const patchedBenchmarks = benchmarksOperation?.value as {
      id: string;
      parameters?: Record<string, unknown>;
    }[];
    expect(patchedBenchmarks).to.have.length(expectedBenchmarks.length);
    patchedBenchmarks.forEach((benchmark, index) => {
      expect(benchmark.id).to.equal(expectedBenchmarks[index].id);
      assertBenchmarkParametersIncluded(
        benchmark.parameters,
        {
          // eslint-disable-next-line camelcase
          num_examples: updatedNumExamples,
          ...expectedBenchmarkParameters,
        },
        `edited benchmark ${benchmark.id}`,
      );
    });
  });
  verifySavedCollectionsVisible(evaluationTenantProject, [collectionName], navigationTimeout);
};

/** Confirms the Edit action is disabled after a saved collection has been run. */
export const verifySavedBenchmarkCollectionEditDisabled = (
  evaluationTenantProject: string,
  collectionName: string,
): void => {
  const navigationTimeout = { timeout: 120000 };
  navigateToEvaluationsPage(evaluationTenantProject);
  cy.step(`Verify Edit is disabled for the run collection: ${collectionName}`);
  findEvalHubCollectionIdByName(evaluationTenantProject, collectionName).then((collectionId) => {
    evaluationsPage
      .findBenchmarkSuiteMenu(collectionId, navigationTimeout)
      .should('be.visible')
      .click();
    evaluationsPage.findBenchmarkSuiteAction('edit', collectionId).should('be.disabled');
  });
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
    benchmarkProviderId,
    benchmarkId,
    evaluationRunName,
    inferenceServiceName,
    mlflowExperimentName,
    hardwareProfileName,
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
    .findBenchmarkCard(benchmarkProviderId, benchmarkId)
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

  cy.step(
    hardwareProfileName
      ? 'Select Kueue hardware profile'
      : 'Verify no hardware profile is required',
  );
  configureEvaluationHardwareProfile(hardwareProfileName);

  cy.step('Submit evaluation and confirm it appears in the list');
  const usesOfflineData = interceptEvalHubOfflineDataRequest();
  cy.intercept('POST', '**/eval-hub/api/v1/evaluations/jobs*').as('createEvalHubJob');
  createEvaluationPage.findStartEvaluationSubmitButton().should('be.enabled').click();
  assertEvaluationJobOptions(hardwareProfileName);
  if (usesOfflineData) {
    assertEvalHubOfflineDataRequest();
  }
  cy.url({ timeout: 120000 }).should('not.include', '/create');
  evaluationsPage.findRunsTabContent({ timeout: 120000 }).should('be.visible');
  evaluationsPage
    .findEvaluationStatusButtonInRow(evaluationRunName, { timeout: 120000 })
    .should('be.visible');
};

// Benchmark-collection flow
export const createBenchmarkSuite = (opts: BenchmarkSuiteCreationOptions): void => {
  const {
    suiteName,
    suiteDomains,
    benchmarkProviderId,
    benchmarks,
    additionalBenchmarkParams,
    runAfterSave = false,
  } = opts;

  cy.step(`Create benchmark collection: ${suiteName}`);
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
  // TEMP: Keep model-only behavior until EvalHub supports more evaluation_targets; restore this code when support is added.
  /*
  createEvaluationPage.findSuiteEvaluatesToggle().click();
  createEvaluationPage.findSuiteEvaluatesOption('model').click();
  createEvaluationPage.closeSuiteEvaluatesMenu();
  */
  suiteDomains.forEach((category) => createEvaluationPage.selectSuiteCategory(category));
  createEvaluationPage.findCopySuiteNextButton().should('be.enabled').click();

  benchmarks.forEach(({ id, name }) => {
    cy.step(`Add benchmark to collection: ${name} (${id})`);
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
      setBenchmarkNumExamples(
        index,
        numExamples,
        `Set the dedicated Num examples parameter for ${name}`,
      );
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
    cy.step('Save the collection and open the evaluation run form');
    createEvaluationPage.findCreateSuiteSaveAndRunButton().should('be.enabled').click();
    createEvaluationPage
      .findStartEvaluationRunModal('create-suite-run-evaluation-modal', { timeout: 120000 })
      .should('be.visible');
    return;
  }

  cy.step('Add the collection to my collections');
  createEvaluationPage.findCopySuiteSaveOnlyButton().should('be.enabled').click();
  cy.location('pathname', { timeout: 120000 }).should('match', /\/evaluation\/[^/]+\/collections$/);
};

type CollectionRunConfigurationOptions = Omit<BenchmarkSuiteEvaluationOptions, 'suiteName'> & {
  modalId: string;
  collectionName?: string;
  benchmarkParameterOverrides?: Record<string, unknown>;
};

const configureAndSubmitBenchmarkSuiteEvaluation = ({
  modalId,
  collectionName,
  evaluationRunName,
  inferenceServiceName,
  mlflowExperimentName,
  hardwareProfileName,
  benchmarkParameterOverrides,
}: CollectionRunConfigurationOptions): void => {
  createEvaluationPage
    .findStartEvaluationRunModal(modalId, { timeout: 120000 })
    .should('be.visible');
  createEvaluationPage
    .findStartEvaluationForm({ timeout: 120000 })
    .should('have.attr', 'aria-busy', 'false');

  createEvaluationPage.findAdvancedConfigurationToggle(modalId).click();
  selectNewMlflowExperiment(mlflowExperimentName, modalId);

  cy.step('Enter evaluation name');
  if (collectionName) {
    createEvaluationPage
      .findStartEvaluationRunCollectionName(modalId)
      .should('contain.text', collectionName);
  }
  createEvaluationPage.findEvaluationNameInput(modalId).clear().type(evaluationRunName);

  cy.step('Select deployed model from cluster picker');
  createEvaluationPage.findModelPickerToggle(modalId).click();
  createEvaluationPage.findModelOption(inferenceServiceName, modalId).should('be.visible').click();
  createEvaluationPage.findModelPickerToggle(modalId).should('contain.text', inferenceServiceName);

  cy.step(
    hardwareProfileName
      ? 'Select Kueue hardware profile'
      : 'Verify no hardware profile is required',
  );
  configureEvaluationHardwareProfile(hardwareProfileName, modalId);

  cy.step('Submit evaluation and confirm it appears in the list');
  const transformRequestBody = benchmarkParameterOverrides
    ? (requestBody: unknown) =>
        overrideCollectionBenchmarkParameters(requestBody, benchmarkParameterOverrides)
    : undefined;
  const usesOfflineData = interceptEvalHubOfflineDataRequest(transformRequestBody);
  if (usesOfflineData) {
    // The offline interceptor now composes the request body. Keep a pass-through alias for the
    // common job assertion without registering a second request handler that would short-circuit it.
    cy.intercept('POST', '**/eval-hub/api/v1/evaluations/jobs*').as('createEvalHubJob');
  } else {
    cy.intercept('POST', '**/eval-hub/api/v1/evaluations/jobs*', (request) => {
      const interceptedRequest = request;
      if (benchmarkParameterOverrides) {
        interceptedRequest.body = overrideCollectionBenchmarkParameters(
          interceptedRequest.body,
          benchmarkParameterOverrides,
        );
      }
      interceptedRequest.continue();
    }).as('createEvalHubJob');
  }
  createEvaluationPage.findStartEvaluationSubmitButton(modalId).should('be.enabled').click();
  const expectedBenchmarkParameterOverrides =
    usesOfflineData && benchmarkParameterOverrides
      ? Object.fromEntries(
          Object.entries(benchmarkParameterOverrides).filter(([key]) => key !== 'tokenizer'),
        )
      : benchmarkParameterOverrides;
  if (usesOfflineData) {
    assertEvalHubOfflineDataRequest((requestBody) => {
      assertEvaluationJobOptionsForRequest(
        requestBody,
        hardwareProfileName,
        expectedBenchmarkParameterOverrides,
      );
    });
  } else {
    assertEvaluationJobOptions(hardwareProfileName, expectedBenchmarkParameterOverrides);
  }
  evaluationsPage.findRunsTabContent({ timeout: 120000 }).should('be.visible');
  evaluationsPage.findEvaluationsTable().should('contain', evaluationRunName);
};

export const submitBenchmarkSuiteEvaluation = (opts: BenchmarkSuiteEvaluationOptions): void => {
  const { suiteName, ...runConfiguration } = opts;

  cy.step(`Find the newly created collection on the Evaluate tab: ${suiteName}`);
  const suiteLookupTimeout = { timeout: 120000 };
  evaluationsPage.findBenchmarkSuiteCardByName(suiteName, suiteLookupTimeout).should('be.visible');
  evaluationsPage.findBenchmarkSuitePrimaryActionByName(suiteName, suiteLookupTimeout).click();
  configureAndSubmitBenchmarkSuiteEvaluation({
    ...runConfiguration,
    collectionName: suiteName,
    modalId: 'evaluations-page-start-evaluation-run-modal',
  });
};

export const submitCuratedCollectionEvaluation = (
  opts: Omit<BenchmarkSuiteEvaluationOptions, 'suiteName'> & {
    collectionId: string;
    benchmarkParameterOverrides?: Record<string, unknown>;
  },
): void => {
  const { collectionId, benchmarkParameterOverrides, ...runConfiguration } = opts;
  const navigationTimeout = { timeout: 120000 };

  if (benchmarkParameterOverrides) {
    cy.step(
      `Apply benchmark parameter overrides to the run request: ${JSON.stringify(
        benchmarkParameterOverrides,
      )}`,
    );
  }

  cy.step(`Select curated collection from the Gallery tab: ${collectionId}`);
  evaluationsPage
    .findGalleryTab({ timeout: navigationTimeout.timeout })
    .should('have.attr', 'aria-selected', 'true');
  evaluationsPage.findGalleryTabContent(navigationTimeout).should('be.visible');
  evaluationsPage
    .findGalleryBenchmarkSuiteName(collectionId, navigationTimeout)
    .should('be.visible')
    .invoke('text')
    .then((collectionName) => {
      evaluationsPage
        .findGalleryBenchmarkSuitePrimaryAction(collectionId, navigationTimeout)
        .scrollIntoView()
        .should('be.visible')
        .click();

      configureAndSubmitBenchmarkSuiteEvaluation({
        ...runConfiguration,
        benchmarkParameterOverrides,
        collectionName: collectionName.trim(),
        modalId: 'curated-suite-start-evaluation-run-modal',
      });
    });
};

export const submitCreatedBenchmarkSuiteEvaluation = (
  opts: BenchmarkSuiteEvaluationOptions,
): void => {
  const { suiteName, ...runConfiguration } = opts;
  cy.step(`Configure the newly created collection evaluation: ${opts.suiteName}`);
  configureAndSubmitBenchmarkSuiteEvaluation({
    ...runConfiguration,
    collectionName: suiteName,
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
  expectedBenchmarkIds: string[] = [],
): void => {
  cy.step('Wait for the Runs list to show completion, then open the results action');
  // The visible Runs page polls job status, so wait in place instead of reloading the app shell.
  const statusTimeout = { timeout: 120000 };
  evaluationsPage.findPageTitle({ timeout: 30000 }).should('be.visible');
  evaluationsPage.findRunsTabContent(statusTimeout).should('be.visible');
  evaluationsPage
    .findEvaluationStatusButtonInRow(evaluationRunName, statusTimeout)
    .should('contain.text', 'Complete')
    .click();
  evaluationsPage.findStatusModal(statusTimeout).should('be.visible');
  evaluationsPage.findStatusModalStopButton(statusTimeout).should('not.exist');
  evaluationsPage.findStatusModalViewResultsButton(statusTimeout).should('be.visible');
  evaluationsPage.findStatusModalViewResultsButton(statusTimeout).click();

  cy.step('Verify evaluation results page renders with score and metadata');
  evaluationResultsPage.findResultsContent().should('be.visible');
  evaluationResultsPage.findScoreValue().should('be.visible');
  evaluationResultsPage.findMetadata().should('be.visible');
  evaluationResultsPage.findBenchmarkDetailsInfo().should('be.visible');

  if (expectedBenchmarkIds.length > 0) {
    cy.step(`Verify all ${expectedBenchmarkIds.length} benchmark results are displayed`);
    if (expectedBenchmarkIds.length === 1) {
      evaluationResultsPage
        .findBenchmarkProviderLabel()
        .should('contain.text', expectedBenchmarkIds[0]);
    } else {
      evaluationResultsPage.findBenchmarksGrid().should('be.visible');
      evaluationResultsPage.findBenchmarkResultCards().then(($cards) => {
        if ($cards.length < expectedBenchmarkIds.length) {
          evaluationResultsPage.findViewMoreButton().should('be.visible').click();
        }
      });
      evaluationResultsPage
        .findBenchmarkResultCards()
        .should('have.length', expectedBenchmarkIds.length);
      const expectedOccurrences = new Map<string, number>();
      expectedBenchmarkIds.forEach((benchmarkId) => {
        expectedOccurrences.set(benchmarkId, (expectedOccurrences.get(benchmarkId) ?? 0) + 1);
      });
      expectedOccurrences.forEach((expectedCount, benchmarkId) => {
        evaluationResultsPage
          .findBenchmarkResultCardById(benchmarkId)
          .should('have.length', expectedCount)
          .and('be.visible');
      });
    }
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
};

// Stop and reconfigure flow
export function stopAndReconfigureEvaluation(
  evaluationRunName: string,
  reconfiguredRunName: string,
  tenantNamespace: string,
): void {
  cy.step('Wait for evaluation to reach Running status');
  const statusTimeout = { timeout: 120000 };
  evaluationsPage.findRunsTabContent(statusTimeout).should('be.visible');
  evaluationsPage
    .findEvaluationStatusButtonInRow(evaluationRunName, { timeout: 600000 })
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
  interceptEvalHubOfflineDataReadForReconfigure(tenantNamespace);
  evaluationsPage.findEvaluationStatusButtonInRow(evaluationRunName, statusTimeout).click();
  evaluationsPage.findStatusModal(statusTimeout).should('be.visible');
  evaluationsPage.findStatusModalReconfigureButton(statusTimeout).should('be.visible').click();

  cy.step(`Submit the reconfigured evaluation run as "${reconfiguredRunName}"`);
  cy.url().should('include', '/reconfigure');
  createEvaluationPage.findStartEvaluationForm({ timeout: 30000 }).should('exist');
  createEvaluationPage.findEvaluationNameInput().clear().type(reconfiguredRunName);
  configureEvaluationHardwareProfile();
  cy.intercept('POST', '**/eval-hub/api/v1/evaluations/jobs*').as('createEvalHubJob');
  createEvaluationPage.findStartEvaluationSubmitButton().should('be.enabled').click();
  assertEvaluationJobOptions();
  assertEvalHubOfflineDataRequest();
  cy.url({ timeout: 120000 }).should('not.include', '/reconfigure');
  evaluationsPage.findRunsTabContent(statusTimeout).should('be.visible');
  evaluationsPage
    .findEvaluationStatusButtonInRow(reconfiguredRunName, statusTimeout)
    .should('be.visible');
}

// End-to-end flow composition
export const runSingleBenchmarkEvaluationFlow = (
  evaluationTenantProject: string,
  opts: SingleBenchmarkEvaluationOptions,
): void => {
  navigateToEvaluationsPage(evaluationTenantProject);
  submitSingleBenchmarkEvaluation(opts);
  verifyEvaluationProgressModal(opts.evaluationRunName);
  waitForEvaluationJobComplete(evaluationTenantProject);
  verifyEvaluationCompletedAndViewResults(opts.evaluationRunName);
};

// Shared cleanup orchestration
export type EvalHubCleanupStep = {
  description: string;
  run: () => Cypress.Chainable | void;
};

/**
 * Replacement for a cleanup step that calls the EvalHub REST API when no dashboard session
 * exists (setup failed before the dashboard was opened). Keeps the step visible in the
 * cleanup log without hiding the original setup failure behind an API error.
 */
const skipWithoutDashboardSession = (description: string): EvalHubCleanupStep => ({
  description,
  run: (): void => {
    cy.log(
      `${description}: skipped — no dashboard session was established during setup; ` +
        'the EvalHub REST API would return the login page',
    );
  },
});

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

/**
 * Builds the shared cleanup sequence used by the live EvalHub specs.
 *
 * Reads `dashboardSessionEstablished` synchronously at construction time — safe because
 * specs invoke this from `after()`, once setup has finished setting the flag.
 */
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
    if (dashboardSessionEstablished) {
      cleanupSteps.push({
        description: `Delete EvalHub evaluation jobs for ${evaluationTenantProject}`,
        run: () => deleteEvalHubEvaluationJobs(evaluationTenantProject),
      });
    } else {
      // Evaluation jobs are namespaced resources, so the project-deletion step below
      // removes them even when this API-based cleanup is skipped.
      cleanupSteps.push(skipWithoutDashboardSession('Skip EvalHub evaluation job cleanup'));
    }
  }

  if (evaluationTenantProject) {
    if (dashboardSessionEstablished) {
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
    } else if (collectionsToDelete.length > 0 || deleteAllTenantCollections) {
      cleanupSteps.push(skipWithoutDashboardSession('Skip EvalHub tenant collection cleanup'));
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
