import React from 'react';
import { StoryFn, Meta, StoryObj } from '@storybook/react';
import { within } from '@storybook/testing-library';
import { rest } from 'msw';
import { mockAcceleratorProfile } from '~/__mocks__/mockAcceleratorProfile';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import useDetectUser from '~/utilities/useDetectUser';
import { mockStatus } from '~/__mocks__/mockStatus';

import AcceleratorProfiles from '~/pages/acceleratorProfiles/screens/list/AcceleratorProfiles';

export default {
  component: AcceleratorProfiles,
  parameters: {
    msw: {
      handlers: {
        status: [
          rest.get('/api/k8s/apis/project.openshift.io/v1/projects', (req, res, ctx) =>
            res(ctx.json(mockK8sResourceList([mockProjectK8sResource({})]))),
          ),
          rest.get('/api/status', (req, res, ctx) => res(ctx.json(mockStatus()))),
        ],
        accelerators: rest.get(
          '/api/k8s/apis/dashboard.opendatahub.io/v1/namespaces/opendatahub/acceleratorprofiles',
          (req, res, ctx) =>
            res(
              ctx.json(
                mockK8sResourceList([
                  mockAcceleratorProfile({ displayName: 'Test Accelerator' }),
                  mockAcceleratorProfile({
                    name: 'some-other-gpu',
                    displayName: 'TensorRT',
                    enabled: false,
                    identifier: 'tensor.com/gpu',
                    description:
                      'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Saepe, quis',
                  }),
                ]),
              ),
            ),
        ),
      },
    },
  },
} as Meta<typeof AcceleratorProfiles>;

const Template: StoryFn<typeof AcceleratorProfiles> = (args) => {
  useDetectUser();
  return <AcceleratorProfiles {...args} />;
};

export const EmptyStateNoAcceleratorProfile: StoryObj = {
  render: Template,

  parameters: {
    msw: {
      handlers: {
        accelerators: rest.get(
          '/api/k8s/apis/dashboard.opendatahub.io/v1/namespaces/opendatahub/acceleratorprofiles',
          (req, res, ctx) => res(ctx.json(mockK8sResourceList([]))),
        ),
      },
    },
  },
};

export const ListAcceleratorProfiles: StoryObj = {
  render: Template,

  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Test Accelerator', undefined, { timeout: 5000 });
    await canvas.findByText('TensorRT');
  },
};
