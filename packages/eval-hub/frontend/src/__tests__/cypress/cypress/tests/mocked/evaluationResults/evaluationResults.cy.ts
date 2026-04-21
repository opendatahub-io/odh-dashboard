/* eslint-disable camelcase */
import type { Namespace } from 'mod-arch-core';
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import {
  mockSingleEvaluationJob,
  mockCollectionEvaluationJob,
} from '~/__mocks__/mockEvaluationJob';
import { evaluationResultsPage } from '~/__tests__/cypress/cypress/pages/evaluationResults';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';
import type { EvaluationJob } from '~/app/types';

const NAMESPACE = 'test-namespace';

type HandlersProps = {
  namespaces?: Namespace[];
  job?: EvaluationJob;
};

const initIntercepts = ({
  namespaces = [mockNamespace({ name: NAMESPACE })],
  job,
}: HandlersProps = {}) => {
  cy.interceptApi(
    'GET /api/:apiVersion/user',
    { path: { apiVersion: CLIENT_API_VERSION } },
    mockUserSettings({ userId: 'test-user' }),
  );

  cy.interceptApi(
    'GET /api/:apiVersion/namespaces',
    { path: { apiVersion: CLIENT_API_VERSION } },
    namespaces,
  );

  if (job) {
    cy.interceptApi(
      'GET /api/:apiVersion/evaluations/jobs/:jobId',
      { path: { apiVersion: CLIENT_API_VERSION, jobId: job.resource.id } },
      job,
    );
  }
};

describe('Evaluation Results Page - Single Benchmark', () => {
  const singleJob = mockSingleEvaluationJob();

  beforeEach(() => {
    initIntercepts({ job: singleJob });
  });

  it('should display evaluation name and metadata', () => {
    evaluationResultsPage.visit(NAMESPACE, singleJob.resource.id);
    evaluationResultsPage.findTitle().should('contain.text', 'ToxicityDetect_Eval_Claude');
    evaluationResultsPage.findMetadata().should('exist');
    evaluationResultsPage.findMetadata().should('contain.text', 'claude-3-opus');
  });

  it('should display evaluation score', () => {
    evaluationResultsPage.visit(NAMESPACE, singleJob.resource.id);
    evaluationResultsPage.findScoreValue().should('contain.text', '30%');
  });

  it('should display benchmark details with primary metric and threshold', () => {
    evaluationResultsPage.visit(NAMESPACE, singleJob.resource.id);
    evaluationResultsPage.findBenchmarkDetails('harmful_request_refusal', 0).should('exist');
    evaluationResultsPage.findBenchmarkDetailsInfo().should('exist');
  });

  it('should not display benchmarks grid for single evaluation', () => {
    evaluationResultsPage.visit(NAMESPACE, singleJob.resource.id);
    evaluationResultsPage.findBenchmarksGrid().should('not.exist');
  });
});

describe('Evaluation Results Page - Collection', () => {
  const collectionJob = mockCollectionEvaluationJob();

  beforeEach(() => {
    initIntercepts({ job: collectionJob });
  });

  it('should display evaluation name and overall score', () => {
    evaluationResultsPage.visit(NAMESPACE, collectionJob.resource.id);
    evaluationResultsPage.findTitle().should('contain.text', 'ToxicityDet_Claude');
    evaluationResultsPage.findScoreValue().should('contain.text', '72%');
  });

  it('should display benchmark cards grid', () => {
    evaluationResultsPage.visit(NAMESPACE, collectionJob.resource.id);
    evaluationResultsPage.findBenchmarksGrid().should('exist');
    evaluationResultsPage.findBenchmarkCard('harmful_request_refusal').should('exist');
    evaluationResultsPage.findBenchmarkCard('truthfulqa_mc1').should('exist');
    evaluationResultsPage.findBenchmarkCard('toxigen').should('exist');
  });

  it('should show pass/fail labels on benchmark cards', () => {
    evaluationResultsPage.visit(NAMESPACE, collectionJob.resource.id);
    evaluationResultsPage
      .findBenchmarkPassLabel('harmful_request_refusal')
      .should('contain.text', 'Pass');
    evaluationResultsPage.findBenchmarkPassLabel('toxicity_risk').should('contain.text', 'Fail');
  });

  it('should show view more button when benchmarks exceed default visible count', () => {
    evaluationResultsPage.visit(NAMESPACE, collectionJob.resource.id);
    evaluationResultsPage.findViewMoreButton().should('exist');
    evaluationResultsPage.findViewMoreButton().should('contain.text', 'View more (4)');
  });

  it('should expand to show all benchmarks when clicking view more', () => {
    evaluationResultsPage.visit(NAMESPACE, collectionJob.resource.id);
    evaluationResultsPage.findViewMoreButton().click();
    evaluationResultsPage.findBenchmarkCard('adversarial_robustness').should('exist');
    evaluationResultsPage.findBenchmarkCard('truthfulqa_gen').should('exist');
    evaluationResultsPage.findViewMoreButton().should('not.exist');
  });

  it('should show benchmark details when clicking a card', () => {
    evaluationResultsPage.visit(NAMESPACE, collectionJob.resource.id);
    evaluationResultsPage.findBenchmarkCard('truthfulqa_mc1').click();
    evaluationResultsPage.findBenchmarkDetails('truthfulqa_mc1', 0).should('exist');
  });
});
