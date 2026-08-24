import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PipelineServerStarting from '../PipelineServerStarting';

describe('PipelineServerStarting', () => {
  it('renders the starting message', () => {
    render(
      <MemoryRouter>
        <PipelineServerStarting />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Starting pipeline server' })).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-server-starting')).toBeInTheDocument();
  });

  it('uses a custom data-testid when provided', () => {
    render(
      <MemoryRouter>
        <PipelineServerStarting data-testid="custom-testid" />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('custom-testid')).toBeInTheDocument();
  });

  it('shows a "Show details" link when a namespace is provided', () => {
    render(
      <MemoryRouter>
        <PipelineServerStarting namespace="my-namespace" />
      </MemoryRouter>,
    );

    expect(screen.getByText('Show details')).toBeInTheDocument();
  });

  it('does not show a "Show details" link without a namespace', () => {
    render(
      <MemoryRouter>
        <PipelineServerStarting />
      </MemoryRouter>,
    );

    expect(screen.queryByText('Show details')).not.toBeInTheDocument();
  });
});
