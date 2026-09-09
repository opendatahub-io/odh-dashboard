/* eslint-disable camelcase */
import type { Namespace } from 'mod-arch-core';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockEvaluationJob } from '~/__mocks__/mockEvaluationJob';
import { mockEvalHubHealth } from '~/__mocks__/mockEvalHubHealth';
import {
  mockBenchmarkSuiteCollections,
  mockCollectionsListResponse,
} from '~/__mocks__/mockCollection';
import { evaluationsPage } from '~/__tests__/cypress/cypress/pages/evaluationsPage';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';
import type { Collection, EvalHubHealthResponse, EvaluationJob, Provider } from '~/app/types';

const NAMESPACE = 'test-namespace';
const API_VERSION = { apiVersion: CLIENT_API_VERSION };

type InterceptOptions = {
  namespaces?: Namespace[];
  health?: EvalHubHealthResponse;
  jobs?: EvaluationJob[];
  providers?: Provider[];
  collections?: Collection[];
  collectionsTotalCount?: number;
};

const initIntercepts = ({
  namespaces = [mockNamespace({ name: NAMESPACE })],
  health = mockEvalHubHealth(),
  jobs = [],
  providers = [],
  collections = [],
  collectionsTotalCount,
}: InterceptOptions = {}) => {
  cy.interceptApi(
    'GET /api/:apiVersion/user',
    { path: API_VERSION },
    mockUserSettings({ userId: 'test-user' }),
  );

  cy.interceptApi('GET /api/:apiVersion/namespaces', { path: API_VERSION }, namespaces);

  cy.interceptApi('GET /api/:apiVersion/evalhub/health', { path: API_VERSION }, health);

  cy.interceptApi('GET /api/:apiVersion/evaluations/jobs', { path: API_VERSION }, jobs);

  cy.interceptApi('GET /api/:apiVersion/evaluations/providers', { path: API_VERSION }, providers);

  cy.interceptApi(
    'GET /api/:apiVersion/evaluations/collections',
    { path: API_VERSION },
    mockCollectionsListResponse(collections, collectionsTotalCount),
  );
};

