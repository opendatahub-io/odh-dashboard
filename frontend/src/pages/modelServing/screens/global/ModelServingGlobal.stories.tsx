import React from 'react';

import { ComponentStory, ComponentMeta } from '@storybook/react';
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
import ModelServingGlobal from './ModelServingGlobal';

export default {
  title: 'ModelServingGlobal',
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
} as ComponentMeta<typeof ModelServingGlobal>;

const Template: ComponentStory<typeof ModelServingGlobal> = (args) => (
  <Routes>
    <Route path="/" element={<ModelServingContextProvider />}>
      <Route index element={<ModelServingGlobal {...args} />} />
    </Route>
  </Routes>
);

export const Default = Template.bind({});
Default.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  // test that values from api are be displayed correctly
  expect(
    await canvas.findByText('Test Inference Service', undefined, { timeout: 5000 }),
  ).toBeInTheDocument();
  expect(await canvas.findByText('Test Project')).toBeInTheDocument();
};

export const EditModel = Template.bind({});
EditModel.parameters = {
  a11y: {
    // need to select modal as root
    element: '.pf-c-backdrop',
  },
};
EditModel.play = async ({ canvasElement }) => {
  // load page and wait until settled
  const canvas = within(canvasElement);
  await canvas.findByText('Test Inference Service', undefined, { timeout: 5000 });

  // user flow for editing a project
  await userEvent.click(canvas.getByLabelText('Actions', { selector: 'button' }));
  await userEvent.click(canvas.getByText('Edit', { selector: 'button' }));

  // get modal
  const body = within(canvasElement.ownerDocument.body);
  const nameInput = body.getByRole('textbox', { name: 'Model Name' });
  const updateButton = body.getByText('Deploy', { selector: 'button' });

  // test that you can not submit on empty
  await userEvent.clear(nameInput);
  expect(updateButton).toBeDisabled();

  // test that you can update the name to a different name
  await userEvent.type(nameInput, 'Updated Model Name', { delay: 50 });
  expect(updateButton).not.toBeDisabled();

  // test that user cant upload on an empty new secret
  const newDbc = body.getByRole('radio', { name: 'New data connection' });
  await userEvent.click(newDbc);
  expect(updateButton).toBeDisabled();

  // test that adding required values validates submit
  const showPassword = body.getByRole('button', { name: 'Show password' });
  await userEvent.click(showPassword);

  const secretName = body.getByRole('textbox', { name: 'AWS field Name' });
  const secretKey = body.getByRole('textbox', { name: 'AWS field AWS_ACCESS_KEY_ID' });
  const secretValue = body.getByRole('textbox', { name: 'AWS field AWS_SECRET_ACCESS_KEY' });

  await userEvent.type(secretName, 'Test Secret', { delay: 50 });
  await userEvent.type(secretKey, 'test-secret-key', { delay: 50 });
  await userEvent.type(secretValue, 'test-secret-password', { delay: 50 });
  expect(updateButton).not.toBeDisabled();
};

export const DeleteModel = Template.bind({});
DeleteModel.parameters = {
  a11y: {
    element: '.pf-c-backdrop',
  },
};
DeleteModel.play = async ({ canvasElement }) => {
  // load page and wait until settled
  const canvas = within(canvasElement);
  await canvas.findByText('Test Inference Service', undefined, { timeout: 5000 });

  // user flow for deleting a project
  await userEvent.click(canvas.getByLabelText('Actions', { selector: 'button' }));
  await userEvent.click(canvas.getByText('Delete', { selector: 'button' }));

  // get modal
  const body = within(canvasElement.ownerDocument.body);
  const retypeNameInput = body.getByRole('textbox', { name: 'Delete modal input' });
  const deleteButton = body.getByText('Delete deployed model', { selector: 'button' });

  // test that empty input disables form
  expect(deleteButton).toBeDisabled();

  // test that you can not submit on wrong input
  await userEvent.type(retypeNameInput, 'incorrect name', { delay: 50 });
  expect(deleteButton).toBeDisabled();
  await userEvent.clear(retypeNameInput);

  // test that you can delete on correct input
  await userEvent.type(retypeNameInput, 'Test Inference Service', { delay: 50 });
  expect(deleteButton).not.toBeDisabled();
};

export const DeployModel = Template.bind({});
DeployModel.parameters = {
  a11y: {
    // need to select modal as root
    element: '.pf-c-backdrop',
  },
};
DeployModel.play = async ({ canvasElement }) => {
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

  // fill the form
  await userEvent.type(nameInput, 'Model Name', { delay: 50 });
  body.getAllByRole('button', { name: 'Options menu' });
  await userEvent.click(body.getAllByRole('button', { name: 'Options menu' })[0]);
  await userEvent.click(body.getByText('Test Project', { selector: 'button' }));
  await body.findByText('Select a framework');
  await userEvent.click(body.getAllByRole('button', { name: 'Options menu' })[1]);
  await userEvent.click(body.getByText('onnx - 1'));
  await body.findByText('Select...');
  await userEvent.click(body.getAllByRole('button', { name: 'Options menu' })[2]);
  await body.findByText('Test Secret');
  await userEvent.click(body.getByText('Test Secret'));
  expect(updateButton).not.toBeDisabled();

  await userEvent.click(body.getByRole('radio', { name: 'New data connection' }));
  expect(updateButton).toBeDisabled();

  // test that adding required values validates submit
  const showPassword = body.getByRole('button', { name: 'Show password' });
  await userEvent.click(showPassword);

  const secretName = body.getByRole('textbox', { name: 'AWS field Name' });
  const secretKey = body.getByRole('textbox', { name: 'AWS field AWS_ACCESS_KEY_ID' });
  const secretValue = body.getByRole('textbox', { name: 'AWS field AWS_SECRET_ACCESS_KEY' });

  await userEvent.type(secretName, 'Test Secret', { delay: 50 });
  await userEvent.type(secretKey, 'test-secret-key', { delay: 50 });
  await userEvent.type(secretValue, 'test-secret-password', { delay: 50 });
  expect(updateButton).not.toBeDisabled();
};
