import React from 'react';
import { Meta, StoryFn, StoryObj } from '@storybook/react';
import { rest } from 'msw';
import { within } from '@storybook/testing-library';
import { mockClusterSettings } from '~/__mocks__/mockClusterSettings';
import ClusterSettings from '~/pages/clusterSettings/ClusterSettings';
import { AreaContext } from '~/concepts/areas/AreaContext';
import { mockDscStatus } from '~/__mocks__/mockDscStatus';
import { StackComponent } from '~/concepts/areas';

export default {
  component: ClusterSettings,
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/cluster-settings', (req, res, ctx) =>
          res(ctx.json(mockClusterSettings({}))),
        ),
      ],
    },
  },
} as Meta<typeof ClusterSettings>;

const Template: StoryFn<typeof ClusterSettings> = (args) => (
  <AreaContext.Provider
    value={{
      dscStatus: mockDscStatus({
        installedComponents: { [StackComponent.K_SERVE]: true, [StackComponent.MODEL_MESH]: true },
      }),
    }}
  >
    <ClusterSettings {...args} />
  </AreaContext.Provider>
);

export const Default: StoryObj = {
  render: Template,

  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Save changes', undefined, { timeout: 5000 });
  },
};
