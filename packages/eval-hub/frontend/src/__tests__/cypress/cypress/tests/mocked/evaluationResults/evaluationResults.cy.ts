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

const initLogIntercepts = (jobId: string, truncated: boolean) => {
  cy.intercept(
    {
      method: 'GET',
      pathname: `/eval-hub/api/${CLIENT_API_VERSION}/evaluations/jobs/${jobId}/logs`,
    },
    (request) => {
      request.reply({
        statusCode: 200,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'x-log-truncated': request.query.tail_lines === '-1' ? String(truncated) : 'false',
        },
        body: '2026-03-01 09:00:00 - main - INFO - Evaluation log output',
      });
    },
  ).as('jobLogs');

  cy.intercept(
    {
      method: 'GET',
      pathname: `/eval-hub/api/${CLIENT_API_VERSION}/evaluations/jobs/${jobId}/benchmarks/0/logs`,
    },
    (request) => {
      request.reply({
        statusCode: 200,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'x-log-truncated': request.query.tail_lines === '-1' ? String(truncated) : 'false',
        },
        body: '2026-03-01 09:00:00 - benchmark - INFO - Benchmark log output',
      });
    },
  ).as('benchmarkLogs');
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
  collectionJob.status.benchmarks = collectionJob.benchmarks.map((benchmark, index) => ({
    id: benchmark.id,
    // eslint-disable-next-line camelcase
    benchmark_index: index,
    status: 'completed',
  }));

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
    evaluationResultsPage.findBenchmarkCard('harmful_request_refusal', 0).should('exist');
    evaluationResultsPage.findBenchmarkCard('truthfulqa_mc1', 1).should('exist');
    evaluationResultsPage.findBenchmarkCard('toxigen', 2).should('exist');
  });

  it('should show pass/fail labels on benchmark cards', () => {
    evaluationResultsPage.visit(NAMESPACE, collectionJob.resource.id);
    evaluationResultsPage
      .findBenchmarkPassLabel('harmful_request_refusal', 0)
      .should('contain.text', 'Pass');
    evaluationResultsPage.findBenchmarkPassLabel('toxicity_risk', 3).should('contain.text', 'Fail');
  });

  it('should show view more button when benchmarks exceed default visible count', () => {
    evaluationResultsPage.visit(NAMESPACE, collectionJob.resource.id);
    evaluationResultsPage.findViewMoreButton().should('exist');
    evaluationResultsPage.findViewMoreButton().should('contain.text', 'View more (4)');
  });

  it('should expand to show all benchmarks when clicking view more', () => {
    evaluationResultsPage.visit(NAMESPACE, collectionJob.resource.id);
    evaluationResultsPage.findViewMoreButton().click();
    evaluationResultsPage.findBenchmarkCard('adversarial_robustness', 6).should('exist');
    evaluationResultsPage.findBenchmarkCard('truthfulqa_gen', 7).should('exist');
    evaluationResultsPage.findViewMoreButton().should('not.exist');
  });

  it('should show benchmark details when clicking a card', () => {
    evaluationResultsPage.visit(NAMESPACE, collectionJob.resource.id);
    evaluationResultsPage.findBenchmarkCard('truthfulqa_mc1', 1).click();
    evaluationResultsPage.findBenchmarkDetails('truthfulqa_mc1', 1).should('exist');
  });

  it('should download all job logs without warning when the response is complete', () => {
    initLogIntercepts(collectionJob.resource.id, false);
    evaluationResultsPage.visit(NAMESPACE, collectionJob.resource.id);
    evaluationResultsPage.findViewLogButton().click();
    evaluationResultsPage.findEventLogModal().should('exist');
    cy.wait('@jobLogs').its('request.query.tail_lines').should('eq', '500');

    evaluationResultsPage.findDownloadLogsButton().click();
    cy.wait('@jobLogs').its('request.query.tail_lines').should('eq', '-1');
    cy.findByText('Log download truncated').should('not.exist');
  });

  it('should download benchmark logs and warn when the response is truncated', () => {
    initLogIntercepts(collectionJob.resource.id, true);
    evaluationResultsPage.visit(NAMESPACE, collectionJob.resource.id);
    evaluationResultsPage.findViewLogButton().click();
    evaluationResultsPage.findEventLogModal().should('exist');
    cy.wait('@jobLogs').its('request.query.tail_lines').should('eq', '500');

    evaluationResultsPage.findBenchmarkLogSelector().click();
    evaluationResultsPage.findBenchmarkLogOption('harmful_request_refusal').click();
    cy.wait('@benchmarkLogs').its('request.query.tail_lines').should('eq', '500');
    evaluationResultsPage.findDownloadLogsButton().click();
    cy.wait('@benchmarkLogs').its('request.query.tail_lines').should('eq', '-1');
    cy.findByText('Log download truncated').should('be.visible');
  });
});
