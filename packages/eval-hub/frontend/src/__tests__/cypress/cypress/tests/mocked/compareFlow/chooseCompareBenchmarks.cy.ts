/* eslint-disable camelcase */
import type { Namespace } from 'mod-arch-core';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockEvaluationJob } from '~/__mocks__/mockEvaluationJob';
import { mockEvalHubHealth } from '~/__mocks__/mockEvalHubHealth';
import { mockCollectionsListResponse } from '~/__mocks__/mockCollection';
import { chooseCompareBenchmarksPage } from '~/__tests__/cypress/cypress/pages/chooseCompareBenchmarksPage';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';
import type { EvalHubHealthResponse, EvaluationJob } from '~/app/types';

const NAMESPACE = 'test-namespace';
const API_VERSION = { apiVersion: CLIENT_API_VERSION };

type InterceptOptions = {
  namespaces?: Namespace[];
  health?: EvalHubHealthResponse;
  jobs?: EvaluationJob[];
};

const initIntercepts = ({
  namespaces = [mockNamespace({ name: NAMESPACE })],
  health = mockEvalHubHealth(),
  jobs = [],
}: InterceptOptions = {}) => {
  cy.interceptApi(
    'GET /api/:apiVersion/user',
    { path: API_VERSION },
    mockUserSettings({ userId: 'test-user' }),
  );
  cy.interceptApi('GET /api/:apiVersion/namespaces', { path: API_VERSION }, namespaces);
  cy.interceptApi('GET /api/:apiVersion/evalhub/health', { path: API_VERSION }, health);
  cy.interceptApi('GET /api/:apiVersion/evaluations/jobs', { path: API_VERSION }, jobs);
  cy.interceptApi(
    'GET /api/:apiVersion/evaluations/collections',
    { path: API_VERSION },
    mockCollectionsListResponse([]),
  );
};

// Suite jobs with mlflow IDs so child benchmark rows are selectable
const suiteJobWithMlflow1 = mockEvaluationJob({
  id: 'suite-job-1',
  name: 'GPT4_Suite_Eval',
  state: 'completed',
  createdAt: '2026-04-15T10:00:00Z',
  benchmarkIds: ['bench-a', 'bench-b'],
  providerId: 'test-provider',
  mlflowExperimentId: 'experiment-suite-1',
  benchmarkResults: [
    {
      id: 'bench-a',
      provider_id: 'test-provider',
      mlflow_run_id: 'run-suite-1-a',
      metrics: {},
      test: { primary_score: 0.8, threshold: 0.7, pass: true },
    },
    {
      id: 'bench-b',
      provider_id: 'test-provider',
      mlflow_run_id: 'run-suite-1-b',
      metrics: {},
      test: { primary_score: 0.6, threshold: 0.5, pass: true },
    },
  ],
});

const suiteJobWithMlflow2 = mockEvaluationJob({
  id: 'suite-job-2',
  name: 'Claude_Suite_Eval',
  state: 'completed',
  createdAt: '2026-04-14T10:00:00Z',
  benchmarkIds: ['bench-a', 'bench-b'],
  providerId: 'test-provider',
  mlflowExperimentId: 'experiment-suite-2',
  benchmarkResults: [
    {
      id: 'bench-a',
      provider_id: 'test-provider',
      mlflow_run_id: 'run-suite-2-a',
      metrics: {},
      test: { primary_score: 0.75, threshold: 0.7, pass: true },
    },
    {
      id: 'bench-b',
      provider_id: 'test-provider',
      mlflow_run_id: 'run-suite-2-b',
      metrics: {},
      test: { primary_score: 0.55, threshold: 0.5, pass: true },
    },
  ],
});

const JOB_IDS = [suiteJobWithMlflow1.resource.id, suiteJobWithMlflow2.resource.id];

// Selection key format: {jobId}|{benchmarkId}|{benchmarkIndex}
const BENCH_A_KEY_JOB1 = 'suite-job-1|bench-a|0';
const BENCH_B_KEY_JOB1 = 'suite-job-1|bench-b|1';

