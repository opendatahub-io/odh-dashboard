import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import SpinnerEmptyState from '../SpinnerEmptyState';

describe('SpinnerEmptyState', () => {
  it('renders the title and description', () => {
    render(<SpinnerEmptyState title="Loading" description="Please wait." />);

    expect(screen.getByRole('heading', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.getByText('Please wait.')).toBeInTheDocument();
  });

  it('renders no footer when not provided', () => {
    render(<SpinnerEmptyState title="Loading" description="Please wait." />);

    expect(screen.queryByText('Extra content')).not.toBeInTheDocument();
  });

  it('renders footer content when provided', () => {
    render(
      <SpinnerEmptyState
        title="Loading"
        description="Please wait."
        footer={<span>Extra content</span>}
      />,
    );

    expect(screen.getByText('Extra content')).toBeInTheDocument();
  });

  it('applies a custom data-testid', () => {
    render(
      <SpinnerEmptyState title="Loading" description="Please wait." data-testid="my-spinner" />,
    );

    expect(screen.getByTestId('my-spinner')).toBeInTheDocument();
  });
});
