import React from 'react';
import { StoryFn, StoryObj } from '@storybook/react';
import EdgeModels from '~/pages/edge/EdgeModels';

export default {
  component: EdgeModels,
};

const Template: StoryFn<typeof EdgeModels> = (args) => <EdgeModels {...args} />;

export const EmptyStateNoModelsInRegistry: StoryObj = {
  render: Template,
};
