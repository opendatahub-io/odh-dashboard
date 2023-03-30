import React from 'react';

import { ComponentStory, ComponentMeta } from '@storybook/react';
import { DefaultBodyType, MockedRequest, rest, RestHandler } from 'msw';
import { within } from '@storybook/testing-library';
import { expect } from '@storybook/jest';
import { Route, Routes } from 'react-router-dom';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockPodK8sResource } from '~/__mocks__/mockPodK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockNotebookK8sResource } from '~/__mocks__/mockNotebookK8sResource';
import ProjectDetailsContextProvider from '~/pages/projects/ProjectDetailsContext';
import { mockInferenceServiceK8sResource } from '~/__mocks__/mockInferenceServiceK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { mockServingRuntimeK8sResource } from '~/__mocks__/mockServingRuntimeK8sResource';
import { mockServingRuntimesConfig } from '~/__mocks__/mockServingRuntimesConfig';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockPVCK8sResource } from '~/__mocks__/mockPVCK8sResource';
import useDetectUser from '~/utilities/useDetectUser';
import ProjectDetails from './ProjectDetails';

const handlers = (isEmpty: boolean): RestHandler<MockedRequest<DefaultBodyType>>[] => [
  rest.get('/api/k8s/api/v1/namespaces/test-project/pods', (req, res, ctx) =>
    res(ctx.json(mockK8sResourceList(isEmpty ? [] : [mockPodK8sResource({})]))),
  ),
  rest.get(
    '/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/test-notebook',
    (req, res, ctx) => res(ctx.json(mockRouteK8sResource({}))),
  ),
  rest.get(
    '/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/test-size',
    (req, res, ctx) => res(ctx.json(mockRouteK8sResource({ notebookName: 'test-size' }))),
  ),
  rest.get('/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks', (req, res, ctx) =>
    res(
      ctx.json(
        mockK8sResourceList(
          isEmpty
            ? []
            : [
                mockNotebookK8sResource({}),
                mockNotebookK8sResource({
                  name: 'test-size',
                  displayName: 'Test Size X-small',
                  resources: {
                    limits: { cpu: '500m', memory: '500Mi' },
                    requests: { cpu: '100m', memory: '100Mi' },
                  },
                }),
              ],
        ),
      ),
    ),
  ),
  rest.get('/api/k8s/apis/project.openshift.io/v1/projects', (req, res, ctx) =>
    res(ctx.json(mockK8sResourceList(isEmpty ? [] : [mockProjectK8sResource({})]))),
  ),
  rest.get('/api/k8s/api/v1/namespaces/test-project/persistentvolumeclaims', (req, res, ctx) =>
    res(ctx.json(mockK8sResourceList(isEmpty ? [] : [mockPVCK8sResource({})]))),
  ),
  rest.get('/api/k8s/apis/project.openshift.io/v1/projects/test-project', (req, res, ctx) =>
    res(ctx.json(mockProjectK8sResource({}))),
  ),
  rest.get(
    'api/k8s/apis/serving.kserve.io/v1beta1/namespaces/test-project/inferenceservices',
    (req, res, ctx) =>
      res(ctx.json(mockK8sResourceList(isEmpty ? [] : [mockInferenceServiceK8sResource({})]))),
  ),
  rest.get('/api/k8s/api/v1/namespaces/test-project/secrets', (req, res, ctx) =>
    res(ctx.json(mockK8sResourceList(isEmpty ? [] : [mockSecretK8sResource({})]))),
  ),
  rest.get(
    'api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes',
    (req, res, ctx) =>
      res(ctx.json(mockK8sResourceList(isEmpty ? [] : [mockServingRuntimeK8sResource({})]))),
  ),
  rest.get(
    '/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes/test-model',
    (req, res, ctx) => res(ctx.json(mockServingRuntimeK8sResource({}))),
  ),
  rest.get('/api/k8s/api/v1/configmaps/servingruntimes-config', (req, res, ctx) =>
    res(ctx.json(mockServingRuntimesConfig({}))),
  ),
];

export default {
  title: 'ProjectDetails',
  component: ProjectDetails,
  parameters: {
    reactRouter: {
      routePath: '/projects/:namespace/*',
      routeParams: { namespace: 'test-project' },
    },
    msw: {
      handlers: handlers(false),
    },
  },
} as ComponentMeta<typeof ProjectDetails>;

const Template: ComponentStory<typeof ProjectDetails> = (args) => {
  useDetectUser();
  return (
    <Routes>
      <Route path="/" element={<ProjectDetailsContextProvider />}>
        <Route index element={<ProjectDetails {...args} />} />
      </Route>
    </Routes>
  );
};

export const Default = Template.bind({});
Default.play = async ({ canvasElement }) => {
  // load page and wait until settled
  const canvas = within(canvasElement);
  await canvas.findByText('Test Notebook', undefined, { timeout: 5000 });

  // we fill in the page with data, so there should be no dividers on the page
  expect(canvas.queryAllByTestId('details-page-section-divider')).toHaveLength(0);

  // check the x-small size shown correctly
  expect(canvas.getByText('XSmall')).toBeInTheDocument();
};

export const EmptyDetailsPage = Template.bind({});
EmptyDetailsPage.parameters = {
  ...EmptyDetailsPage.parameters,
  msw: {
    handlers: handlers(true),
  },
};
EmptyDetailsPage.play = async ({ canvasElement }) => {
  // load page and wait until settled
  const canvas = within(canvasElement);
  await canvas.findByText('No model servers', undefined, { timeout: 5000 });

  // the dividers number should always 1 less than the section number
  const sections = await canvas.findAllByTestId('details-page-section');
  expect(await canvas.findAllByTestId('details-page-section-divider')).toHaveLength(
    sections.length - 1,
  );
};
