import React from 'react';

import { StoryFn, Meta, StoryObj } from '@storybook/react';
import { rest } from 'msw';
import { within, userEvent } from '@storybook/testing-library';
import { Route, Routes } from 'react-router-dom';
import { Spinner } from '@patternfly/react-core';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockServingRuntimeK8sResource } from '~/__mocks__/mockServingRuntimeK8sResource';
import {
  mockInferenceServiceK8sResource,
  mockInferenceServicek8sError,
} from '~/__mocks__/mockInferenceServiceK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import ModelServingContextProvider from '~/pages/modelServing/ModelServingContext';
import ModelServingGlobal from '~/pages/modelServing/screens/global/ModelServingGlobal';
import { AreaContext } from '~/concepts/areas/AreaContext';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { StackComponent } from '~/concepts/areas';
import ProjectsContextProvider from '~/concepts/projects/ProjectsContext';
import {
  mockInvalidTemplateK8sResource,
  mockServingRuntimeTemplateK8sResource,
} from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { ServingRuntimePlatform } from '~/types';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockStatus } from '~/__mocks__/mockStatus';
import useDetectUser from '~/utilities/useDetectUser';
import { useApplicationSettings } from '~/app/useApplicationSettings';
import { AppContext } from '~/app/AppContext';
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';

type HandlersProps = {
  disableKServeConfig?: boolean;
  disableModelMeshConfig?: boolean;
  projectEnableModelMesh?: boolean;
  servingRuntimes?: ServingRuntimeKind[];
  inferenceServices?: InferenceServiceKind[];
};

const getHandlers = ({
  disableKServeConfig,
  disableModelMeshConfig,
  projectEnableModelMesh,
  servingRuntimes = [mockServingRuntimeK8sResource({})],
  inferenceServices = [mockInferenceServiceK8sResource({})],
}: HandlersProps) => [
  rest.get('/api/status', (req, res, ctx) => res(ctx.json(mockStatus()))),
  rest.get('/api/config', (req, res, ctx) =>
    res(
      ctx.json(
        mockDashboardConfig({
          disableKServe: disableKServeConfig,
          disableModelMesh: disableModelMeshConfig,
        }),
      ),
    ),
  ),
  rest.get(
    'api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes',
    (req, res, ctx) => res(ctx.json(mockK8sResourceList(servingRuntimes))),
  ),
  rest.get(
    'api/k8s/apis/serving.kserve.io/v1beta1/namespaces/test-project/inferenceservices',
    (req, res, ctx) => res(ctx.json(mockK8sResourceList(inferenceServices))),
  ),
  rest.get('/api/k8s/api/v1/namespaces/test-project/secrets', (req, res, ctx) =>
    res(ctx.json(mockK8sResourceList([mockSecretK8sResource({})]))),
  ),
  rest.get(
    'api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/modelServing/servingruntimes',
    (req, res, ctx) => res(ctx.json(mockK8sResourceList(servingRuntimes))),
  ),
  rest.get(
    'api/k8s/apis/serving.kserve.io/v1beta1/namespaces/modelServing/inferenceservices',
    (req, res, ctx) => res(ctx.json(mockK8sResourceList(inferenceServices))),
  ),
  rest.get('/api/k8s/api/v1/namespaces/modelServing/secrets', (req, res, ctx) =>
    res(ctx.json(mockK8sResourceList([mockSecretK8sResource({})]))),
  ),
  rest.get(
    '/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes/test-model',
    (req, res, ctx) => res(ctx.json(mockServingRuntimeK8sResource({}))),
  ),
  rest.get('/api/k8s/apis/project.openshift.io/v1/projects', (req, res, ctx) =>
    res(
      ctx.json(
        mockK8sResourceList([mockProjectK8sResource({ enableModelMesh: projectEnableModelMesh })]),
      ),
    ),
  ),
  rest.post(
    'api/k8s/apis/serving.kserve.io/v1beta1/namespaces/test-project/inferenceservices/test',
    (req, res, ctx) => res(ctx.json(mockInferenceServiceK8sResource({}))),
  ),
  rest.post(
    'api/k8s/apis/serving.kserve.io/v1beta1/namespaces/test-project/inferenceservices/trigger-error',
    (req, res, ctx) =>
      res(ctx.status(422, 'Unprocessable Entity'), ctx.json(mockInferenceServicek8sError())),
  ),
  rest.get(
    'api/k8s/apis/opendatahub.io/v1alpha/namespaces/opendatahub/odhdashboardconfigs/odh-dashboard-config',
    (req, res, ctx) => res(ctx.json(mockDashboardConfig({}))),
  ),
  rest.get(
    '/api/k8s/apis/template.openshift.io/v1/namespaces/opendatahub/templates',
    (req, res, ctx) =>
      res(
        ctx.json(
          mockK8sResourceList([
            mockServingRuntimeTemplateK8sResource({
              name: 'template-1',
              displayName: 'Multi Platform',
              platforms: [ServingRuntimePlatform.SINGLE, ServingRuntimePlatform.MULTI],
            }),
            mockServingRuntimeTemplateK8sResource({
              name: 'template-2',
              displayName: 'Caikit',
              platforms: [ServingRuntimePlatform.SINGLE],
            }),
            mockServingRuntimeTemplateK8sResource({
              name: 'template-3',
              displayName: 'New OVMS Server',
              platforms: [ServingRuntimePlatform.MULTI],
            }),
            mockServingRuntimeTemplateK8sResource({
              name: 'template-4',
              displayName: 'Serving Runtime with No Annotations',
            }),
            mockInvalidTemplateK8sResource({}),
          ]),
        ),
      ),
  ),
];

