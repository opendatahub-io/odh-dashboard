import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import EvalHubEmptyState from '~/app/components/EvalHubEmptyState';

const LocationSearch: React.FC = () => {
  const { search } = useLocation();
  return <span data-testid="location-search">{search}</span>;
};

const renderWithRouter = () =>
  render(
    <MemoryRouter initialEntries={['/test-project?tab=runs']}>
      <Routes>
        <Route
          path="/:namespace"
          element={
            <>
              <EvalHubEmptyState />
              <LocationSearch />
            </>
          }
        />
      </Routes>
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

  it('should return to the Evaluate tab when starting an evaluation run', () => {
    renderWithRouter();
    fireEvent.click(screen.getByTestId('create-evaluation-button'));

    expect(screen.getByTestId('location-search')).toHaveTextContent('?tab=evaluate');
  });
});
