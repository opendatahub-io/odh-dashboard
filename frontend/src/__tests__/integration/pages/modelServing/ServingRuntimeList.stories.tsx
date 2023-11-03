import React from 'react';

import { StoryFn, Meta, StoryObj } from '@storybook/react';
import { rest } from 'msw';
import { Route } from 'react-router-dom';
import { Spinner } from '@patternfly/react-core';
import {
  mockRouteK8sResource,
  mockRouteK8sResourceModelServing,
} from '~/__mocks__/mockRouteK8sResource';
import { mockPodK8sResource } from '~/__mocks__/mockPodK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockNotebookK8sResource } from '~/__mocks__/mockNotebookK8sResource';
import ProjectDetailsContextProvider from '~/pages/projects/ProjectDetailsContext';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import {
  mockServingRuntimeK8sResource,
  mockServingRuntimeK8sResourceLegacy,
} from '~/__mocks__/mockServingRuntimeK8sResource';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockPVCK8sResource } from '~/__mocks__/mockPVCK8sResource';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import {
  mockInvalidTemplateK8sResource,
  mockServingRuntimeTemplateK8sResource,
} from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockStatus } from '~/__mocks__/mockStatus';
import ModelServingPlatform from '~/pages/modelServing/screens/projects/ModelServingPlatform';
import { mockInferenceServiceK8sResource } from '~/__mocks__/mockInferenceServiceK8sResource';
import useDetectUser from '~/utilities/useDetectUser';
import { AppContext } from '~/app/AppContext';
import { useApplicationSettings } from '~/app/useApplicationSettings';
import { ServingRuntimeKind } from '~/k8sTypes';

type HandlersProps = {
  disableKServeConfig?: boolean;
  disableModelMeshConfig?: boolean;
  projectEnableModelMesh?: boolean;
  servingRuntimes?: ServingRuntimeKind[];
};

const getHandlers = ({
  disableKServeConfig,
  disableModelMeshConfig,
  projectEnableModelMesh,
  servingRuntimes = [
    mockServingRuntimeK8sResourceLegacy({}),
    mockServingRuntimeK8sResource({
      name: 'test-model',
      namespace: 'test-project',
      auth: true,
      route: true,
    }),
  ],
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
  rest.get('/api/k8s/api/v1/namespaces/test-project/pods', (req, res, ctx) =>
    res(ctx.json(mockK8sResourceList([mockPodK8sResource({})]))),
  ),
  rest.get(
    '/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/test-notebook',
    (req, res, ctx) => res(ctx.json(mockRouteK8sResource({}))),
  ),
  rest.get('/api/k8s/apis/kubeflow.org/v1/namespaces/test-project/notebooks', (req, res, ctx) =>
    res(ctx.json(mockK8sResourceList([mockNotebookK8sResource({})]))),
  ),
  rest.get('/api/k8s/apis/project.openshift.io/v1/projects', (req, res, ctx) =>
    res(
      ctx.json(
        mockK8sResourceList([mockProjectK8sResource({ enableModelMesh: projectEnableModelMesh })]),
      ),
    ),
  ),
  rest.get('/api/k8s/api/v1/namespaces/test-project/persistentvolumeclaims', (req, res, ctx) =>
    res(ctx.json(mockK8sResourceList([mockPVCK8sResource({})]))),
  ),
  rest.get('/api/k8s/apis/project.openshift.io/v1/projects/test-project', (req, res, ctx) =>
    res(ctx.json(mockProjectK8sResource({ enableModelMesh: projectEnableModelMesh }))),
  ),
  rest.get(
    'api/k8s/apis/serving.kserve.io/v1beta1/namespaces/test-project/inferenceservices',
    (req, res, ctx) =>
      res(
        ctx.json(
          mockK8sResourceList([mockInferenceServiceK8sResource({ name: 'test-inference' })]),
        ),
      ),
  ),
  rest.get('/api/k8s/api/v1/namespaces/test-project/secrets', (req, res, ctx) =>
    res(ctx.json(mockK8sResourceList([mockSecretK8sResource({})]))),
  ),
  rest.get(
    'api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes',
    (req, res, ctx) => res(ctx.json(mockK8sResourceList(servingRuntimes))),
  ),
  rest.get(
    '/api/k8s/apis/route.openshift.io/v1/namespaces/test-project/routes/test-inference',
    (req, res, ctx) =>
      res(
        ctx.json(
          mockRouteK8sResourceModelServing({
            inferenceServiceName: 'test-inference',
            namespace: 'test-project',
          }),
        ),
      ),
  ),
  rest.get(
    '/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes/test-model',
    (req, res, ctx) => res(ctx.json(mockServingRuntimeK8sResource({}))),
  ),
  rest.get(
    '/api/k8s/apis/template.openshift.io/v1/namespaces/opendatahub/templates',
    (req, res, ctx) =>
      res(
        ctx.json(
          mockK8sResourceList([
            mockServingRuntimeTemplateK8sResource({}),
            mockInvalidTemplateK8sResource({}),
          ]),
        ),
      ),
  ),
];

export default {
  component: ModelServingPlatform,
  parameters: {
    reactRouter: {
      routePath: '/projects/:namespace/*',
      routeParams: { namespace: 'test-project' },
    },
  },
} as Meta<typeof ModelServingPlatform>;

const Template: StoryFn<typeof ModelServingPlatform> = (args) => {
  useDetectUser();
  const { dashboardConfig, loaded } = useApplicationSettings();
  return loaded && dashboardConfig ? (
    <AppContext.Provider value={{ buildStatuses: [], dashboardConfig }}>
      <ProjectsRoutes>
        <Route path="/" element={<ProjectDetailsContextProvider />}>
          <Route index element={<ModelServingPlatform {...args} />} />
        </Route>
      </ProjectsRoutes>
    </AppContext.Provider>
  ) : (
    <Spinner />
  );
};

export const BothPlatformEnabledAndProjectNotLabelled: StoryObj = {
  render: Template,

  parameters: {
    msw: {
      handlers: getHandlers({
        disableModelMeshConfig: false,
        disableKServeConfig: false,
        servingRuntimes: [],
      }),
    },
  },
};

export const OnlyEnabledModelMeshAndProjectNotLabelled: StoryObj = {
  render: Template,

  parameters: {
    msw: {
      handlers: getHandlers({
        disableModelMeshConfig: false,
        disableKServeConfig: true,
        servingRuntimes: [],
      }),
    },
  },
};

export const ModelMeshListAvailableModels: StoryObj = {
  render: Template,

  parameters: {
    msw: {
      handlers: getHandlers({
        projectEnableModelMesh: true,
        disableKServeConfig: false,
        disableModelMeshConfig: true,
      }),
    },
  },
};

export const KserveListAvailableModels: StoryObj = {
  render: Template,

  parameters: {
    msw: {
      handlers: getHandlers({
        projectEnableModelMesh: false,
        disableKServeConfig: false,
        disableModelMeshConfig: false,
      }),
    },
  },
};
