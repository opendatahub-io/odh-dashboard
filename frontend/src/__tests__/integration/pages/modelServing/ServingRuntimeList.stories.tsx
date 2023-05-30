import React from 'react';

import { StoryFn, Meta } from '@storybook/react';
import { rest } from 'msw';
import { userEvent, within } from '@storybook/testing-library';
import { Route } from 'react-router-dom';
import { mockRouteK8sResource } from '~/__mocks__/mockRouteK8sResource';
import { mockPodK8sResource } from '~/__mocks__/mockPodK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockNotebookK8sResource } from '~/__mocks__/mockNotebookK8sResource';
import ProjectDetailsContextProvider from '~/pages/projects/ProjectDetailsContext';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import { mockServingRuntimeK8sResource } from '~/__mocks__/mockServingRuntimeK8sResource';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockPVCK8sResource } from '~/__mocks__/mockPVCK8sResource';
import ProjectsRoutes from '~/concepts/projects/ProjectsRoutes';
import { mockTemplateK8sResource } from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { mockStatus } from '~/__mocks__/mockStatus';
import useDetectUser from '~/utilities/useDetectUser';
import { fetchDashboardConfig } from '~/services/dashboardConfigService';
import ServingRuntimeList from '~/pages/modelServing/screens/projects/ServingRuntimeList';

export default {
  component: ServingRuntimeList,
  parameters: {
    reactRouter: {
      routePath: '/projects/:namespace/*',
      routeParams: { namespace: 'test-project' },
    },
    msw: {
      handlers: [
        rest.get('/api/status', (req, res, ctx) => res(ctx.json(mockStatus()))),
        rest.get('/api/config', (req, res, ctx) => res(ctx.json(mockDashboardConfig))),
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
        rest.get(
          '/api/k8s/apis/template.openshift.io/v1/namespaces/opendatahub/templates',
          (req, res, ctx) => res(ctx.json(mockK8sResourceList([mockTemplateK8sResource({})]))),
        ),
        rest.get(
          '/api/k8s/apis/opendatahub.io/v1alpha/namespaces/opendatahub/odhdashboardconfigs/odh-dashboard-config',
          (req, res, ctx) => res(ctx.json(mockDashboardConfig)),
        ),
      ],
    },
  },
} as Meta<typeof ServingRuntimeList>;

const Template: StoryFn<typeof ServingRuntimeList> = (args) => {
  fetchDashboardConfig();
  useDetectUser();
  return (
    <ProjectsRoutes>
      <Route path="/" element={<ProjectDetailsContextProvider />}>
        <Route index element={<ServingRuntimeList {...args} />} />
      </Route>
    </ProjectsRoutes>
  );
};

export const DeployModel = {
  render: Template,

  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('ovms', undefined, { timeout: 5000 });

    await userEvent.click(canvas.getByText('Deploy model', { selector: 'button' }));
  },
};
