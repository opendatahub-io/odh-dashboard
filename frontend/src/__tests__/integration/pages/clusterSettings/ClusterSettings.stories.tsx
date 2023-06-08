import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import { rest } from 'msw';
import { within } from '@storybook/testing-library';
import { mockClusterSettings } from '~/__mocks__/mockClusterSettings';
import ClusterSettings from '~/pages/clusterSettings/ClusterSettings';

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

const Template: StoryFn<typeof ClusterSettings> = (args) => <ClusterSettings {...args} />;

export const Default = {
  render: Template,

  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Save changes', undefined, { timeout: 5000 });
  },
};
