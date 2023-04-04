import React from 'react';

import { ComponentStory, ComponentMeta } from '@storybook/react';
import { rest } from 'msw';
import { within, userEvent } from '@storybook/testing-library';
import { expect } from '@storybook/jest';
import { mockClusterSettings } from '~/__mocks__/mockClusterSettings';
import ClusterSettings from './ClusterSettings';
import { CULLER_TIMEOUT_HINT, PVC_SIZE_HINT, TOLERATION_FORMAT_ERROR } from './const';

export default {
  title: 'ClusterSettings',
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
} as ComponentMeta<typeof ClusterSettings>;

const Template: ComponentStory<typeof ClusterSettings> = (args) => <ClusterSettings {...args} />;

export const Default = Template.bind({});
Default.play = async ({ canvasElement }) => {
  // load page and wait until settled
  const canvas = within(canvasElement);
  await canvas.findByText('Save changes', undefined, { timeout: 5000 });

  const submitButton = canvas.getByTestId('submit-cluster-settings');

  // check PVC size field
  const pvcInputField = canvas.getByTestId('pvc-size-input');
  const pvcHint = canvas.getByText(PVC_SIZE_HINT).closest('.pf-c-helper-text__item');
  userEvent.clear(pvcInputField);
  await userEvent.type(pvcInputField, '10', { delay: 50 });
  expect(submitButton).toBeEnabled();
  userEvent.clear(pvcInputField);
  expect(submitButton).toBeDisabled();
  expect(pvcHint).toHaveClass('pf-m-error');
  userEvent.click(canvas.getByTestId('restore-default-button'));
  expect(pvcHint).toHaveClass('pf-m-indeterminate');

  // check culler field
  const cullerHint = canvas.getByText(CULLER_TIMEOUT_HINT).closest('.pf-c-helper-text__item');
  userEvent.click(canvas.getByTestId('culler-timeout-limited'));
  expect(submitButton).toBeEnabled();
  userEvent.clear(canvas.getByTestId('hour-input'));
  expect(submitButton).toBeDisabled();
  expect(cullerHint).toHaveClass('pf-m-error');
  await userEvent.type(canvas.getByTestId('minute-input'), '20', { delay: 50 });
  expect(submitButton).toBeEnabled();
  expect(cullerHint).toHaveClass('pf-m-indeterminate');
  userEvent.click(canvas.getByTestId('culler-timeout-unlimited'));
  expect(submitButton).toBeDisabled();

  // check user tracking field
  const telemetryCheckbox = canvas.getByTestId('usage-data-checkbox');
  userEvent.click(telemetryCheckbox);
  expect(submitButton).toBeEnabled();
  userEvent.click(telemetryCheckbox);
  expect(submitButton).toBeDisabled();

  // check notebook toleration field
  const tolerationKeyInput = canvas.getByTestId('toleration-key-input');
  expect(canvas.queryByText(TOLERATION_FORMAT_ERROR)).toBeNull();
  userEvent.clear(tolerationKeyInput);
  expect(canvas.getByText(TOLERATION_FORMAT_ERROR)).toBeInTheDocument();
  expect(submitButton).toBeDisabled();
  await userEvent.type(tolerationKeyInput, 'NotebooksOnlyChange', { delay: 50 });
  expect(canvas.queryByText(TOLERATION_FORMAT_ERROR)).toBeNull();
  userEvent.click(canvas.getByTestId('tolerations-enabled-checkbox'));
  expect(submitButton).toBeEnabled();
};
