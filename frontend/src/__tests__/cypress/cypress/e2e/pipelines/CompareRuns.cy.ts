/* eslint-disable camelcase */
import {
  buildMockExperimentKF,
  mockDashboardConfig,
  mockDataSciencePipelineApplicationK8sResource,
  mockK8sResourceList,
  buildMockPipelineV2,
  buildMockPipelines,
  buildMockPipelineVersionV2,
  buildMockPipelineVersionsV2,
  mockProjectK8sResource,
  mockRouteK8sResource,
  buildMockRunKF,
} from '~/__mocks__';
import { compareRunsGlobal } from '~/__tests__/cypress/cypress/pages/pipelines/compareRuns';
import { verifyRelativeURL } from '~/__tests__/cypress/cypress/utils/url';
import {
  DataSciencePipelineApplicationModel,
  ProjectModel,
  RouteModel,
} from '~/__tests__/cypress/cypress/utils/models';

const projectName = 'test-project-name';
const initialMockPipeline = buildMockPipelineV2({ display_name: 'Test pipeline' });
const initialMockPipelineVersion = buildMockPipelineVersionV2({
  pipeline_id: initialMockPipeline.pipeline_id,
});
const mockExperiment = buildMockExperimentKF({
  display_name: 'Test experiment 1',
  experiment_id: '1',
});

const mockRun = buildMockRunKF({
  display_name: 'Run 1',
  run_id: 'run-1',
  pipeline_version_reference: {
    pipeline_id: initialMockPipeline.pipeline_id,
    pipeline_version_id: initialMockPipelineVersion.pipeline_version_id,
  },
  experiment_id: mockExperiment.experiment_id,
});

const mockRun2 = buildMockRunKF({
  display_name: 'Run 2',
  run_id: 'run-2',
  pipeline_version_reference: {
    pipeline_id: initialMockPipeline.pipeline_id,
    pipeline_version_id: initialMockPipelineVersion.pipeline_version_id,
  },
  experiment_id: mockExperiment.experiment_id,
});

describe('Compare runs', () => {
  beforeEach(() => {
    initIntercepts();
  });

  it('zero runs in url', () => {
    compareRunsGlobal.visit(projectName, mockExperiment.experiment_id);
    compareRunsGlobal.findInvalidRunsError().should('exist');
  });

  it('valid number of runs', () => {
    compareRunsGlobal.visit(projectName, mockExperiment.experiment_id, [
      mockRun.run_id,
      mockRun2.run_id,
    ]);
    cy.wait('@validRun');
    compareRunsGlobal.findInvalidRunsError().should('not.exist');

    compareRunsGlobal.findRunListRowByName('Run 1').should('exist');
    compareRunsGlobal.findRunListRowByName('Run 2').should('exist');
  });

  it('valid number of runs but it is invalid', () => {
    cy.intercept(
      {
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/runs/invalid_run_id`,
      },
      { statusCode: 404 },
    ).as('invalidRun');
    compareRunsGlobal.visit(projectName, mockExperiment.experiment_id, ['invalid_run_id']);
    cy.wait('@invalidRun');
    compareRunsGlobal.findInvalidRunsError().should('exist');
  });

  it('invalid runs are removed from url', () => {
    cy.intercept(
      {
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/runs/invalid_run_id`,
      },
      { statusCode: 404 },
    ).as('invalidRun');
    compareRunsGlobal.visit(projectName, mockExperiment.experiment_id, [
      'invalid_run_id',
      mockRun.run_id,
    ]);
    cy.wait('@invalidRun');
    cy.wait('@validRun');
    compareRunsGlobal.findInvalidRunsError().should('not.exist');
    verifyRelativeURL(
      `/experiments/${projectName}/${mockExperiment.experiment_id}/compareRuns?runs=${mockRun.run_id}`,
    );
  });

  it('other failed requests dont change the url ', () => {
    const errorRun = {
      error: {
        code: 1, // cancelled
        message: 'Run cancelled by caller',
        details: [],
      },
    };
    cy.intercept(
      {
        pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/runs/invalid_run_id`,
      },
      errorRun,
    ).as('invalidRun');
    compareRunsGlobal.visit(projectName, mockExperiment.experiment_id, [
      'invalid_run_id',
      mockRun.run_id,
    ]);
    cy.wait('@invalidRun');
    cy.wait('@validRun');
    compareRunsGlobal.findInvalidRunsError().should('not.exist');
    verifyRelativeURL(
      `/experiments/${projectName}/${mockExperiment.experiment_id}/compareRuns?runs=invalid_run_id,${mockRun.run_id}`,
    );
  });
});

const initIntercepts = () => {
  cy.interceptOdh('GET /api/config', mockDashboardConfig({ disablePipelineExperiments: false }));
  cy.interceptK8sList(
    DataSciencePipelineApplicationModel,
    mockK8sResourceList([
      mockDataSciencePipelineApplicationK8sResource({ namespace: projectName }),
    ]),
  );
  cy.interceptK8s(
    DataSciencePipelineApplicationModel,
    mockDataSciencePipelineApplicationK8sResource({ namespace: projectName }),
  );
  cy.interceptK8s(
    RouteModel,
    mockRouteK8sResource({
      notebookName: 'ds-pipeline-dspa',
      namespace: projectName,
    }),
  );
  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: projectName, displayName: projectName }),
    ]),
  );

  cy.intercept(
    {
      pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipelines`,
    },
    buildMockPipelines([initialMockPipeline]),
  );

  cy.intercept(
    {
      method: 'POST',
      pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/pipeline_versions`,
    },
    buildMockPipelineVersionsV2([initialMockPipelineVersion]),
  );
  cy.intercept(
    {
      pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/experiments/${mockExperiment.experiment_id}`,
    },
    mockExperiment,
  );
  cy.intercept(
    {
      pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/runs/${mockRun.run_id}`,
    },
    mockRun,
  ).as('validRun');
  cy.intercept(
    {
      pathname: `/api/service/pipelines/${projectName}/dspa/apis/v2beta1/runs/${mockRun2.run_id}`,
    },
    mockRun2,
  );
};