describe('Evaluations Page - Tabs', () => {
  beforeEach(() => {
    initIntercepts({
      jobs: [mockEvaluationJob({ id: 'eval-tabs', name: 'Tabs Eval', state: 'completed' })],
    });
  });

  it('should default to the Evaluate tab with the benchmark suite placeholder', () => {
    evaluationsPage.visit(NAMESPACE);
    evaluationsPage.findEvaluateTab().should('have.attr', 'aria-selected', 'true');
    evaluationsPage.findEvaluateContent().should('exist');
    evaluationsPage.findCreateSuiteCard().should('exist');
    evaluationsPage.findCreateSuiteButton().should('be.enabled');
    evaluationsPage
      .findPageDescription()
      .should(
        'contain.text',
        'Create benchmark suites and run evaluations to measure model, agent, and dataset performance.',
      );
  });

  it('should switch to Runs and render its content description', () => {
    evaluationsPage.visit(NAMESPACE);
    evaluationsPage.findRunsTab().click();
    evaluationsPage.findRunsTab().should('have.attr', 'aria-selected', 'true');
    evaluationsPage.findRunsContent().should('exist');
    evaluationsPage.findEvaluationsTable().should('exist');
    evaluationsPage
      .findPageDescription()
      .should(
        'contain.text',
        'Create benchmark suites and run evaluations to measure model, agent, and dataset performance.',
      );
    evaluationsPage
      .findRunsDescription()
      .should('contain.text', 'Start and manage evaluation runs for models, agents, and datasets.');
    cy.url().should('include', '?tab=runs');
  });

  it('should restore the Evaluate tab when navigating back', () => {
    evaluationsPage.visit(NAMESPACE);
    evaluationsPage.findRunsTab().click();
    cy.go('back');
    evaluationsPage.findEvaluateTab().should('have.attr', 'aria-selected', 'true');
    evaluationsPage.findCreateSuiteCard().should('exist');
  });

  it('should render tenant benchmark suites in the gallery', () => {
    initIntercepts({
      collections: mockBenchmarkSuiteCollections(),
      collectionsTotalCount: 6,
    });

    evaluationsPage.visit(NAMESPACE);

    evaluationsPage.findBenchmarkSuiteCard('model-suite-2').should('contain.text', 'Model suite 2');
    evaluationsPage.findBenchmarkSuiteCard('model-suite-7').should('contain.text', 'Model suite 7');
    evaluationsPage.findBenchmarkSuiteCard('agent-safety-suite').should('exist');
    evaluationsPage.findBenchmarkSuiteCard('code-quality-suite').should('exist');
    evaluationsPage.findBenchmarkSuiteCard('trace-evaluation-suite').should('exist');
    evaluationsPage
      .findBenchmarkSuitesSummary()
      .should('contain.text', 'Go to All my benchmark suites');
  });

  it('should open the suite details drawer when selecting a suite name', () => {
    initIntercepts({ collections: mockBenchmarkSuiteCollections() });

    evaluationsPage.visit(NAMESPACE);
    evaluationsPage.findBenchmarkSuiteName('model-suite-2').click();

    evaluationsPage.findCollectionDrawerPanel().should('be.visible');
    evaluationsPage.findCollectionDrawerPanel().should('contain.text', 'Model suite 2');
    evaluationsPage.findCollectionDrawerPanel().should('contain.text', 'Run benchmark suite');
  });

  it('should render curated suite category cards and link to filtered collections', () => {
    initIntercepts({ collections: mockBenchmarkSuiteCollections() });

    evaluationsPage.visit(NAMESPACE);

    evaluationsPage.findCuratedSuiteCategories().should('exist');
    evaluationsPage.findCuratedSuiteCategoryCard('agents').should('contain.text', 'Agents');
    evaluationsPage.findCuratedSuiteCategoryCard('models').click();
    cy.url().should('include', `/evaluation/${NAMESPACE}/create/collections`);
    cy.url().should('include', 'scope=curated');
    cy.url().should('include', 'ai_entities=model');
  });

  it('should show suite contextual actions and the delete confirmation modal', () => {
    initIntercepts({ collections: mockBenchmarkSuiteCollections() });

    evaluationsPage.visit(NAMESPACE);
    evaluationsPage.findBenchmarkSuiteMenu('model-suite-2').click();

    evaluationsPage.findBenchmarkSuiteAction('edit', 'model-suite-2').should('be.visible');
    evaluationsPage.findBenchmarkSuiteAction('duplicate', 'model-suite-2').should('be.visible');
    evaluationsPage.findBenchmarkSuiteAction('delete', 'model-suite-2').click();

    evaluationsPage.findBenchmarkSuiteDeleteModal().should('be.visible');
    evaluationsPage
      .findBenchmarkSuiteDeleteModal()
      .should('contain.text', 'The Model suite 2 benchmark suite will be permanently deleted.');
    evaluationsPage.findBenchmarkSuiteDeleteCancel().click();
    evaluationsPage.findBenchmarkSuiteDeleteModal().should('not.exist');
  });
});

describe('Evaluations Page - Table', () => {
  const completedJob = mockEvaluationJob({
    id: 'eval-001',
    name: 'GPT4_Accuracy_Eval',
    state: 'completed',
    modelName: 'gpt-4',
    createdAt: '2026-03-15T09:00:00Z',
    benchmarkIds: ['truthfulqa_mc1'],
    providerId: 'lm_evaluation_harness',
    score: 0.85,
    scorePass: true,
    threshold: 0.7,
    benchmarkResults: [
      {
        id: 'truthfulqa_mc1',
        provider_id: 'lm_evaluation_harness',
        metrics: { accuracy: 0.85 },
        test: { primary_score: 0.85, threshold: 0.7, pass: true },
      },
    ],
  });

  const runningJob = mockEvaluationJob({
    id: 'eval-002',
    name: 'Claude_Safety_Eval',
    state: 'running',
    modelName: 'claude-3-opus',
    createdAt: '2026-03-16T14:30:00Z',
    benchmarkIds: ['harmful_request_refusal'],
    providerId: 'safety_eval_suite',
  });

  const failedJob = mockEvaluationJob({
    id: 'eval-003',
    name: 'Llama_Benchmark_Eval',
    state: 'failed',
    modelName: 'llama-3',
    createdAt: '2026-03-14T08:00:00Z',
    benchmarkIds: ['hellaswag'],
    providerId: 'lm_evaluation_harness',
  });

  beforeEach(() => {
    initIntercepts({ jobs: [completedJob, runningJob, failedJob] });
  });

  it('should display the evaluations table with correct rows', () => {
    evaluationsPage.visitRuns(NAMESPACE);
    evaluationsPage.findEvaluationsTable().should('exist');
    evaluationsPage.findEvaluationRow(0).should('exist');
    evaluationsPage.findEvaluationRow(1).should('exist');
    evaluationsPage.findEvaluationRow(2).should('exist');
  });

  it('should show a link to results on completed evaluations', () => {
    evaluationsPage.visitRuns(NAMESPACE);
    // Table sorts by date desc: row 0 = running (Mar 16), row 1 = completed (Mar 15)
    evaluationsPage.findEvaluationLink(1).should('exist');
    evaluationsPage.findEvaluationLink(1).click();
    cy.url().should('include', `/results/${completedJob.resource.id}`);
  });

  it('should display the toolbar with filter and create button', () => {
    evaluationsPage.visitRuns(NAMESPACE);
    evaluationsPage.findEvaluationsTableToolbar().should('exist');
    evaluationsPage.findFilterTypeToggle().should('exist');
    evaluationsPage.findFilterTextField().should('exist');
    evaluationsPage.findCreateEvaluationButton().should('exist');
  });

  it('should navigate to the Evaluate tab when starting an evaluation run', () => {
    evaluationsPage.visitRuns(NAMESPACE);
    evaluationsPage.findCreateEvaluationButton().click();
    evaluationsPage.findEvaluateTab().should('have.attr', 'aria-selected', 'true');
    evaluationsPage.findCreateSuiteCard().should('exist');
    cy.url().should('include', `/evaluation/${NAMESPACE}?tab=evaluate`);
  });
});

