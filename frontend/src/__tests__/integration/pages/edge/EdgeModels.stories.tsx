import React from 'react';
import { StoryFn, StoryObj } from '@storybook/react';
import { Route, Routes } from 'react-router';
import { rest } from 'msw';
import EdgeModels from '~/pages/edge/EdgeModels';
import EdgeContextProvider from '~/concepts/edge/EdgeContext';
import { EDGE_CONSTANT } from '~/concepts/edge/const';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';

export default {
  component: EdgeModels,
};

const Template: StoryFn<typeof EdgeModels> = (args) => (
  <Routes>
    <Route path="/" element={<EdgeContextProvider />}>
      <Route index element={<EdgeModels {...args} />} />
    </Route>
  </Routes>
);

export const EmptyStateNoModelsInRegistry: StoryObj = {
  render: Template,
  parameters: {
    reactRouter: {
      routePath: '/',
    },
    msw: {
      handlers: [
        rest.get(
          `/api/k8s/apis/tekton.dev/v1beta1/namespaces/${EDGE_CONSTANT}/pipelineruns?labelSelector=app%3DTODO-INSERT-AIEDGE-PIPELINE-UNIQUE-APP-LABEL`,
          (req, res, ctx) => res(ctx.json(mockK8sResourceList([]))),
        ),
      ],
    },
  },
};
