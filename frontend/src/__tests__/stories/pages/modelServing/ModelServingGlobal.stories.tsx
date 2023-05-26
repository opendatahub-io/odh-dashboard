import React from 'react';

import { StoryFn, Meta } from '@storybook/react';
import { rest } from 'msw';
import { within, userEvent } from '@storybook/testing-library';
import { expect } from '@storybook/jest';
import { Route, Routes } from 'react-router-dom';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { mockProjectK8sResource } from '~/__mocks__/mockProjectK8sResource';
import { mockServingRuntimeK8sResource } from '~/__mocks__/mockServingRuntimeK8sResource';
import { mockInferenceServiceK8sResource } from '~/__mocks__/mockInferenceServiceK8sResource';
import { mockSecretK8sResource } from '~/__mocks__/mockSecretK8sResource';
import ModelServingContextProvider from '~/pages/modelServing/ModelServingContext';
import ModelServingGlobal from '~/pages/modelServing/screens/global/ModelServingGlobal';

export default {
  component: ModelServingGlobal,
  parameters: {
    msw: {
      handlers: [
        rest.get(
          'api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes',
          (req, res, ctx) =>
            res(ctx.json(mockK8sResourceList([mockServingRuntimeK8sResource({})]))),
        ),
        rest.get(
          'api/k8s/apis/serving.kserve.io/v1beta1/namespaces/test-project/inferenceservices',
          (req, res, ctx) =>
            res(ctx.json(mockK8sResourceList([mockInferenceServiceK8sResource({})]))),
        ),
        rest.get('/api/k8s/api/v1/namespaces/test-project/secrets', (req, res, ctx) =>
          res(ctx.json(mockK8sResourceList([mockSecretK8sResource({})]))),
        ),
        rest.get(
          '/api/k8s/apis/serving.kserve.io/v1alpha1/namespaces/test-project/servingruntimes/test-model',
          (req, res, ctx) => res(ctx.json(mockServingRuntimeK8sResource({}))),
        ),
        rest.get('/api/k8s/apis/project.openshift.io/v1/projects', (req, res, ctx) =>
          res(ctx.json(mockK8sResourceList([mockProjectK8sResource({})]))),
        ),
      ],
    },
  },
} as Meta<typeof ModelServingGlobal>;

const Template: StoryFn<typeof ModelServingGlobal> = (args) => (
  <Routes>
    <Route path="/" element={<ModelServingContextProvider />}>
      <Route index element={<ModelServingGlobal {...args} />} />
    </Route>
  </Routes>
);

export const EditModel = {
  render: Template,

  parameters: {
    a11y: {
      // need to select modal as root
      element: '.pf-c-backdrop',
    },
  },

  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Test Inference Service', undefined, { timeout: 5000 });

    // user flow for editing a project
    await userEvent.click(canvas.getByLabelText('Actions', { selector: 'button' }));
    await userEvent.click(canvas.getByText('Edit', { selector: 'button' }));
  },
};

export const DeleteModel = {
  render: Template,

  parameters: {
    a11y: {
      element: '.pf-c-backdrop',
    },
  },

  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Test Inference Service', undefined, { timeout: 5000 });

    // user flow for deleting a project
    await userEvent.click(canvas.getByLabelText('Actions', { selector: 'button' }));
    await userEvent.click(canvas.getByText('Delete', { selector: 'button' }));
  },
};

export const DeployModel = {
  render: Template,

  parameters: {
    a11y: {
      // need to select modal as root
      element: '.pf-c-backdrop',
    },
  },

  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Test Inference Service', undefined, { timeout: 5000 });

    // user flow for editing a project
    await userEvent.click(canvas.getByText('Deploy model', { selector: 'button' }));

    // get modal
    const body = within(canvasElement.ownerDocument.body);
    const nameInput = body.getByRole('textbox', { name: 'Model Name' });
    const updateButton = body.getByText('Deploy', { selector: 'button' });

    // test that you can not submit on empty
    await userEvent.clear(nameInput);
    expect(updateButton).toBeDisabled();
  },
};
