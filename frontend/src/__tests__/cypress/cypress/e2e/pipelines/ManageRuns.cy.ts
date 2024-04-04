/* eslint-disable camelcase */
import {
  buildMockExperimentKF,
  buildMockPipelineV2,
  buildMockPipelineVersionV2,
  buildMockPipelineVersionsV2,
  buildMockPipelines,
  buildMockRunKF,
} from '~/__mocks__';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import {
  manageRunsPage,
  manageRunsTable,
} from '~/__tests__/cypress/cypress/pages/pipelines/manageRuns';
import { configIntercept, dspaIntercepts, projectsIntercept, statusIntercept } from './intercepts';

const projectName = 'test-project-name';
const pipelineVersionId = 'test-version-id';
const pipelineId = 'test-pipeline-id';
const experimentId = 'test-experiment-id';
const initialRunIds = ['test-run-1', 'test-run-2'];

const mockRuns = Array(11)
  .fill(buildMockRunKF())
  .map((mockRun: Partial<PipelineRunKFv2>, index) => ({
    ...mockRun,
    display_name: `Test run ${index + 1}`,
    run_id: `test-run-${index + 1}`,
    experiment_id: experimentId,
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: pipelineVersionId,
    },
  }));

describe('Manage runs', () => {
  beforeEach(() => {
    initIntercepts();
    manageRunsPage.visit(experimentId, projectName, initialRunIds);
  });

  it('renders the page with table data', () => {
    manageRunsTable.getRowByName('Test run 1').find();
  });

  it('has param experiment filter by default', () => {
    cy.findByTestId('experiment-filter-chip').should('have.text', 'Experiment: Default');
  });

  it('has param run IDs checked by default', () => {
    manageRunsTable.getRowByName('Test run 1').findCheckbox().should('be.checked');
    manageRunsTable.getRowByName('Test run 2').findCheckbox().should('be.checked');
  });

  it('maintains selections between page changes', () => {
    manageRunsTable.getRowByName('Test run 1').findCheckbox().should('be.checked');
    manageRunsTable.getRowByName('Test run 2').findCheckbox().should('be.checked');

    cy.findByLabelText('top pagination').find('[data-action="next"]').click();
    cy.findByLabelText('top pagination').find('[data-action="previous"]').click();

    manageRunsTable.getRowByName('Test run 1').findCheckbox().should('be.checked');
    manageRunsTable.getRowByName('Test run 2').findCheckbox().should('be.checked');
  });

  it('navigates back to "Compare runs" page when "Cancel" toolbar action is clicked', () => {
    manageRunsTable.findCancelButton().click();
    cy.location('pathname').should(
      'equal',
      `/experiments/${projectName}/${experimentId}/compareRuns`,
    );
    cy.location('search').should('equal', '?runs=test-run-1,test-run-2');
  });

  it('navigates to "Compare runs" page when "Compare runs" breadcrumb is clicked', () => {
    manageRunsPage.findBreadcrumb().findByRole('link', { name: 'Compare runs' }).click();
    cy.location('pathname').should(
      'equal',
      `/experiments/${projectName}/${experimentId}/compareRuns`,
    );
    cy.location('search').should('equal', '?runs=test-run-1,test-run-2');
  });

  it('navigates to experiment runs page when the experiment name breadcrumb is clicked', () => {
    manageRunsPage.findBreadcrumb().findByRole('link', { name: 'Default' }).click();
    cy.location('pathname').should('equal', `/experiments/${projectName}/${experimentId}/runs`);
  });

  it('navigates to experiment list page when the project name breadcrumb is clicked', () => {
    manageRunsPage
      .findBreadcrumb()
      .findByRole('link', { name: 'Experiments - Test project' })
      .click();
    cy.location('pathname').should('equal', `/experiments/${projectName}`);
  });

  it('navigates to "Compare runs" page with updated run IDs when "Update" toolbar action is clicked', () => {
    cy.intercept(
      {
        method: 'POST',
        pathname: '/api/proxy/apis/v2beta1/runs/test-run-3',
      },
      mockRuns[2],
    );

    manageRunsTable.getRowByName('Test run 3').findCheckbox().click();
    manageRunsTable.findUpdateButton().click();
    cy.location('pathname').should(
      'equal',
      `/experiments/${projectName}/${experimentId}/compareRuns`,
    );
    cy.location('search').should('equal', '?runs=test-run-1,test-run-2,test-run-3');
  });
});

const initIntercepts = () => {
  statusIntercept();
  configIntercept();
  dspaIntercepts(projectName);
  projectsIntercept([{ k8sName: projectName, displayName: 'Test project' }]);

  cy.intercept(
    {
      pathname: '/api/proxy/apis/v2beta1/pipelines',
    },
    buildMockPipelines([buildMockPipelineV2({ pipeline_id: pipelineId })]),
  );

  const mockPipelineVersion = buildMockPipelineVersionV2({
    pipeline_version_id: pipelineVersionId,
    pipeline_id: pipelineId,
  });

  cy.intercept(
    {
      method: 'POST',
      pathname: `/api/proxy/apis/v2beta1/pipelines/${pipelineId}/versions`,
    },
    buildMockPipelineVersionsV2([mockPipelineVersion]),
  );

  cy.intercept(
    {
      method: 'POST',
      pathname: `/api/proxy/apis/v2beta1/experiments/${experimentId}`,
    },
    buildMockExperimentKF({ experiment_id: experimentId }),
  );

  initialRunIds.forEach((selectedRunId) => {
    cy.intercept(
      {
        method: 'POST',
        pathname: `/api/proxy/apis/v2beta1/runs/${selectedRunId}`,
      },
      mockRuns.find((mockRun) => mockRun.run_id === selectedRunId),
    );
  });

  cy.intercept(
    {
      method: 'POST',
      pathname: '/api/proxy/apis/v2beta1/runs',
    },
    {
      runs: mockRuns,
      total_size: mockRuns.length,
      next_page_token: 'page-2-token',
    },
  );
};
