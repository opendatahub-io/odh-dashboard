import React from 'react';

import { StoryFn, Meta, StoryObj } from '@storybook/react';
import { rest } from 'msw';
import { within } from '@storybook/testing-library';
import { Route, Routes } from 'react-router-dom';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import CustomServingRuntimeView from '~/pages/modelServing/customServingRuntimes/CustomServingRuntimeView';
import { mockServingRuntimeTemplateK8sResource } from '~/__mocks__/mockServingRuntimeTemplateK8sResource';
import CustomServingRuntimeContextProvider from '~/pages/modelServing/customServingRuntimes/CustomServingRuntimeContext';
import { mockStatus } from '~/__mocks__/mockStatus';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import useDetectUser from '~/utilities/useDetectUser';
import { mockDashboardConfig } from '~/__mocks__/mockDashboardConfig';
import { ServingRuntimePlatform } from '~/types';

export default {
  component: CustomServingRuntimeView,
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/status', (req, res, ctx) => res(ctx.json(mockStatus()))),
        rest.get('/api/templates/opendatahub', (req, res, ctx) =>
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
                  displayName: 'OVMS',
                  platforms: [ServingRuntimePlatform.MULTI],
                }),
                mockServingRuntimeTemplateK8sResource({
                  name: 'template-4',
                  displayName: 'Serving Runtime with No Annotations',
                }),
              ]),
            ),
          ),
        ),
        rest.get('/api/k8s/apis/project.openshift.io/v1/projects', (req, res, ctx) =>
          res(ctx.json(mockK8sResourceList([mockProjectK8sResource({})]))),
        ),
        rest.get('/api/dashboardConfig/opendatahub/odh-dashboard-config', (req, res, ctx) =>
          res(ctx.json(mockDashboardConfig({}))),
        ),
      ],
    },
  },
} as Meta<typeof CustomServingRuntimeView>;

const Template: StoryFn<typeof CustomServingRuntimeView> = (args) => {
  useDetectUser();
  return (
    <Routes>
      <Route path="/" element={<CustomServingRuntimeContextProvider />}>
        <Route index element={<CustomServingRuntimeView {...args} />} />
      </Route>
    </Routes>
  );
};

export const Default: StoryObj = {
  render: Template,

  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Serving runtimes', undefined, { timeout: 5000 });
  },
};
