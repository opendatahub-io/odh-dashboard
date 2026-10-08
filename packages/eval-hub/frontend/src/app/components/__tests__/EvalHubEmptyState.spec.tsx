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
      'Go to benchmark suites to create a suite or run an individual benchmark, or select a different project to view its runs.',
    );
  });

  it('should render the view benchmark suites button', () => {
    renderWithRouter();
    expect(screen.getByTestId('create-evaluation-button')).toBeInTheDocument();
    expect(screen.getByTestId('create-evaluation-button')).toHaveTextContent(
      'View benchmark suites',
    );
  });

  it('should return to the Benchmark suites tab when viewing benchmark suites', () => {
    renderWithRouter();
    fireEvent.click(screen.getByTestId('create-evaluation-button'));

    expect(screen.getByTestId('location-search')).toHaveTextContent('?tab=evaluate');
  });
});
