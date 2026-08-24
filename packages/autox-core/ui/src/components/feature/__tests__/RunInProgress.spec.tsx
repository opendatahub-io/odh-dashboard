import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RunInProgress from '../RunInProgress';

const Icon = () => <img src="empty.svg" alt="Run in progress" />;

describe('RunInProgress', () => {
  it('renders the product-specific title and action label', () => {
    render(
      <MemoryRouter>
        <RunInProgress productName="AutoML" icon={Icon} viewRunsRoute="/experiments/ns" />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Your AutoML run is currently in progress' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View my AutoML runs' })).toBeInTheDocument();
    expect(screen.getByTestId('run-in-progress')).toBeInTheDocument();
  });

  it('uses a custom data-testid when provided', () => {
    render(
      <MemoryRouter>
        <RunInProgress
          productName="AutoRAG"
          icon={Icon}
          viewRunsRoute="/experiments/ns"
          data-testid="autorag-run-in-progress"
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('autorag-run-in-progress')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Your AutoRAG run is currently in progress' }),
    ).toBeInTheDocument();
  });
});