describe('Evaluations Page - Empty state', () => {
  beforeEach(() => {
    initIntercepts({ jobs: [] });
  });

  it('should display the empty state when no evaluations exist', () => {
    evaluationsPage.visitRuns(NAMESPACE);
    evaluationsPage.findEmptyState().should('exist');
    evaluationsPage
      .findEmptyStateBody()
      .should(
        'contain.text',
        'Start an evaluation run, or select a different project to view its runs.',
      );
  });

  it('should navigate to the Evaluate tab when clicking the empty state action', () => {
    evaluationsPage.visitRuns(NAMESPACE);
    evaluationsPage.findCreateEvaluationButton().click();
    evaluationsPage.findEvaluateTab().should('have.attr', 'aria-selected', 'true');
    evaluationsPage.findCreateSuiteCard().should('exist');
    cy.url().should('include', `/evaluation/${NAMESPACE}?tab=evaluate`);
  });
});

describe('Evaluations Page - Unavailable (unhealthy)', () => {
  beforeEach(() => {
    initIntercepts({ health: mockEvalHubHealth({ available: false }) });
  });

  it('should display the evaluations unavailable state', () => {
    evaluationsPage.visitRuns(NAMESPACE);
    evaluationsPage.findUnavailableEmptyState().should('exist');
    evaluationsPage.findUnavailableEmptyState().should('contain.text', 'Evaluations unavailable');
    evaluationsPage.findEvaluationsTable().should('not.exist');
  });
});

describe('Evaluations Page - Invalid project', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should display the invalid project state for an unknown namespace', () => {
    evaluationsPage.visitInvalidProject('nonexistent-project');
    evaluationsPage.findInvalidProjectState().should('exist');
    evaluationsPage.findInvalidProjectState().should('contain.text', 'nonexistent-project');
  });
});

describe('Evaluations Page - No projects', () => {
  beforeEach(() => {
    initIntercepts({ namespaces: [] });
  });

  it('should display the no projects state', () => {
    evaluationsPage.visitNoProjects();
    evaluationsPage.findNoProjectsState().should('exist');
    evaluationsPage.findNoProjectsState().should('contain.text', 'No projects');
  });
});

describe('Evaluations Page - Redirect behavior', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('should redirect from root to the preferred namespace', () => {
    evaluationsPage.visitRoot();
    cy.url().should('include', `/evaluation/${NAMESPACE}`);
  });
});

