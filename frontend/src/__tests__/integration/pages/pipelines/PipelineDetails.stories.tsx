import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { rest } from 'msw';
import { Route, Routes } from 'react-router-dom';
import PipelineDetails from '~/concepts/pipelines/content/pipelinesDetails/pipeline/PipelineDetails';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import {
  buildMockPipelineVersions,
  buildMockPipelineVersion,
} from '~/__mocks__/mockPipelineVersionsProxy';
import { mockPipelinesProxy } from '~/__mocks__/mockPipelinesProxy';
import GlobalPipelineCoreLoader from '~/pages/pipelines/global/GlobalPipelineCoreLoader';
import GlobalPipelineCoreDetails from '~/pages/pipelines/global/GlobalPipelineCoreDetails';
import { mockPipelinesVersionTemplateResourceKF } from '~/__mocks__/mockPipelinesTemplateResourceKF';

const mockPipelineVersions = buildMockPipelineVersions([
  buildMockPipelineVersion({ id: '1', name: 'version-1' }),
  buildMockPipelineVersion({ id: '2', name: 'version-2' }),
  buildMockPipelineVersion({ id: '3', name: 'version-3' }),
]);

export default {
  component: PipelineDetails,
  parameters: {
    reactRouter: {
      routePath: '/pipelines/:namespace/pipeline/view/:pipelineVersionId/*',
      routeParams: {
        namespace: 'test-project',
        pipelineVersionId: mockPipelineVersions.versions[0].id,
      },
    },
    msw: {
      handlers: [
        rest.get('/api/k8s/apis/project.openshift.io/v1/projects', (req, res, ctx) =>
          res(ctx.json(mockK8sResourceList([mockProjectK8sResource({})]))),
        ),
        rest.get(
          '/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/test-project/datasciencepipelinesapplications/pipelines-definition',
          (_req, res, ctx) => res(ctx.json(mockDataSciencePipelineApplicationK8sResource({}))),
        ),
        rest.get(
          '/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/ds-pipeline-pipelines-definition',
          (_req, res, ctx) =>
            res(
              ctx.json(mockRouteK8sResource({ notebookName: 'ds-pipeline-pipelines-definition' })),
            ),
        ),
        rest.get(
          '/api/k8s/api/v1/namespaces/test-project/secrets/ds-pipeline-config',
          (_req, res, ctx) => res(ctx.json(mockSecretK8sResource({ name: 'ds-pipeline-config' }))),
        ),
        rest.get(
          '/api/k8s/api/v1/namespaces/test-project/secrets/aws-connection-testdb',
          (_req, res, ctx) =>
            res(ctx.json(mockSecretK8sResource({ name: 'aws-connection-testdb' }))),
        ),
        rest.post('/api/proxy/apis/v1beta1/pipelines', (req, res, ctx) =>
          res(
            ctx.json({
              ...mockPipelinesProxy,
              pipelines: [
                ...mockPipelinesProxy.pipelines,
                {
                  ...mockPipelinesProxy.pipelines[1],
                  id: mockPipelineVersions.versions[0].resource_references?.[0].key.id,
                },
              ],
            }),
          ),
        ),
        rest.post('/api/proxy/apis/v1beta1/pipelines/:pipeline_id', (req, res, ctx) =>
          res(
            ctx.json({
              ...mockPipelinesProxy.pipelines[1],
              id: mockPipelineVersions.versions[0].resource_references?.[0].key.id,
            }),
          ),
        ),
        rest.post('/api/proxy/apis/v1beta1/pipeline_versions', (_req, res, ctx) =>
          res(ctx.json(mockPipelineVersions)),
        ),
        rest.post('/api/proxy/apis/v1beta1/pipeline_versions/:version_id', (req, res, ctx) => {
          const existingMockPipelineVersion = mockPipelineVersions.versions.find(
            (version) => version.id === req.params.version_id,
          );

          const newMockPipelineVersion = buildMockPipelineVersion({
            name: 'new-upload-version',
            id: 'new-version-id',
          });

          return res(ctx.json(existingMockPipelineVersion || newMockPipelineVersion));
        }),
        rest.post(
          '/api/proxy/apis/v1beta1/pipeline_versions/:version_id/templates',
          (_req, res, ctx) => res(ctx.json(mockPipelinesVersionTemplateResourceKF())),
        ),
      ],
    },
  },
} as Meta<typeof PipelineDetails>;

export const Default: StoryObj = {
  render: () => (
    <Routes>
      <Route
        path="/:namespace?/*"
        element={
          <GlobalPipelineCoreLoader
            title="Test Pipeline"
            getInvalidRedirectPath={(namespace) => `${namespace}/pipeline/`}
          />
        }
      >
        <Route
          path="*"
          element={
            <GlobalPipelineCoreDetails
              BreadcrumbDetailsComponent={PipelineDetails}
              pageName="Runs"
              redirectPath={(namespace) => `${namespace}/pipeline/`}
            />
          }
        />
      </Route>
    </Routes>
  ),
};