describe('Choose Compare Benchmarks Page - Table display', () => {
  beforeEach(() => {
    initIntercepts({ jobs: [suiteJobWithMlflow1, suiteJobWithMlflow2] });
  });

  it('should display the benchmark selection table and both run rows', () => {
    chooseCompareBenchmarksPage.visit(NAMESPACE, JOB_IDS);
    chooseCompareBenchmarksPage.findBenchmarkSelectionTable().should('exist');
    chooseCompareBenchmarksPage.findRunGroupRow(suiteJobWithMlflow1.resource.id).should('exist');
    chooseCompareBenchmarksPage.findRunGroupRow(suiteJobWithMlflow2.resource.id).should('exist');
  });

  it('should show an empty state when fewer than 2 job IDs are provided', () => {
    chooseCompareBenchmarksPage.visit(NAMESPACE, [suiteJobWithMlflow1.resource.id]);
    chooseCompareBenchmarksPage.findBenchmarkSelectionTable().should('not.exist');
    chooseCompareBenchmarksPage.findTitle().should('contain.text', 'Compare runs');
  });
});

describe('Choose Compare Benchmarks Page - Benchmark selection', () => {
  beforeEach(() => {
    initIntercepts({ jobs: [suiteJobWithMlflow1, suiteJobWithMlflow2] });
  });

  it('should start with the Compare button disabled and enable it after selecting 2 benchmarks', () => {
    chooseCompareBenchmarksPage.visit(NAMESPACE, JOB_IDS);
    chooseCompareBenchmarksPage.findCompareButton().should('be.disabled');

    // Select bench-a from job1 — only 1 selection so still disabled
    chooseCompareBenchmarksPage.findBenchmarkCheckbox(BENCH_A_KEY_JOB1).click();
    chooseCompareBenchmarksPage.findCompareButton().should('be.disabled');

    // Select bench-b from job1 — now 2 selections, button enables
    chooseCompareBenchmarksPage.findBenchmarkCheckbox(BENCH_B_KEY_JOB1).click();
    chooseCompareBenchmarksPage.findCompareButton().should('not.be.disabled');
  });

  it('should navigate to compare-runs after selecting benchmarks and clicking Compare', () => {
    chooseCompareBenchmarksPage.visit(NAMESPACE, JOB_IDS);

    // Select one benchmark from each job using the parent row checkbox
    chooseCompareBenchmarksPage.findBenchmarkCheckbox(BENCH_A_KEY_JOB1).click();
    chooseCompareBenchmarksPage.findBenchmarkCheckbox('suite-job-2|bench-a|0').click();

    chooseCompareBenchmarksPage.findCompareButton().should('not.be.disabled');
    chooseCompareBenchmarksPage.findCompareButton().click();

    cy.url().should('include', `${NAMESPACE}/compare-runs`);
    cy.url().should('not.include', 'benchmarks');
    cy.url().should('include', 'runs=');
    cy.url().should('include', 'experiments=');
  });
});

describe('Choose Compare Benchmarks Page - Search filter', () => {
  beforeEach(() => {
    initIntercepts({ jobs: [suiteJobWithMlflow1, suiteJobWithMlflow2] });
  });

  it('should filter run rows by evaluation name', () => {
    chooseCompareBenchmarksPage.visit(NAMESPACE, JOB_IDS);

    chooseCompareBenchmarksPage.findSearchInput().type('GPT4');

    // Only suiteJobWithMlflow1 (GPT4_Suite_Eval) should remain
    chooseCompareBenchmarksPage.findRunGroupRow(suiteJobWithMlflow1.resource.id).should('exist');
    chooseCompareBenchmarksPage
      .findRunGroupRow(suiteJobWithMlflow2.resource.id)
      .should('not.exist');
  });
});
/* eslint-enable camelcase */