describe('Evaluations Page - Status labels', () => {
  const preStartFailedJob = mockEvaluationJob({
    id: 'eval-pre-start',
    name: 'PreStart_Failure_Eval',
    state: 'failed',
    modelName: 'test-model',
    createdAt: '2026-03-14T08:00:00Z',
    benchmarkIds: ['mmlu'],
    providerId: 'lm_evaluation_harness',
    // No started_at on any benchmark — failure occurred before evaluation began
    benchmarkStatuses: [{ id: 'mmlu', benchmark_index: 0, status: 'failed' }],
    statusMessage: 'Admission error: insufficient resources',
    statusMessageCode: 'admission_error',
    statusMessageOrigin: 'server',
  });

  const runtimeFailedJob = mockEvaluationJob({
    id: 'eval-runtime-fail',
    name: 'Runtime_Failure_Eval',
    state: 'failed',
    modelName: 'test-model',
    createdAt: '2026-03-13T08:00:00Z',
    benchmarkIds: ['hellaswag'],
    providerId: 'lm_evaluation_harness',
    // started_at is set — failure occurred during benchmark execution
    benchmarkStatuses: [
      { id: 'hellaswag', benchmark_index: 0, status: 'failed', started_at: '2026-03-13T08:05:00Z' },
    ],
    statusMessage: 'Benchmark execution failed',
  });

  const partiallyFailedJob = mockEvaluationJob({
    id: 'eval-partial',
    name: 'Partial_Failure_Eval',
    state: 'partially_failed',
    modelName: 'test-model',
    createdAt: '2026-03-12T08:00:00Z',
    benchmarkIds: ['mmlu', 'hellaswag'],
    providerId: 'lm_evaluation_harness',
    benchmarkStatuses: [
      { id: 'mmlu', benchmark_index: 0, status: 'completed', started_at: '2026-03-12T08:05:00Z' },
      { id: 'hellaswag', benchmark_index: 1, status: 'failed', started_at: '2026-03-12T08:10:00Z' },
    ],
  });

  beforeEach(() => {
    initIntercepts({ jobs: [preStartFailedJob, runtimeFailedJob, partiallyFailedJob] });
  });

  it('should show "Not started" badge for a pre-start failure with no benchmark started_at', () => {
    evaluationsPage.visitRuns(NAMESPACE);
    // Table sorts by date desc: row 0 = preStart (Mar 14), row 1 = runtime (Mar 13), row 2 = partial (Mar 12)
    evaluationsPage.findStatusLabel(0).should('have.text', 'Not started');
  });

  it('should show "Failed" badge for a runtime failure where benchmarks started', () => {
    evaluationsPage.visitRuns(NAMESPACE);
    evaluationsPage.findStatusLabel(1).should('have.text', 'Failed');
  });

  it('should show "Failed" badge for a partially_failed job', () => {
    evaluationsPage.visitRuns(NAMESPACE);
    evaluationsPage.findStatusLabel(2).should('have.text', 'Failed');
  });
});

describe('Evaluations Page - Status modal', () => {
  const preStartFailedJob = mockEvaluationJob({
    id: 'eval-pre-start',
    name: 'PreStart_Failure_Eval',
    state: 'failed',
    modelName: 'test-model',
    createdAt: '2026-03-14T08:00:00Z',
    benchmarkIds: ['mmlu'],
    providerId: 'lm_evaluation_harness',
    benchmarkStatuses: [{ id: 'mmlu', benchmark_index: 0, status: 'failed' }],
    statusMessage: 'Admission error: insufficient resources',
    statusMessageOrigin: 'server',
  });

  const runtimeFailedJob = mockEvaluationJob({
    id: 'eval-runtime-fail',
    name: 'Runtime_Failure_Eval',
    state: 'failed',
    modelName: 'test-model',
    createdAt: '2026-03-13T08:00:00Z',
    benchmarkIds: ['hellaswag'],
    providerId: 'lm_evaluation_harness',
    benchmarkStatuses: [
      { id: 'hellaswag', benchmark_index: 0, status: 'failed', started_at: '2026-03-13T08:05:00Z' },
    ],
    statusMessage: 'Benchmark execution failed',
  });

  beforeEach(() => {
    initIntercepts({ jobs: [preStartFailedJob, runtimeFailedJob] });
  });

  it('should open the status modal when clicking the status badge', () => {
    evaluationsPage.visitRuns(NAMESPACE);
    evaluationsPage.clickStatusBadge(0);
    evaluationsPage.findStatusModal().should('exist');
  });

  it('should show "Not started" badge in modal for a pre-start failure', () => {
    evaluationsPage.visitRuns(NAMESPACE);
    // row 0 = pre-start (Mar 14)
    evaluationsPage.clickStatusBadge(0);
    evaluationsPage.findStatusModalBadge('failed').should('have.text', 'Not started');
  });

  it('should show "Failed" badge in modal for a runtime failure', () => {
    evaluationsPage.visitRuns(NAMESPACE);
    // row 1 = runtime failure (Mar 13)
    evaluationsPage.clickStatusBadge(1);
    evaluationsPage.findStatusModalBadge('failed').should('have.text', 'Failed');
  });
});
/* eslint-enable camelcase */
