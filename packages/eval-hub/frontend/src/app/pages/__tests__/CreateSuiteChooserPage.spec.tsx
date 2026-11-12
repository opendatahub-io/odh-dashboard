import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import CreateSuiteChooserPage from '~/app/pages/CreateSuiteChooserPage';

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

describe('CreateSuiteChooserPage', () => {
  const renderPage = () =>
    render(
      <MemoryRouter initialEntries={['/evaluation/test-project/create-suite']}>
        <LocationDisplay />
        <Routes>
          <Route path="/evaluation/:namespace/create-suite" element={<CreateSuiteChooserPage />} />
        </Routes>
      </MemoryRouter>,
    );

  it('should show the suite creation options and mark goal generation as unavailable', () => {
    renderPage();

    expect(screen.getByTestId('page-title')).toHaveTextContent('Create suite');
    expect(screen.getByTestId('page-description')).toHaveTextContent(
      'Choose how you want to add benchmarks to your suite.',
    );
    expect(screen.getByText('Create suite', { selector: 'li' })).toBeInTheDocument();

    const goalTile = screen.getByTestId('build-suite-from-goal-tile');
    expect(goalTile).toHaveAttribute('aria-disabled', 'true');
    expect(goalTile).toHaveTextContent('Build from a goal');
    expect(goalTile).toHaveTextContent('Coming soon');
    expect(goalTile).toHaveTextContent(
      'Describe what you want to evaluate. AI suggests benchmarks from the catalog for you to review and adjust.',
    );
    expect(screen.queryByRole('link', { name: /Build from a goal/ })).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Choose your own benchmarks/ })).toHaveTextContent(
      'Browse the catalog, select benchmarks for your suite, and configure their settings.',
    );
  });

  it('should navigate to the existing manual suite form', () => {
    renderPage();

    fireEvent.click(screen.getByTestId('choose-own-benchmarks-tile'));

    expect(screen.getByTestId('location-pathname')).toHaveTextContent(
      '/evaluation/test-project/create/collections/new',
    );
  });
});
