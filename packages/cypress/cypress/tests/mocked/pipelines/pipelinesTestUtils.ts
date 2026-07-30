/* eslint-disable camelcase */
import {
  mockDataSciencePipelineApplicationK8sResource,
  mockK8sResourceList,
  buildMockPipeline,
  buildMockPipelines,
  buildMockPipelineVersion,
  buildMockPipelineVersions,
  mockProjectK8sResource,
  mockRouteK8sResource,
  mockSuccessGoogleRpcStatus,
} from '@odh-dashboard/internal/__mocks__';
import type {
  PipelineKF,
  PipelineVersionKF,
} from '@odh-dashboard/internal/concepts/pipelines/kfTypes';
import type { DSPipelineAPIServerStore } from '@odh-dashboard/internal/k8sTypes.ts';
import {
  DataSciencePipelineApplicationModel,
  ProjectModel,
  RouteModel,
} from '../../../utils/models';

export const projectName = 'test-project-name';
export const initialMockPipeline = buildMockPipeline({ display_name: 'Test pipeline' });
export const initialMockPipelineVersion = buildMockPipelineVersion({
  pipeline_id: initialMockPipeline.pipeline_id,
});

export type HandlersProps = {
  isEmpty?: boolean;
  mockPipelines?: PipelineKF[];
  mockPipelineVersions?: PipelineVersionKF[];
  hasNoPipelineVersions?: boolean;
  totalSize?: number;
  errorMessage?: string;
  initializing?: boolean;
  nextPageToken?: string | undefined;
  pipelineStore?: DSPipelineAPIServerStore;
};

export const initIntercepts = ({
  isEmpty = false,
  mockPipelines = [initialMockPipeline],
  mockPipelineVersions = [initialMockPipelineVersion],
  hasNoPipelineVersions = false,
  initializing,
  errorMessage,
  totalSize = mockPipelines.length,
  nextPageToken,
  pipelineStore,
}: HandlersProps): void => {
  cy.interceptK8sList(
    isEmpty
      ? { model: DataSciencePipelineApplicationModel, ns: projectName }
      : DataSciencePipelineApplicationModel,
    mockK8sResourceList(
      isEmpty
        ? []
        : [
            mockDataSciencePipelineApplicationK8sResource({
              namespace: projectName,
            }),
          ],
    ),
  );
  cy.interceptK8s(
    DataSciencePipelineApplicationModel,
    mockDataSciencePipelineApplicationK8sResource({
      namespace: projectName,
      dspaSecretName: 'aws-connection-test',
      initializing,
      message: errorMessage,
      pipelineStore,
    }),
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
      mockProjectK8sResource({ k8sName: projectName }),
      mockProjectK8sResource({ k8sName: `${projectName}-2`, displayName: 'Test Project 2' }),
    ]),
  );

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines',
    {
      path: { namespace: projectName, serviceName: 'dspa' },
    },
    buildMockPipelines(mockPipelines, totalSize, nextPageToken),
  ).as('getPipelines');

  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineId: initialMockPipeline.pipeline_id,
      },
    },
    hasNoPipelineVersions ? {} : buildMockPipelineVersions(mockPipelineVersions),
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineId: initialMockPipeline.pipeline_id,
      },
    },
    initialMockPipeline,
  );
  cy.interceptOdh(
    'GET /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
    {
      path: {
        namespace: projectName,
        serviceName: 'dspa',
        pipelineId: initialMockPipeline.pipeline_id,
        pipelineVersionId: initialMockPipelineVersion.pipeline_version_id,
      },
    },
    initialMockPipelineVersion,
  );
};

export const createDeleteVersionIntercept = (
  pipelineId: string,
  pipelineVersionId: string,
): Cypress.Chainable<null> =>
  cy.interceptOdh(
    'DELETE /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId/versions/:pipelineVersionId',
    {
      path: { namespace: projectName, serviceName: 'dspa', pipelineId, pipelineVersionId },
      times: 1,
    },
    mockSuccessGoogleRpcStatus({}),
  );

export const createDeletePipelineIntercept = (pipelineId: string): Cypress.Chainable<null> =>
  cy.interceptOdh(
    'DELETE /api/service/pipelines/:namespace/:serviceName/apis/v2beta1/pipelines/:pipelineId',
    {
      path: { namespace: projectName, serviceName: 'dspa', pipelineId },
      times: 1,
    },
    mockSuccessGoogleRpcStatus({}),
  );
