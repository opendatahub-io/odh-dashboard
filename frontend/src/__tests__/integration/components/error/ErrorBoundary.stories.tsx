import React from 'react';
import { Meta, StoryObj } from '@storybook/react';
import ErrorBoundary from '~/components/error/ErrorBoundary';

export default {
  component: ErrorBoundary,
} as Meta<typeof ErrorBoundary>;

const Throw = () => {
  throw new SyntaxError('This is only a test.');
};

export const CatchError: StoryObj<React.ComponentProps<typeof ErrorBoundary>> = {
  render: () => (
    <ErrorBoundary>
      <Throw />
    </ErrorBoundary>
  ),
};
