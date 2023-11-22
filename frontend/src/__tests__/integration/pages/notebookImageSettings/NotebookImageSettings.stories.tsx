/* eslint-disable camelcase */
import React from 'react';
import { Meta, StoryFn, StoryObj } from '@storybook/react';
import { rest } from 'msw';
import { userEvent, within } from '@storybook/testing-library';
import BYONImages from '~/pages/BYONImages/BYONImages';
import { mockByon } from '~/__mocks__/mockByon';

export default {
  component: BYONImages,
} as Meta<typeof BYONImages>;

const Template: StoryFn<typeof BYONImages> = (args) => <BYONImages {...args} />;

export const Default: StoryObj = {
  render: Template,
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/images/byon', (req, res, ctx) =>
          res(ctx.json(mockByon([{ url: 'test-image:latest' }]))),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Testing Custom Image', undefined, { timeout: 5000 });
  },
};

export const Empty: StoryObj = {
  render: Template,
  parameters: {
    msw: {
      handlers: [rest.get('/api/images/byon', (req, res, ctx) => res(ctx.json([])))],
    },
  },
  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('No custom notebook images found.', undefined, { timeout: 5000 });
  },
};

export const LoadingError: StoryObj = {
  render: Template,
  parameters: {
    msw: {
      handlers: [rest.get('/api/images/byon', (req, res, ctx) => res(ctx.status(404)))],
    },
  },
  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Unable to load notebook images.', undefined, { timeout: 5000 });
  },
};

export const LargeList: StoryObj = {
  render: Template,
  parameters: {
    msw: {
      handlers: [
        rest.get('/api/images/byon', (req, res, ctx) =>
          res(
            ctx.json(
              Array.from(
                { length: 1000 },
                (_, i) =>
                  mockByon([
                    {
                      id: `id-${i}`,
                      display_name: `image-${i}`,
                      name: `byon-${i}`,
                      description: `description-${i}`,
                      provider: `provider-${i}`,
                      visible: i % 3 === 0,
                    },
                  ])[0],
              ),
            ),
          ),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('image-0', undefined, { timeout: 5000 });
  },
};

export const ImageError: StoryObj = {
  render: Template,
  parameters: {
    msw: {
      handlers: [
        rest.post('/api/images', (req, res, ctx) =>
          res(
            ctx.json({
              success: false,
              error: 'Testing create error message',
            }),
          ),
        ),
        rest.put('/api/images/byon-1', (req, res, ctx) =>
          res(
            ctx.json({
              success: false,
              error: 'Testing edit error message',
            }),
          ),
        ),
        rest.delete('/api/images/byon-1', (req, res, ctx) =>
          res(ctx.status(404, 'Testing delete error message')),
        ),
        rest.get('/api/images/byon', (req, res, ctx) =>
          res(
            ctx.json(
              mockByon([
                {
                  name: 'byon-1',
                  error: 'Testing error message',
                },
              ]),
            ),
          ),
        ),
      ],
    },
  },
  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Testing Custom Image', undefined, { timeout: 5000 });
  },
};

// Strictly for testing a11y accessibility
export const EditModal: StoryObj = {
  render: Template,
  parameters: {
    a11y: {
      // need to select modal as root
      element: '.pf-c-backdrop',
    },
    msw: {
      handlers: [rest.get('/api/images/byon', (req, res, ctx) => res(ctx.json(mockByon())))],
    },
  },
  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Testing Custom Image', undefined, { timeout: 5000 });

    await canvas.getByRole('button', { name: 'Actions' }).click();
    await canvas.getByRole('menuitem', { name: 'Edit' }).click();
  },
};

// Strictly for testing a11y accessibility
export const DeleteModal: StoryObj = {
  render: Template,
  parameters: {
    a11y: {
      element: '.pf-c-backdrop',
    },
    msw: {
      handlers: [rest.get('/api/images/byon', (req, res, ctx) => res(ctx.json(mockByon())))],
    },
  },
  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Testing Custom Image', undefined, { timeout: 5000 });

    await canvas.getByRole('button', { name: 'Actions' }).click();
    await canvas.getByRole('menuitem', { name: 'Delete' }).click();
  },
};

// Strictly for testing a11y accessibility
export const ImportModal: StoryObj = {
  render: Template,
  parameters: {
    a11y: {
      element: '.pf-c-backdrop',
    },
    msw: {
      handlers: [rest.get('/api/images/byon', (req, res, ctx) => res(ctx.json(mockByon())))],
    },
  },
  play: async ({ canvasElement }) => {
    // load page and wait until settled
    const canvas = within(canvasElement);
    await canvas.findByText('Testing Custom Image', undefined, { timeout: 5000 });

    userEvent.click(canvas.getByRole('button', { name: 'Import new image' }));

    const body = within(canvasElement.ownerDocument.body.ownerDocument.body);

    userEvent.click(await body.findByTestId('add-software-button'));
  },
};
