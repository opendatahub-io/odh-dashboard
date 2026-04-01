import '@testing-library/jest-dom';
import { pipelinesBaseRoute } from '@odh-dashboard/internal/routes/pipelines/global';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NoPipelineServer from '~/app/components/empty-states/NoPipelineServer';

describe('NoPipelineServer', () => {
  it('renders Empty State A (configure compatible pipeline server)', () => {
    render(
      <MemoryRouter>
        <NoPipelineServer />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Configure a compatible pipeline server' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'To use AutoML, you need access to a pipeline server with AutoML and AutoRAG enabled. Create or edit a pipeline server on the Pipelines page.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('go-to-pipelines-link')).toHaveTextContent('Go to Pipelines');
  });

  it('renders link to pipelines route for namespace', () => {
    render(
      <MemoryRouter>
        <NoPipelineServer namespace="my-project" />
      </MemoryRouter>,
    );

    const control = screen.getByTestId('go-to-pipelines-link');
    expect(control.closest('a')).toHaveAttribute('href', pipelinesBaseRoute('my-project'));
  });
});
