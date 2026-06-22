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
        'To use AutoML, go to the Pipelines page, then create a new pipeline server or edit an existing one using Manage pipeline server configuration. Under Advanced settings, check the Enable AutoML and AutoRAG pipelines option.',
      ),
    ).toBeInTheDocument();
    const goToPipelinesControl = screen.getByTestId('go-to-pipelines-link');
    expect(goToPipelinesControl).toHaveTextContent('Go to Pipelines');
    const defaultNamespaceAnchor = goToPipelinesControl.closest('a');
    expect(defaultNamespaceAnchor).not.toBeNull();
    expect(defaultNamespaceAnchor).toHaveAttribute('href', pipelinesBaseRoute(undefined));
  });

  it('renders link to pipelines route for namespace', () => {
    render(
      <MemoryRouter>
        <NoPipelineServer namespace="my-project" />
      </MemoryRouter>,
    );

    const control = screen.getByTestId('go-to-pipelines-link');
    const anchor = control.closest('a');
    expect(anchor).not.toBeNull();
    expect(anchor).toHaveAttribute('href', pipelinesBaseRoute('my-project'));
  });
});
