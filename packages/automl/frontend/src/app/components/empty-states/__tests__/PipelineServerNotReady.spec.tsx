import '@testing-library/jest-dom';
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

  it('should render a link to the pipelines page', () => {
    render(
      <MemoryRouter>
        <PipelineServerNotReady namespace="my-project" />
      </MemoryRouter>,
    );

    const link = screen.getByTestId('go-to-pipelines-link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent('View error details');
  });
});
