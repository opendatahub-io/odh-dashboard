import '@testing-library/jest-dom';
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
        'To use AutoRAG, you need access to a pipeline server. Create or edit a pipeline server on the Pipelines page.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('go-to-pipelines-link')).toHaveTextContent('Go to Pipelines');
  });

  it('renders a link to the pipelines route with the correct namespace', () => {
    render(
      <MemoryRouter>
        <NoPipelineServer namespace="my-project" />
      </MemoryRouter>,
    );

    const link = screen.getByTestId('go-to-pipelines-link');
    expect(link).toHaveAttribute('href', '/develop-train/pipelines/definitions/my-project');
  });
});
