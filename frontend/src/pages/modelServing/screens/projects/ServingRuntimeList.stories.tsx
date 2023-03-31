import React from 'react';

import { ComponentStory, ComponentMeta } from '@storybook/react';
import { rest } from 'msw';
import { userEvent, within } from '@storybook/testing-library';
import { expect } from '@storybook/jest';
import { Route, Routes } from 'react-router-dom';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockPodK8sResource } from '~/__mocks__/mockPodK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockNotebookK8sResource } from '~/__mocks__/mockNotebookK8sResource';
import ProjectDetailsContextProvider from '~/pages/projects/ProjectDetailsContext';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { mockServingRuntimeK8sResource } from '~/__mocks__/mockServingRuntimeK8sResource';
import { mockServingRuntimesConfig } from '~/__mocks__/mockServingRuntimesConfig';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockPVCK8sResource } from '~/__mocks__/mockPVCK8sResource';
import ServingRuntimeList from './ServingRuntimeList';

export default {
  title: 'ServingRuntimeList',
  component: ServingRuntimeList,
  parameters: {
    reactRouter: {
      routePath: '/projects/:namespace/*',
      routeParams: { namespace: 'test-project' },
    },
    msw: {
      handlers: [
        rest.get('/api/k8s/api/v1/namespaces/test-project/pods', (req, res, ctx) =>
          res(ctx.json(mockK8sResourceList([mockPodK8sResource({})]))),
        ),
        rest.get(
          '/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/test-notebook',
          (req, res, ctx) => res(ctx.json(mockRouteK8sResource({}))),
        ),
        rest.get(
          '/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks',
          (req, res, ctx) => res(ctx.json(mockK8sResourceList([mockNotebookK8sResource({})]))),
        ),
        rest.get('/api/k8s/apis/project.openshift.io/v1/projects', (req, res, ctx) =>
          res(ctx.json(mockK8sResourceList([mockProjectK8sResource({})]))),
        ),
        rest.get(
          '/api/k8s/api/v1/namespaces/test-project/persistentvolumeclaims',
          (req, res, ctx) => res(ctx.json(mockK8sResourceList([mockPVCK8sResource({})]))),
        ),
        rest.get('/api/k8s/apis/project.openshift.io/v1/projects/test-project', (req, res, ctx) =>
          res(ctx.json(mockProjectK8sResource({}))),
        ),
        rest.get(
          'api/k8s/apis/serving.kserve.io/v1beta1/namespaces/test-project/inferenceservices',
          (req, res, ctx) => res(ctx.json(mockK8sResourceList([]))),
        ),
        rest.get('/api/k8s/api/v1/namespaces/test-project/secrets', (req, res, ctx) =>
          res(ctx.json(mockK8sResourceList([mockSecretK8sResource({})]))),
        ),
        rest.get(
          'api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes',
          (req, res, ctx) =>
            res(ctx.json(mockK8sResourceList([mockServingRuntimeK8sResource({})]))),
        ),
        rest.get(
          '/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes/test-model',
          (req, res, ctx) => res(ctx.json(mockServingRuntimeK8sResource({}))),
        ),
        rest.get('/api/k8s/api/v1/configmaps/servingruntimes-config', (req, res, ctx) =>
          res(ctx.json(mockServingRuntimesConfig({}))),
        ),
      ],
    },
  },
} as ComponentMeta<typeof ServingRuntimeList>;

const Template: ComponentStory<typeof ServingRuntimeList> = (args) => (
  <Routes>
    <Route path="/" element={<ProjectDetailsContextProvider />}>
      <Route index element={<ServingRuntimeList {...args} />} />
    </Route>
  </Routes>
);

export const Default = Template.bind({});
Default.play = async ({ canvasElement }) => {
  // load page and wait until settled
  const canvas = within(canvasElement);
  await canvas.findByText('ovms', undefined, { timeout: 5000 });
};

export const DeployModel = Template.bind({});
DeployModel.play = async ({ canvasElement }) => {
  // load page and wait until settled
  const canvas = within(canvasElement);
  await canvas.findByText('ovms', undefined, { timeout: 5000 });

  await userEvent.click(canvas.getByText('Deploy model', { selector: 'button' }));

  // get modal
  const body = within(canvasElement.ownerDocument.body);
  const nameInput = body.getByRole('textbox', { name: /Model Name/ });
  const dropdowns = body.getAllByRole('button', { name: /Options menu/ });
  const frameworkDropdown = dropdowns[0];
  const secretDropdown = dropdowns[1];
  const deployButton = body.getByText('Deploy', { selector: 'button' });

  await userEvent.type(nameInput, 'Updated Model', { delay: 50 });
  expect(deployButton).toBeDisabled();

  await userEvent.click(frameworkDropdown);
  await userEvent.click(body.getByText('onnx - 1'));
  expect(deployButton).toBeDisabled();

  await userEvent.click(secretDropdown);
  await userEvent.click(body.getByText('Test Secret'));
  expect(deployButton).not.toBeDisabled();
};
