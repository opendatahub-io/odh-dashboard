/* eslint-disable camelcase */
import { buildMockPipelineVersion } from '@odh-dashboard/internal/__mocks__';
import {
  projectName,
  pipelineId,
  mockActiveRuns,
  mockRecurringRuns,
  initIntercepts,
} from './pipelineRunsTestUtils';

describe('Pipeline runs - redirect from v2 to v3 route', () => {
  beforeEach(() => {
    initIntercepts();
    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
      {
        path: {
          namespace: projectName,
          pipelineId,
          serviceName: 'dspa',
          pipelineVersionId: 'test-version-1',
        },
      },
      buildMockPipelineVersion({
        pipeline_id: pipelineId,
        pipeline_version_id: 'test-version-1',
      }),
    );
    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/runs/:runId',
      {
        path: {
          namespace: projectName,
          serviceName: 'dspa',
          runId: mockActiveRuns[0].run_id,
        },
      },
      mockActiveRuns[0],
    );
    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/recurringruns/:recurringRunId',
      {
        path: {
          namespace: projectName,
          serviceName: 'dspa',
          recurringRunId: mockRecurringRuns[0].recurring_run_id,
        },
      },
      mockRecurringRuns[0],
    );
  });

  it('root', () => {
    cy.visitWithLogin('/pipelineRuns');
    cy.findByTestId('app-page-title').contains('Runs');
    cy.url().should('include', '/develop-train/pipelines/runs');
  });

  it('active', () => {
    cy.visitWithLogin(`/pipelineRuns/${projectName}/runs/active`);
    cy.findByTestId('app-page-title').contains('Runs');
    cy.url().should('include', `/develop-train/pipelines/runs/${projectName}/runs/active`);
  });

  it('archived', () => {
    cy.visitWithLogin(`/pipelineRuns/${projectName}/runs/archived`);
    cy.findByTestId('app-page-title').contains('Runs');
    cy.url().should('include', `/develop-train/pipelines/runs/${projectName}/runs/archived`);
  });

  it('runs create', () => {
    cy.visitWithLogin(`/pipelineRuns/${projectName}/runs/create`);
    cy.findByTestId('app-page-title').contains('Create run');
    cy.url().should('include', `/develop-train/pipelines/runs/${projectName}/runs/create`);
  });

  it('run details', () => {
    cy.visitWithLogin(`/pipelineRuns/${projectName}/runs/${mockActiveRuns[0].run_id}`);
    cy.findByTestId('app-page-title').contains(mockActiveRuns[0].display_name);
    cy.url().should(
      'include',
      `/develop-train/pipelines/runs/${projectName}/runs/${mockActiveRuns[0].run_id}`,
    );
  });

  it('run duplicate', () => {
    cy.visitWithLogin(`/pipelineRuns/${projectName}/runs/duplicate/${mockActiveRuns[0].run_id}`);
    cy.findByTestId('app-page-title').contains('Duplicate run');
    cy.url().should(
      'include',
      `/develop-train/pipelines/runs/${projectName}/runs/duplicate/${mockActiveRuns[0].run_id}`,
    );
  });

  it('schedules', () => {
    cy.visitWithLogin(`/pipelineRuns/${projectName}/schedules`);
    cy.findByTestId('app-page-title').contains('Runs');
    cy.url().should('include', `/develop-train/pipelines/runs/${projectName}/schedules`);
  });

  it('schedules create', () => {
    cy.visitWithLogin(`/pipelineRuns/${projectName}/schedules/create`);
    cy.findByTestId('app-page-title').contains('Create schedule');
    cy.url().should('include', `/develop-train/pipelines/runs/${projectName}/schedules/create`);
  });

  it('schedules duplicate', () => {
    cy.visitWithLogin(
      `/pipelineRuns/${projectName}/schedules/duplicate/${mockRecurringRuns[0].recurring_run_id}`,
    );
    cy.findByTestId('app-page-title').contains('Duplicate schedule');
    cy.url().should(
      'include',
      `/develop-train/pipelines/runs/${projectName}/schedules/duplicate/${mockRecurringRuns[0].recurring_run_id}`,
    );
  });

  it('schedule details', () => {
    cy.visitWithLogin(
      `/pipelineRuns/${projectName}/schedules/${mockRecurringRuns[0].recurring_run_id}`,
    );
    cy.findByTestId('app-page-title').contains(mockRecurringRuns[0].display_name);
    cy.url().should(
      'include',
      `/develop-train/pipelines/runs/${projectName}/schedules/${mockRecurringRuns[0].recurring_run_id}`,
    );
  });
});
