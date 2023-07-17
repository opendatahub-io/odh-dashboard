import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import { rest } from 'msw';
import useGroups from '~/pages/projects/projectSharing/useGroups';
import { TestHook } from './TestHook';

export default {
  component: TestHook,
  parameters: {
    a11y: {
      disable: true,
    },
  },
} as Meta<typeof TestHook>;

const Template = (args: React.ComponentProps<typeof TestHook>) => <TestHook {...args} />;

export const Success: StoryObj<typeof TestHook> = {
  render: Template,
  args: {
    hook: useGroups,
    defaultHookParams: [],
  },
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/k8s/apis/user.openshift.io/v1/groups', (req, res, ctx) =>
          res(
            ctx.json({
              items: [{ name: 'item1' }, { name: 'item2' }],
            }),
          ),
        ),
      ],
    },
  },
};

export const Error403: StoryObj<typeof TestHook> = {
  render: Template,
  args: {
    hook: useGroups,
    defaultHookParams: [],
  },
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/k8s/apis/user.openshift.io/v1/groups', (req, res, ctx) =>
          res(
            ctx.status(403),
            ctx.json({
              kind: 'Status',
              code: 403,
            }),
          ),
        ),
      ],
    },
  },
};

export const Error404 = {
  render: Template,
  args: {
    hook: useGroups,
    defaultHookParams: [],
  },
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/k8s/apis/user.openshift.io/v1/groups', (req, res, ctx) =>
          res(
            ctx.status(404),
            ctx.json({
              kind: 'Status',
              code: 404,
            }),
          ),
        ),
      ],
    },
  },
};

export const Error500 = {
  render: Template,
  args: {
    hook: useGroups,
    defaultHookParams: [],
  },
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/k8s/apis/user.openshift.io/v1/groups', (req, res, ctx) =>
          res(ctx.status(500)),
        ),
      ],
    },
  },
};
