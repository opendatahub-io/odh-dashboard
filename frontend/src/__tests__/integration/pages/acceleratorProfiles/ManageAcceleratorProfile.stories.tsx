import { Meta, StoryObj } from '@storybook/react';
import { rest } from 'msw';
import { userEvent, within } from '@storybook/testing-library';
import React from 'react';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockAcceleratorProfile } from '~/__mocks__/mockAcceleratorProfile';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockStatus } from '~/__mocks__/mockStatus';
import EditAcceleratorProfileComponent from '~/pages/acceleratorProfiles/screens/manage/EditAcceleratorProfile';
import useDetectUser from '~/utilities/useDetectUser';
import ManageAcceleratorProfileComponent from '~/pages/acceleratorProfiles/screens/manage/ManageAcceleratorProfile';

export default {
  component: ManageAcceleratorProfileComponent,
  parameters: {
    msw: {
      handlers: {
        status: [
          rest.get('/api/k8s/apis/project.openshift.io/v1/projects', (req, res, ctx) =>
            res(ctx.json(mockK8sResourceList([mockProjectK8sResource({})]))),
          ),
          rest.get('/api/status', (req, res, ctx) => res(ctx.json(mockStatus()))),
        ],
      },
    },
  },
} as Meta<typeof ManageAcceleratorProfileComponent>;

const RenderComponent = ({ children }: { children: React.ReactElement }) => {
  useDetectUser();
  return children;
};
export const NewAcceleratorProfile: StoryObj = {
  render: () => (
    <RenderComponent>
      <ManageAcceleratorProfileComponent />
    </RenderComponent>
  ),
  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Identifier', undefined, {
      timeout: 5000,
    });
  },
};

export const EditAcceleratorProfile: StoryObj = {
  render: () => (
    <RenderComponent>
      <EditAcceleratorProfileComponent />
    </RenderComponent>
  ),
  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Identifier', undefined, {
      timeout: 5000,
    });
  },
  parameters: {
    reactRouter: {
      routePath: '/edit/:acceleratorProfileName',
      routeParams: { acceleratorProfileName: 'test-accelerator' },
    },
    msw: {
      handlers: {
        accelerator: rest.get(
          '/api/k8s/apis/dashboard.opendatahub.io/v1/namespaces/opendatahub/acceleratorprofiles/test-accelerator',
          (req, res, ctx) =>
            res(ctx.json(mockAcceleratorProfile({ metadata: { name: 'test-accelerator' } }))),
        ),
      },
    },
  },
};

export const InvalidAcceleratorProfile: StoryObj = {
  render: () => (
    <RenderComponent>
      <EditAcceleratorProfileComponent />
    </RenderComponent>
  ),
  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Problem loading accelerator profile', undefined, {
      timeout: 5000,
    });
  },
  parameters: {
    reactRouter: {
      routePath: '/edit/:acceleratorProfileName',
      routeParams: { acceleratorProfileName: 'test-accelerator' },
    },
    msw: {
      handlers: {
        accelerator: rest.get(
          '/api/k8s/apis/dashboard.opendatahub.io/v1/namespaces/opendatahub/acceleratorprofiles/test-accelerator',
          (req, res, ctx) =>
            res(
              ctx.status(404),
              ctx.json({
                kind: 'Status',
                apiVersion: 'v1',
                metadata: {},
                status: 'Failure',
                message:
                  'acceleratorprofiles.dashboard.opendatahub.io "test-accelerator" not found',
                reason: 'NotFound',
                details: {
                  name: 'test-gpud',
                  group: 'dashboard.opendatahub.io',
                  kind: 'acceleratorprofiles',
                },
                code: 404,
              }),
            ),
        ),
      },
    },
  },
};

export const TolerationsModal: StoryObj = {
  render: () => (
    <RenderComponent>
      <ManageAcceleratorProfileComponent />
    </RenderComponent>
  ),
  parameters: {
    a11y: {
      element: '.pf-c-backdrop',
    },
  },
  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Identifier', undefined, {
      timeout: 5000,
    });

    // user flow for deleting a project
    await userEvent.click(canvas.getByText('Add toleration', { selector: 'button' }));
  },
};
