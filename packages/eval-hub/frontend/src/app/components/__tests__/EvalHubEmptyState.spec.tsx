import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EvalHubEmptyState from '~/app/components/EvalHubEmptyState';

const renderWithRouter = () =>
  render(
    <MemoryRouter>
      <EvalHubEmptyState />
    </MemoryRouter>,
  );

describe('EvalHubEmptyState', () => {
  it('should render the empty state heading', () => {
    renderWithRouter();
    expect(screen.getByTestId('eval-hub-empty-state')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'No evaluation runs' })).toBeInTheDocument();
  });

  it('should render the description body', () => {
    renderWithRouter();
    expect(screen.getByTestId('eval-hub-empty-state-body')).toHaveTextContent(
      'Start an evaluation run, or select a different project to view its runs.',
    );
  });

  it('should render the create evaluation button', () => {
    renderWithRouter();
    expect(screen.getByTestId('create-evaluation-button')).toBeInTheDocument();
    expect(screen.getByTestId('create-evaluation-button')).toHaveTextContent(
      'Start evaluation run',
    );
  });
});
