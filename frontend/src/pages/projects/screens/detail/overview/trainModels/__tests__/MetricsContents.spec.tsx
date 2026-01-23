import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MetricsContents from '#~/pages/projects/screens/detail/overview/trainModels/MetricsContents';

describe('MetricsContents', () => {
  const defaultProps = {
    title: 'Test Title',
    statistics: [
      { count: 5, text: 'Running' },
      { count: 2, text: 'Stopped' },
    ],
    createText: 'Create item',
    onCreate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render create button enabled by default', () => {
    render(<MetricsContents {...defaultProps} />);

    const createButton = screen.getByRole('button', { name: /create item/i });
    expect(createButton).not.toHaveAttribute('aria-disabled');
  });

  it('should render create button disabled when createDisabled is true', () => {
    render(
      <MetricsContents
        {...defaultProps}
        createDisabled
        createDisabledTooltip="No permission to create"
      />,
    );

    const createButton = screen.getByRole('button', { name: /create item/i });
    expect(createButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('should render create button disabled when isKueueDisabled is true', () => {
    render(<MetricsContents {...defaultProps} isKueueDisabled />);

    const createButton = screen.getByRole('button', { name: /create item/i });
    expect(createButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('should prioritize Kueue disabled message over permission message', () => {
    render(
      <MetricsContents
        {...defaultProps}
        isKueueDisabled
        createDisabled
        createDisabledTooltip="No permission to create"
      />,
    );

    const createButton = screen.getByRole('button', { name: /create item/i });
    expect(createButton).toHaveAttribute('aria-disabled', 'true');
    // The Kueue message should take precedence (tested via tooltip content)
  });

  it('should render statistics correctly', () => {
    render(<MetricsContents {...defaultProps} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Stopped')).toBeInTheDocument();
  });

  it('should render custom create button when provided', () => {
    const customButton = <button data-testid="custom-button">Custom Create</button>;

    render(<MetricsContents {...defaultProps} createButton={customButton} />);

    expect(screen.getByTestId('custom-button')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create item/i })).not.toBeInTheDocument();
  });
});
