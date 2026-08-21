/* eslint-disable camelcase */
import startCase from 'lodash-es/startCase';
import {
  PluginStateKF,
  RuntimeStateKF,
  StorageStateKF,
} from '@odh-dashboard/internal/concepts/pipelines/kfTypes';
import { mockK8sResourceList } from '@odh-dashboard/k8s-core/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '@odh-dashboard/k8s-core/__mocks__/mockProjectK8sResource';
import {
  buildMockRunKF,
  buildMockPipelineVersions,
  buildMockPipelineVersion,
  buildMockPipelines,
  buildMockPipeline,
  buildMockExperimentKF,
  buildMockRecurringRunKF,
  buildMockExperiments,
} from '@odh-dashboard/internal/__mocks__';
import {
  mockedArtifactsResponse,
  mockGetArtifactsResponse,
} from '@odh-dashboard/internal/__mocks__/mlmd/mockGetArtifacts';
import { ProjectModel } from '../../../../utils/models';
import { dspaIntercepts } from '../intercepts';

export const projectName = 'test-project-filters';
export const pipelineId = 'test-pipeline';
export const pipelineVersionId = 'test-version';

export const mockActiveRuns = [
  buildMockRunKF({
    display_name: 'Test active run 1',
    run_id: 'run-1',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-1',
    },
    experiment_id: 'test-experiment-1',
    created_at: '2024-02-01T00:00:00Z',
    state: RuntimeStateKF.RUNNING,
    plugins_output: {
      mlflow: {
        entries: {
          experiment_id: { value: '6' },
          experiment_name: { value: 'mlflow-exp-1' },
          root_run_id: { value: 'mlflow-run-aaa' },
        },
        state: PluginStateKF.PLUGIN_SUCCEEDED,
      },
    },
  }),
  buildMockRunKF({
    display_name: 'Test active run 2',
    run_id: 'run-2',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-2',
    },
    experiment_id: 'test-experiment-3',
    created_at: '2024-02-05T00:00:00Z',
    state: RuntimeStateKF.SUCCEEDED,
    plugins_output: {
      mlflow: {
        entries: {
          experiment_id: { value: '14' },
          experiment_name: { value: 'mlflow-exp-2' },
          root_run_id: { value: 'mlflow-run-bbb' },
        },
        state: PluginStateKF.PLUGIN_SUCCEEDED,
      },
    },
  }),
  buildMockRunKF({
    display_name: 'Test active run 3',
    run_id: 'run-3',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-2',
    },
    experiment_id: 'test-experiment-1',
    created_at: '2024-02-10T00:00:00Z',
    state: RuntimeStateKF.PENDING,
    plugins_output: {
      mlflow: {
        entries: {
          experiment_id: { value: '6' },
          experiment_name: { value: 'mlflow-exp-1' },
          root_run_id: { value: 'mlflow-run-ccc' },
        },
        state: PluginStateKF.PLUGIN_SUCCEEDED,
      },
    },
  }),
];

export const mockArchivedRuns = [
  buildMockRunKF({
    display_name: 'Test archived run 1',
    run_id: 'archived-run-1',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-1',
    },
    experiment_id: 'test-experiment-1',
    created_at: '2024-02-05T00:00:00Z',
    state: RuntimeStateKF.SUCCEEDED,
  }),
  buildMockRunKF({
    display_name: 'Test archived run 2',
    run_id: 'archived-run-2',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-2',
    },
    experiment_id: 'test-experiment-3',
    created_at: '2024-02-20T00:00:00Z',
    state: RuntimeStateKF.SUCCEEDED,
  }),
];

export const mockArchivedRunsWithArchivedExperiments = [
  buildMockRunKF({
    display_name: 'experiment archived run 1',
    run_id: 'run-1',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-1',
    },
    experiment_id: 'test-experiment-1',
    created_at: '2024-02-05T00:00:00Z',
    state: RuntimeStateKF.SUCCEEDED,
  }),
  buildMockRunKF({
    display_name: 'experiment archived run 2',
    run_id: 'run-2',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-2',
    },
    experiment_id: 'test-experiment-2',
    created_at: '2024-02-20T00:00:00Z',
    state: RuntimeStateKF.SUCCEEDED,
  }),
];

const mockExperimentIds = [
  ...new Set(
    [...mockActiveRuns, ...mockArchivedRuns, ...mockArchivedRunsWithArchivedExperiments].map(
      (mockRun) => mockRun.experiment_id,
    ),
  ),
];
const mockVersionIds = [
  ...new Set(
    mockActiveRuns.map((mockRun) => mockRun.pipeline_version_reference?.pipeline_version_id),
  ),
];
export const mockExperiments = mockExperimentIds.map((experimentId) =>
  buildMockExperimentKF({
    experiment_id: experimentId,
    display_name: startCase(experimentId),
  }),
);

export const mockVersions = mockVersionIds.map((versionId) =>
  buildMockPipelineVersion({
    pipeline_id: pipelineId,
    pipeline_version_id: versionId,
    display_name: startCase(versionId),
  }),
);

export const mockRecurringRuns = [
  buildMockRecurringRunKF({
    display_name: 'test-pipeline',
    recurring_run_id: 'test-pipeline',
    experiment_id: 'test-experiment-1',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-1',
    },
  }),
  buildMockRecurringRunKF({
    display_name: 'other-pipeline',
    recurring_run_id: 'other-test-pipeline',
    experiment_id: 'test-experiment-2',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-2',
    },
  }),
  buildMockRecurringRunKF({
    display_name: 'another-pipeline',
    recurring_run_id: 'another-test-pipeline',
    experiment_id: 'test-experiment-1',
    pipeline_version_reference: {
      pipeline_id: pipelineId,
      pipeline_version_id: 'test-version-2',
    },
  }),
];

export const initIntercepts = (): void => {
  dspaIntercepts(projectName);

  cy.interceptK8sList(
    ProjectModel,
    mockK8sResourceList([
      mockProjectK8sResource({ k8sName: projectName, displayName: 'Test project' }),
    ]),
  );

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
    {
      path: { namespace: projectName, serviceName: 'dspa' },
    },
    buildMockPipelines([buildMockPipeline({ pipeline_id: pipelineId })]),
  );

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineId,
      },
    },
    buildMockPipeline({
      pipeline_id: pipelineId,
    }),
  );

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
    { path: { namespace: projectName, serviceName: 'dspa', pipelineId } },
    buildMockPipelineVersions(mockVersions),
  );
  mockVersions.forEach((version) => {
    cy.interceptOdh(
      'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
      {
        path: {
          namespace: projectName,
          serviceName: 'dspa',
          pipelineId,
          pipelineVersionId: version.pipeline_version_id,
        },
      },
      version,
    );
  });
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/experiments',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
      },
    },
    buildMockExperiments([
      ...mockExperiments.map((e) =>
        e.experiment_id === 'test-experiment-2'
          ? { ...e, storage_state: StorageStateKF.ARCHIVED }
          : e,
      ),
    ]),
  );

  cy.interceptOdh(
    'POST /api/service/mlmd/:namespace/:serviceName/ml_metadata.MetadataStoreService/GetArtifacts',
    { path: { namespace: projectName, serviceName: 'dspa' } },
    mockGetArtifactsResponse({
      artifacts: mockedArtifactsResponse.artifacts.filter((mockArtifact) => mockArtifact.id === 8),
    }),
  );
};
