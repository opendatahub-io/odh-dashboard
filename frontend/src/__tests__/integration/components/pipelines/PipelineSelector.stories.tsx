import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { userEvent, within } from '@storybook/testing-library';
import { rest } from 'msw';
import PipelineSelector from '~/concepts/pipelines/content/pipelineSelector/PipelineSelector';
import {
  mockPipelineVersionsListPage1,
  mockPipelineVersionsListPage2,
  mockPipelineVersionsListSearch,
} from '~/__mocks__/mockPipelineVersionsProxy';
import PipelineVersionSelector from '~/concepts/pipelines/content/pipelineSelector/PipelineVersionSelector';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { PipelineContextProvider } from '~/concepts/pipelines/context';
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';

export default {
  component: PipelineSelector,
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/k8s/apis/project.openshift.io/v1/projects', (req, res, ctx) =>
          res(ctx.json(mockK8sResourceList([mockProjectK8sResource({})]))),
        ),
        rest.get(
          '/api/k8s/apis/datasciencepipelinesapplications.opendatahub.io/v1alpha1/namespaces/test-project/datasciencepipelinesapplications/pipelines-definition',
          (req, res, ctx) => res(ctx.json(mockDataSciencePipelineApplicationK8sResource({}))),
        ),
        rest.get(
          '/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/ds-pipeline-pipelines-definition',
          (req, res, ctx) =>
            res(
              ctx.json(mockRouteK8sResource({ notebookName: 'ds-pipeline-pipelines-definition' })),
            ),
        ),
        rest.get(
          '/api/k8s/api/v1/namespaces/test-project/secrets/ds-pipeline-config',
          (req, res, ctx) => res(ctx.json(mockSecretK8sResource({ name: 'ds-pipeline-config' }))),
        ),
        rest.get(
          '/api/k8s/api/v1/namespaces/test-project/secrets/aws-connection-testdb',
          (req, res, ctx) =>
            res(ctx.json(mockSecretK8sResource({ name: 'aws-connection-testdb' }))),
        ),
        rest.post('/api/proxy/apis/v1beta1/pipeline_versions', async (req, res, ctx) => {
          const reqBody = await req.json();
          if (reqBody.queryParams['filter']) {
            return res(
              ctx.json(
                mockPipelineVersionsListSearch(
                  JSON.parse(reqBody.queryParams['filter'])['predicates'][0]['string_value'],
                ),
              ),
            );
          }
          if (reqBody.queryParams['page_token'] === 'next-page-token') {
            return res(ctx.json(mockPipelineVersionsListPage2));
          }
          return res(ctx.json(mockPipelineVersionsListPage1));
        }),
      ],
    },
  },
} as Meta<typeof PipelineSelector>;

export const Default: StoryObj = {
  render: () => (
    <PipelineContextProvider namespace="test-project">
      <PipelineVersionSelector
        pipelineId="63a09bff-9261-43b9-a2a8-5f2158c5522e"
        onSelect={() => null}
      />
    </PipelineContextProvider>
  ),
  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Select a pipeline version', undefined, { timeout: 5000 });
    await userEvent.click(canvas.getByText('Select a pipeline version'));
  },
};
