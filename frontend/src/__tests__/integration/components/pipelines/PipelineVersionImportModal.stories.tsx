import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { rest } from 'msw';
import PipelineVersionImportModal from '~/concepts/pipelines/content/import/PipelineVersionImportModal';
import { PipelineContextProvider } from '~/concepts/pipelines/context';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockDataSciencePipelineApplicationK8sResource } from '~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockPipelinesProxy } from '~/__mocks__/mockPipelinesProxy';

export default {
  component: PipelineVersionImportModal,
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
        rest.post('/api/proxy/apis/v1beta1/pipelines', (req, res, ctx) =>
          res(ctx.json(mockPipelinesProxy)),
        ),
      ],
    },
  },
} as Meta<typeof PipelineVersionImportModal>;

export const Default: StoryObj = {
  render: () => (
    <PipelineContextProvider namespace="test-project">
      <PipelineVersionImportModal isOpen onClose={() => null} />;
    </PipelineContextProvider>
  ),
};
