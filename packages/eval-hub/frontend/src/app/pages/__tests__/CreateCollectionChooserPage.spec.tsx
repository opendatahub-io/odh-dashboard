import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import CreateCollectionChooserPage from '~/app/pages/CreateCollectionChooserPage';

jest.mock('@odh-dashboard/ui-core', () => ({
  ...jest.requireActual('@odh-dashboard/ui-core'),
  ...require('~/__tests__/unit/testUtils/mocks').mockApplicationsPageModule({
    includeBreadcrumb: true,
  }),
}));

jest.mock('~/app/hooks/useNamespaceSelectorWithPersistence', () => ({
  useNamespaceSelectorWithPersistence: () => ({
    namespaces: [{ name: 'test-project', displayName: 'Test Project' }],
  }),
}));

const LocationDisplay: React.FC = () => {
  const { pathname } = useLocation();
  return <div data-testid="location-pathname">{pathname}</div>;
};

describe('CreateCollectionChooserPage', () => {
  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/evaluation/test-project/create-suite']}>
        <LocationDisplay />
        <Routes>
          <Route
            path="/evaluation/:namespace/create-suite"
            element={<CreateCollectionChooserPage />}
          />
          <Route
            path="/evaluation/:namespace/create-suite/from-goal"
            element={<div data-testid="goal-collection-builder-route" />}
          />
        </Routes>
      </MemoryRouter>,
    );

  it('should show the collection creation options and link to goal-based collection creation', () => {
    renderPage();

    expect(screen.getByTestId('page-title')).toHaveTextContent('Create collection');
    expect(screen.getByTestId('page-description')).toHaveTextContent(
      'Choose how you want to add benchmarks to your collection.',
    );
    expect(screen.getByText('Create collection', { selector: 'li' })).toBeInTheDocument();

    const goalTile = screen.getByTestId('build-collection-from-goal-tile');
    expect(goalTile).toHaveTextContent('Build from a goal');
    expect(goalTile).toHaveTextContent(
      'Describe what you want to evaluate. AI suggests benchmarks from the catalog for you to review and adjust.',
    );
    expect(screen.getByRole('link', { name: /Build from a goal/ })).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Choose your own benchmarks/ })).toHaveTextContent(
      'Browse the catalog, select benchmarks for your collection, and configure their settings.',
    );
  });

  it('should navigate to the goal-based collection builder', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('build-collection-from-goal-tile'));

    expect(screen.getByTestId('location-pathname')).toHaveTextContent(
      '/evaluation/test-project/create-suite/from-goal',
    );
    expect(screen.getByTestId('goal-collection-builder-route')).toBeInTheDocument();
  });

  it('should navigate to the existing manual suite form', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('choose-own-benchmarks-tile'));

    expect(screen.getByTestId('location-pathname')).toHaveTextContent(
      '/evaluation/test-project/create/collections/new',
    );
  });
});
