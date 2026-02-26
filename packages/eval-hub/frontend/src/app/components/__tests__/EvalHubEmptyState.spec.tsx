import * as React from 'react';
import { render, screen } from '@testing-library/react';
import EvalHubEmptyState from '../EvalHubEmptyState';

describe('EvalHubEmptyState', () => {
  it('should render the empty state heading', () => {
    render(<EvalHubEmptyState />);
    expect(screen.getByTestId('eval-hub-empty-state')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'No existing evaluation runs' }),
    ).toBeInTheDocument();
  });

  it('should render the description body', () => {
    render(<EvalHubEmptyState />);
    expect(screen.getByTestId('eval-hub-empty-state-body')).toHaveTextContent(
      'No evaluation runs have been started in this project. Start a new evaluation run, or select a different project.',
    );
  });

  it('should render the create evaluation button', () => {
    render(<EvalHubEmptyState />);
    expect(screen.getByTestId('create-evaluation-button')).toBeInTheDocument();
    expect(screen.getByTestId('create-evaluation-button')).toHaveTextContent(
      'Create new evaluation',
    );
  });
});
