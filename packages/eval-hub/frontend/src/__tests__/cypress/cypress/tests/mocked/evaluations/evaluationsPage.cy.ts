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
    evaluationsPage.visit(NAMESPACE);
    evaluationsPage.findEvaluationsTable().should('exist');
    evaluationsPage.findEvaluationRow(0).should('exist');
    evaluationsPage.findEvaluationRow(1).should('exist');
    evaluationsPage.findEvaluationRow(2).should('exist');
  });

  it('should show a link to results on completed evaluations', () => {
    evaluationsPage.visit(NAMESPACE);
    // Table sorts by date desc: row 0 = running (Mar 16), row 1 = completed (Mar 15)
    evaluationsPage.findEvaluationLink(1).should('exist');
    evaluationsPage.findEvaluationLink(1).click();
    cy.url().should('include', `/results/${completedJob.resource.id}`);
  });

  it('should display the toolbar with filter and create button', () => {
    evaluationsPage.visit(NAMESPACE);
    evaluationsPage.findEvaluationsTableToolbar().should('exist');
    evaluationsPage.findFilterTypeToggle().should('exist');
    evaluationsPage.findFilterTextField().should('exist');
    evaluationsPage.findCreateEvaluationButton().should('exist');
  });
});

describe('Evaluations Page - Empty state', () => {
  beforeEach(() => {
    initIntercepts({ jobs: [] });
  });

  it('should display the empty state when no evaluations exist', () => {
    evaluationsPage.visit(NAMESPACE);
    evaluationsPage.findEmptyState().should('exist');
    evaluationsPage
      .findEmptyStateBody()
      .should(
        'contain.text',
        'Start an evaluation run, or select a different project to view its runs.',
      );
  });

  it('should navigate to create when clicking the empty state action', () => {
    evaluationsPage.visit(NAMESPACE);
    evaluationsPage.findCreateEvaluationButton().click();
    cy.url().should('include', `${NAMESPACE}/create`);
  });
});

describe('Evaluations Page - Unavailable (unhealthy)', () => {
  beforeEach(() => {
    initIntercepts({ health: mockEvalHubHealth({ available: false }) });
  });

  it('should display the evaluations unavailable state', () => {
    evaluationsPage.visit(NAMESPACE);
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
/* eslint-enable camelcase */
