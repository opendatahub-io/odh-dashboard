/* eslint-disable camelcase */
import { mockNamespace } from '~/__mocks__/mockNamespace';
import { mockUserSettings } from '~/__mocks__/mockUserSettings';
import { mockEvaluationJob } from '~/__mocks__/mockEvaluationJob';
import { mockEvalHubHealth } from '~/__mocks__/mockEvalHubHealth';
import { mockKueueAvailability } from '~/__mocks__/mockKueueAvailability';
import { mockCollectionsListResponse } from '~/__mocks__/mockCollection';
import { evaluationsPage } from '~/__tests__/cypress/cypress/pages/evaluationsPage';
import { captureTracking, expectSafeTracking } from '~/__tests__/cypress/cypress/utils/analytics';
import { CLIENT_API_VERSION } from '~/__tests__/cypress/cypress/support/commands/api';

describe('Evaluation failure tracking', () => {
  [
    { code: 'evaluation_job_updated', expected: 'evaluation_job_updated' },
    { code: undefined, expected: 'unknown_error' },
    { code: 'review-secret-resource-95482', expected: 'unknown_error' },
  ].forEach(({ code, expected }) => {
    it(`should preserve the UI diagnostic and track ${expected}`, () => {
      const namespace = 'test-namespace';
      const options = { path: { apiVersion: CLIENT_API_VERSION } };
      const marker = 'review-secret-resource-95482';
      cy.interceptApi('GET /api/:apiVersion/user', options, mockUserSettings({}));
      cy.interceptApi('GET /api/:apiVersion/namespaces', options, [
        mockNamespace({ name: namespace }),
      ]);
      cy.interceptApi('GET /api/:apiVersion/evalhub/health', options, mockEvalHubHealth()).as(
        'evalHubHealth',
      );
      cy.interceptApi('GET /api/:apiVersion/evaluations/providers', options, []);
      cy.interceptApi(
        'GET /api/:apiVersion/evaluations/collections',
        options,
        mockCollectionsListResponse([]),
      );
      cy.interceptApi('GET /api/:apiVersion/kueue/availability', options, mockKueueAvailability());
      cy.interceptApi('GET /api/:apiVersion/evaluations/jobs', options, [
        mockEvaluationJob({ state: 'running', name: 'Review evaluation' }),
      ]).as('evalHubJobs');
      cy.interceptApi(
        'GET /api/:apiVersion/evaluations/jobs/:jobId',
        { path: { ...options.path, jobId: 'eval-job-001' } },
        mockEvaluationJob({ state: 'running', name: 'Review evaluation' }),
      );

      evaluationsPage.visitRuns(namespace);
      evaluationsPage.findStatusLabel(0).should('contain.text', 'Running');
      captureTracking();
      cy.interceptApi('GET /api/:apiVersion/evaluations/jobs', options, [
        mockEvaluationJob({
          state: 'failed',
          name: 'Review evaluation',
          statusMessage: marker,
          statusMessageCode: code,
        }),
      ]).as('failedPoll');
      cy.interceptApi(
        'GET /api/:apiVersion/evaluations/jobs/:jobId',
        { path: { ...options.path, jobId: 'eval-job-001' } },
        mockEvaluationJob({
          state: 'failed',
          name: 'Review evaluation',
          statusMessage: marker,
          statusMessageCode: code,
        }),
      );
      // POLL_INTERVAL is effectively disabled in the cypress server build, but this wait
      // succeeds because useFetchState refires on visibility/health-readiness changes.
      cy.wait('@failedPoll', { timeout: 45000 });
      expectSafeTracking('Evaluations Evaluation Completed', { error: expected }, marker);
      evaluationsPage.clickStatusBadge(0);
      evaluationsPage.findStatusModal().should('contain.text', marker);
    });
  });
});
