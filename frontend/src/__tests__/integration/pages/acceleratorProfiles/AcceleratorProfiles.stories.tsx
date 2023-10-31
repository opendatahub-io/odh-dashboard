import React from 'react';
import { StoryFn, Meta, StoryObj } from '@storybook/react';
import { rest } from 'msw';
import { mockAcceleratorProfile } from '~/__mocks__/mockAcceleratorProfile';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import useDetectUser from '~/utilities/useDetectUser';
import { mockStatus } from '~/__mocks__/mockStatus';

import AcceleratorProfiles from '~/pages/acceleratorProfiles/AcceleratorProfiles';

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
          (req, res, ctx) => res(ctx.json(mockK8sResourceList([mockAcceleratorProfile()]))),
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
