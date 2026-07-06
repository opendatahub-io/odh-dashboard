import '@testing-library/jest-dom';
import { pipelinesBaseRoute } from '@odh-dashboard/internal/routes/pipelines/global';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PipelineServerNotReady from '~/app/components/empty-states/PipelineServerNotReady';

describe('PipelineServerNotReady', () => {
  it('should render title', () => {
    render(
      <MemoryRouter>
        <PipelineServerNotReady />
      </MemoryRouter>,
    );

    expect(screen.getByText('There is a problem with the pipeline server')).toBeInTheDocument();
  });

  it('should render a link to the pipelines page with default namespace', () => {
    render(
      <MemoryRouter>
        <PipelineServerNotReady />
      </MemoryRouter>,
    );

    const link = screen.getByTestId('go-to-pipelines-link');
    expect(link).toHaveTextContent('View error details');
    const anchor = link.closest('a');
    expect(anchor).not.toBeNull();
    expect(anchor).toHaveAttribute('href', pipelinesBaseRoute(undefined));
  });

  it('should render a link to the pipelines page for namespace', () => {
    render(
      <MemoryRouter>
        <PipelineServerNotReady namespace="my-project" />
      </MemoryRouter>,
    );

    const link = screen.getByTestId('go-to-pipelines-link');
    expect(link).toHaveTextContent('View error details');
    const anchor = link.closest('a');
    expect(anchor).not.toBeNull();
    expect(anchor).toHaveAttribute('href', pipelinesBaseRoute('my-project'));
  });
});
