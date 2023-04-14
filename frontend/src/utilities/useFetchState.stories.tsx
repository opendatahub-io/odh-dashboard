import React from 'react';
import { ComponentStory, ComponentMeta } from '@storybook/react';
import { userEvent, within } from '@storybook/testing-library';
import { expect } from '@storybook/jest';
import useFetchState from './useFetchState';
import { TestHook } from './TestHook';

export default {
  title: 'useFetchState',
  component: TestHook,
  parameters: {
    a11y: {
      disable: true,
    },
  },
} as ComponentMeta<typeof TestHook>;

const Template: ComponentStory<typeof TestHook> = (args) => <TestHook {...args} />;

export const Success = Template.bind({});
Success.args = {
  hook: useFetchState,
  defaultHookParams: [() => Promise.resolve('success-test-state'), 'default-test-state'],
};

Success.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  // wait 2 seconds to settle
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // test that is loaded
  expect((await canvas.findByTestId('result-value-1')).innerText).toBe('true');

  // test that value is correct
  expect(canvas.getByTestId('result-value-0').innerText).toBe('"success-test-state"');
};

export const Failure = Template.bind({});
Failure.args = {
  hook: useFetchState,
  defaultHookParams: [() => Promise.reject('error-test-state'), 'default-test-state'],
};

Failure.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  // wait 2 seconds to settle
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // test that is loaded
  expect((await canvas.findByTestId('result-value-1')).innerText).toBe('false');

  // test that value is correct
  expect(canvas.getByTestId('result-value-0').innerText).toBe('"default-test-state"');

  // test that error is correct
  expect(canvas.getByTestId('result-value-2').innerText).toBe('"error-test-state"');
};

export const Stable = Template.bind({});
Stable.args = {
  hook: useFetchState,
  defaultHookParams: [() => Promise.resolve([1, 2, 3]), []],
  hookParams: [
    [() => Promise.resolve([1, 2, 4]), []],
    [() => Promise.resolve([1, 2, 4]), []],
    [() => Promise.resolve({ a: 1, b: { c: 2 } }), {}],
    [() => Promise.reject('error-test-state'), {}],
  ],
};

Stable.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  // wait 2 seconds to settle
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // test that is loaded
  expect((await canvas.findByTestId('result-value-1')).innerText).toBe('true');

  // test that result is unstable and func is stable
  // the result will always be unstable as it comes from a promise
  expect(canvas.getByTestId('result-status-0').innerText).toBe('unstable');
  expect(canvas.getByTestId('result-status-3').innerText).toBe('stable');

  // switch to params-0
  userEvent.click(canvas.getByTestId('params-0'));
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect(canvas.getByTestId('result-status-0').innerText).toBe('unstable');
  expect(canvas.getByTestId('result-status-3').innerText).toBe('stable');

  // switch to params-1
  userEvent.click(canvas.getByTestId('params-1'));
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect(canvas.getByTestId('result-status-0').innerText).toBe('unstable');
  expect(canvas.getByTestId('result-status-3').innerText).toBe('stable');

  // switch to params-2 (object)
  userEvent.click(canvas.getByTestId('params-2'));
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect(canvas.getByTestId('result-status-0').innerText).toBe('unstable');
  expect(canvas.getByTestId('result-status-3').innerText).toBe('stable');

  // switch to params-3 (error)
  userEvent.click(canvas.getByTestId('params-3'));
  await new Promise((resolve) => setTimeout(resolve, 1000));
  expect(canvas.getByTestId('result-status-0').innerText).toBe('stable');
  expect(canvas.getByTestId('result-value-2').innerText).toBe('"error-test-state"');
  expect((await canvas.findByTestId('result-value-1')).innerText).toBe('true');
};

export const RefreshRate = Template.bind({});
RefreshRate.args = {
  hook: useFetchState,
  defaultHookParams: [() => Promise.resolve([1, 2, 3]), [], 1000],
  hookParams: [[() => Promise.resolve([1, 2, 4]), [], 1000]],
};

RefreshRate.play = async ({ canvasElement }) => {
  const canvas = within(canvasElement);

  // wait 2 seconds to settle
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // test that is loaded
  expect((await canvas.findByTestId('result-value-1')).innerText).toBe('true');

  // test that result is unstable and func is stable
  // the result will always be unstable as it comes from a promise
  expect(canvas.getByTestId('result-status-0').innerText).toBe('unstable');
  expect(canvas.getByTestId('result-status-3').innerText).toBe('stable');

  // switch to params-0
  userEvent.click(canvas.getByTestId('params-0'));
  expect(canvas.getByTestId('result-status-0').innerText).toBe('unstable');
  expect(canvas.getByTestId('result-status-3').innerText).toBe('stable');
};
