import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ActionableEmptyState from '../ActionableEmptyState';

const Icon = () => <img src="empty.svg" alt="An icon" />;

describe('ActionableEmptyState', () => {
  it('renders the title', () => {
    render(<ActionableEmptyState titleText="Nothing here" />);

    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeInTheDocument();
  });

  it('renders body content when provided', () => {
    render(<ActionableEmptyState titleText="Nothing here" body="More details." />);

    expect(screen.getByText('More details.')).toBeInTheDocument();
  });

  it('renders no body when not provided', () => {
    render(<ActionableEmptyState titleText="Nothing here" />);

    expect(screen.queryByText('More details.')).not.toBeInTheDocument();
  });

  it('renders the provided icon', () => {
    render(<ActionableEmptyState titleText="Nothing here" icon={Icon} />);

    expect(screen.getByAltText('An icon')).toBeInTheDocument();
  });

  it('renders no action button by default', () => {
    render(<ActionableEmptyState titleText="Nothing here" />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders an action button and calls onClick', () => {
    const onClick = jest.fn();
    render(
      <ActionableEmptyState titleText="Nothing here" action={{ label: 'Do something', onClick }} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Do something' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies a custom data-testid', () => {
    render(<ActionableEmptyState titleText="Nothing here" data-testid="my-empty-state" />);

    expect(screen.getByTestId('my-empty-state')).toBeInTheDocument();
  });
});