export default {
  component: ModelServingGlobal,
  parameters: {
    reactRouter: {
      routePath: '/modelServing/:namespace/*',
      routeParams: { namespace: 'test-project' },
    },
  },
} as Meta<typeof ModelServingGlobal>;

const Template: StoryFn<typeof ModelServingGlobal> = (args) => {
  useDetectUser();
  const { dashboardConfig, loaded } = useApplicationSettings();

  return loaded && dashboardConfig ? (
    <AppContext.Provider value={{ buildStatuses: [], dashboardConfig }}>
      <AreaContext.Provider
        value={{
          dscStatus: mockDscStatus({
            installedComponents: {
              [StackComponent.K_SERVE]: true,
              [StackComponent.MODEL_MESH]: true,
            },
          }),
        }}
      >
        <ProjectsContextProvider>
          <Routes>
            <Route path="/" element={<ModelServingContextProvider />}>
              <Route index element={<ModelServingGlobal {...args} />} />
              <Route path="/:namespace?/*" element={<ModelServingGlobal {...args} />} />
            </Route>
          </Routes>
        </ProjectsContextProvider>
      </AreaContext.Provider>
    </AppContext.Provider>
  ) : (
    <Spinner />
  );
};

export const EmptyStateNoServingRuntime: StoryObj = {
  render: Template,

  parameters: {
    msw: {
      handlers: getHandlers({
        disableKServeConfig: false,
        disableModelMeshConfig: false,
        projectEnableModelMesh: true,
        servingRuntimes: [],
        inferenceServices: [],
      }),
    },
  },
};

export const EmptyStateNoInferenceServices: StoryObj = {
  render: Template,

  parameters: {
    msw: {
      handlers: getHandlers({
        projectEnableModelMesh: false,
        inferenceServices: [],
      }),
    },
  },
};

export const EditModel: StoryObj = {
  render: Template,

  parameters: {
    a11y: {
      // need to select modal as root
      element: '.pf-c-backdrop',
    },
    msw: {
      handlers: getHandlers({}),
    },
  },

  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Test Inference Service', undefined, { timeout: 5000 });

    // user flow for editing a project
    await userEvent.click(canvas.getByLabelText('Actions', { selector: 'button' }));
    await userEvent.click(canvas.getByText('Edit', { selector: 'button' }));
  },
};

export const DeleteModel: StoryObj = {
  render: Template,

  parameters: {
    a11y: {
      element: '.pf-c-backdrop',
    },
    msw: {
      handlers: getHandlers({}),
    },
  },

  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Test Inference Service', undefined, { timeout: 5000 });

    // user flow for deleting a project
    await userEvent.click(canvas.getByLabelText('Actions', { selector: 'button' }));
    await userEvent.click(canvas.getByText('Delete', { selector: 'button' }));
  },
};

export const DeployModelModelMesh: StoryObj = {
  render: Template,

  parameters: {
    a11y: {
      // need to select modal as root
      element: '.pf-c-backdrop',
    },
    msw: {
      handlers: getHandlers({
        projectEnableModelMesh: true,
      }),
    },
  },

  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Test Inference Service', undefined, { timeout: 5000 });

    // user flow for editing a project
    await userEvent.click(canvas.getByText('Deploy model', { selector: 'button' }));
  },
};

export const DeployModelModelKServe: StoryObj = {
  render: Template,

  parameters: {
    a11y: {
      // need to select modal as root
      element: '.pf-c-backdrop',
    },
    msw: {
      handlers: getHandlers({
        projectEnableModelMesh: false,
      }),
    },
  },

  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Test Inference Service', undefined, { timeout: 5000 });

    // user flow for editing a project
    await userEvent.click(canvas.getByText('Deploy model', { selector: 'button' }));
  },
};
