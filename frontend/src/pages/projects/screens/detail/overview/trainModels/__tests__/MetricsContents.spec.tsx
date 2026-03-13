import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import MetricsContents from '#~/pages/projects/screens/detail/overview/trainModels/MetricsContents';

describe('MetricsContents', () => {
  const defaultProps = {
    title: 'Test Title',
    statistics: [
      { count: 5, text: 'Running' },
      { count: 2, text: 'Stopped' },
    ],
    createText: 'Create item',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render create button enabled by default', () => {
    render(
      <MemoryRouter>
        <MetricsContents {...defaultProps} />
      </MemoryRouter>,
    );

    const createButton = screen.getByRole('link', { name: /create item/i });
    expect(createButton).not.toHaveAttribute('aria-disabled');
  });

  it('should render create button disabled when createDisabled is true', () => {
    render(
      <MemoryRouter>
        <MetricsContents
          {...defaultProps}
          createDisabled
          createDisabledTooltip="No permission to create"
        />
      </MemoryRouter>,
    );

    const createButton = screen.getByRole('link', { name: /create item/i });
    expect(createButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('should render create button disabled when isKueueDisabled is true', () => {
    render(
      <MemoryRouter>
        <MetricsContents {...defaultProps} isKueueDisabled />
      </MemoryRouter>,
    );

    const createButton = screen.getByRole('link', { name: /create item/i });
    expect(createButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('should prioritize Kueue disabled message over permission message', () => {
    render(
      <MemoryRouter>
        <MetricsContents
          {...defaultProps}
          isKueueDisabled
          createDisabled
          createDisabledTooltip="No permission to create"
        />
      </MemoryRouter>,
    );

    const createButton = screen.getByRole('link', { name: /create item/i });
    expect(createButton).toHaveAttribute('aria-disabled', 'true');
  });

  it('should render statistics correctly', () => {
    render(
      <MemoryRouter>
        <MetricsContents {...defaultProps} />
      </MemoryRouter>,
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Stopped')).toBeInTheDocument();
  });

  it('should render custom create button when provided', () => {
    const customButton = <button data-testid="custom-button">Custom Create</button>;

    render(
      <MemoryRouter>
        <MetricsContents {...defaultProps} createButton={customButton} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('custom-button')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /create item/i })).not.toBeInTheDocument();
  });
});
