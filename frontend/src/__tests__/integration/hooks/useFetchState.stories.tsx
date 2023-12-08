import React from 'react';
import { Meta, StoryFn } from '@storybook/react';
import useFetchState from '~/utilities/useFetchState';
import { TestHook } from './TestHook';

export default {
  component: TestHook,
  parameters: {
    a11y: {
      disable: true,
    },
  },
} as Meta<typeof TestHook>;

const Template: StoryFn<typeof TestHook> = (args) => <TestHook {...args} />;

export const Success = {
  render: Template,
  args: {
    hook: useFetchState,
    defaultHookParams: [
      (): Promise<string> => Promise.resolve('success-test-state'),
      'default-test-state',
    ],
  },
};

export const Failure = {
  render: Template,
  args: {
    hook: useFetchState,
    defaultHookParams: [
      (): Promise<string> => Promise.reject('error-test-state'),
      'default-test-state',
    ],
  },
};

export const Stable = {
  render: Template,
  args: {
    hook: useFetchState,
    defaultHookParams: [(): Promise<number[]> => Promise.resolve([1, 2, 3]), []],
    hookParams: [
      [(): Promise<number[]> => Promise.resolve([1, 2, 4]), []],
      [(): Promise<number[]> => Promise.resolve([1, 2, 4]), []],
      [
        (): Promise<{
          a: number;
          b: {
            c: number;
          };
        }> => Promise.resolve({ a: 1, b: { c: 2 } }),
        {},
      ],
      [(): Promise<string> => Promise.reject('error-test-state'), {}],
    ],
  },
};

export const RefreshRate = {
  render: Template,
  args: {
    hook: useFetchState,
    defaultHookParams: [(): Promise<number[]> => Promise.resolve([1, 2, 3]), [], 1000],
    hookParams: [[(): Promise<number[]> => Promise.resolve([1, 2, 4]), [], 1000]],
  },
};
