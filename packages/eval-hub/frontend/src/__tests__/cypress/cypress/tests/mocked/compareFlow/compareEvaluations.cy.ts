/* eslint-disable camelcase */
import type { Namespace } from 'mod-arch-core';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockEvaluationJob } from '~/__mocks__/mockEvaluationJob';
import { mockEvalHubHealth } from '~/__mocks__/mockEvalHubHealth';
import { mockCollectionsListResponse } from '~/__mocks__/mockCollection';
import { evaluationsPage } from '~/__tests__/cypress/cypress/pages/evaluationsPage';
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

// Two completed single-benchmark jobs with mlflow IDs so buildDefaultComparableRunsFromJobs
// can produce 2 comparable runs and trigger navigation to /compare-runs.
const singleBenchmarkJob1 = mockEvaluationJob({
  id: 'eval-single-1',
  name: 'GPT4_Eval',
  state: 'completed',
  createdAt: '2026-04-15T10:00:00Z',
  benchmarkIds: ['truthfulqa_mc1'],
  providerId: 'lm_evaluation_harness',
  mlflowExperimentId: 'experiment-single-1',
  benchmarkResults: [
    {
      id: 'truthfulqa_mc1',
      provider_id: 'lm_evaluation_harness',
      mlflow_run_id: 'run-single-1',
      metrics: {},
      test: { primary_score: 0.85, threshold: 0.7, pass: true },
    },
  ],
});

const singleBenchmarkJob2 = mockEvaluationJob({
  id: 'eval-single-2',
  name: 'Claude_Eval',
  state: 'completed',
  createdAt: '2026-04-14T10:00:00Z',
  benchmarkIds: ['truthfulqa_mc1'],
  providerId: 'lm_evaluation_harness',
  mlflowExperimentId: 'experiment-single-2',
  benchmarkResults: [
    {
      id: 'truthfulqa_mc1',
      provider_id: 'lm_evaluation_harness',
      mlflow_run_id: 'run-single-2',
      metrics: {},
      test: { primary_score: 0.78, threshold: 0.7, pass: true },
    },
  ],
});

// A running job — not comparable (checkbox should be disabled)
const runningJob = mockEvaluationJob({
  id: 'eval-running-1',
  name: 'Llama_Running_Eval',
  state: 'running',
  createdAt: '2026-04-13T10:00:00Z',
  benchmarkIds: ['hellaswag'],
  providerId: 'lm_evaluation_harness',
});

// Two completed suite runs (multiple benchmarks) — will route to /compare-runs/benchmarks
const suiteJob1 = mockEvaluationJob({
  id: 'eval-suite-1',
  name: 'Suite_GPT4_Eval',
  state: 'completed',
  createdAt: '2026-04-15T10:00:00Z',
  benchmarkIds: ['bench-a', 'bench-b'],
  providerId: 'lm_evaluation_harness',
});

const suiteJob2 = mockEvaluationJob({
  id: 'eval-suite-2',
  name: 'Suite_Claude_Eval',
  state: 'completed',
  createdAt: '2026-04-14T10:00:00Z',
  benchmarkIds: ['bench-a', 'bench-b'],
  providerId: 'lm_evaluation_harness',
});

describe('Evaluations Page - Compare button state', () => {
  it('should be disabled when no runs are selected', () => {
    initIntercepts({ jobs: [singleBenchmarkJob1, singleBenchmarkJob2] });
    evaluationsPage.visit(NAMESPACE);
    evaluationsPage.findCompareButton().should('be.disabled');
  });

  it('should remain disabled with only one run selected', () => {
    initIntercepts({ jobs: [singleBenchmarkJob1, singleBenchmarkJob2] });
    evaluationsPage.visit(NAMESPACE);
    // Date-desc sort: job1 (Apr 15) is row 0, job2 (Apr 14) is row 1
    evaluationsPage.findEvaluationCheckbox(0).click();
    evaluationsPage.findCompareButton().should('be.disabled');
  });
});

describe('Evaluations Page - Compare routing', () => {
  it('should route to compare-runs for two single-benchmark runs', () => {
    initIntercepts({ jobs: [singleBenchmarkJob1, singleBenchmarkJob2] });
    evaluationsPage.visit(NAMESPACE);
    evaluationsPage.findEvaluationCheckbox(0).click();
    evaluationsPage.findEvaluationCheckbox(1).click();
    evaluationsPage.findCompareButton().should('not.be.disabled');
    evaluationsPage.findCompareButton().click();
    cy.url().should('include', `${NAMESPACE}/compare-runs`);
    cy.url().should('not.include', 'benchmarks');
  });

  it('should route to compare-runs/benchmarks for suite runs', () => {
    initIntercepts({ jobs: [suiteJob1, suiteJob2] });
    evaluationsPage.visit(NAMESPACE);
    // Date-desc sort: suiteJob1 (Apr 15) is row 0, suiteJob2 (Apr 14) is row 1
    evaluationsPage.findEvaluationCheckbox(0).click();
    evaluationsPage.findEvaluationCheckbox(1).click();
    evaluationsPage.findCompareButton().should('not.be.disabled');
    evaluationsPage.findCompareButton().click();
    cy.url().should('include', `${NAMESPACE}/compare-runs/benchmarks`);
  });
});

describe('Evaluations Page - Non-comparable rows', () => {
  it('should have a disabled checkbox for a running run', () => {
    initIntercepts({ jobs: [singleBenchmarkJob1, runningJob] });
    evaluationsPage.visit(NAMESPACE);
    // Date-desc sort: singleBenchmarkJob1 (Apr 15) is row 0, runningJob (Apr 13) is row 1.
    // PF v6 Checkbox spreads data-testid onto <input> directly — assert disabled on the element itself.
    evaluationsPage.findEvaluationCheckbox(1).should('be.disabled');
  });
});
/* eslint-enable camelcase */
