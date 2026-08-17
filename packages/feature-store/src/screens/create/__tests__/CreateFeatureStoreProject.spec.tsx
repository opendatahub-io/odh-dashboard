import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import CreateFeatureStoreProject from '../CreateFeatureStoreProject';
import useExistingFeatureStores from '../../../hooks/useExistingFeatureStores';

jest.mock('../../../hooks/useExistingFeatureStores');
jest.mock('../CreateFeatureStoreProjectWizard', () => ({
  __esModule: true,
  default: () => <div data-testid="wizard-content">Wizard Content</div>,
}));
jest.mock('@odh-dashboard/ui-core', () => ({
  ApplicationsPage: ({
    children,
    loaded,
    title,
  }: {
    children: React.ReactNode;
    loaded: boolean;
    title?: string;
  }) => (
    <div data-testid="applications-page" data-loaded={loaded} data-title={title}>
      {loaded ? children : null}
    </div>
  ),
}));

const useExistingFeatureStoresMock = useExistingFeatureStores as jest.Mock;

describe('CreateFeatureStoreProject', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows spinner while loading', () => {
    useExistingFeatureStoresMock.mockReturnValue({
      loaded: false,
      error: undefined,
      existingProjectNames: [],
      hasUILabeledStore: false,
      primaryStore: undefined,
    });

    render(
      <MemoryRouter>
        <CreateFeatureStoreProject />
      </MemoryRouter>,
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders wizard when loaded', () => {
    useExistingFeatureStoresMock.mockReturnValue({
      loaded: true,
      error: undefined,
      existingProjectNames: [],
      hasUILabeledStore: false,
      primaryStore: undefined,
    });

    render(
      <MemoryRouter>
        <CreateFeatureStoreProject />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('wizard-content')).toBeInTheDocument();
  });

  it('passes page title and description', () => {
    useExistingFeatureStoresMock.mockReturnValue({
      loaded: true,
      error: undefined,
      existingProjectNames: [],
      hasUILabeledStore: false,
      primaryStore: undefined,
    });

    render(
      <MemoryRouter>
        <CreateFeatureStoreProject />
      </MemoryRouter>,
    );

    const page = screen.getByTestId('applications-page');
    expect(page).toHaveAttribute('data-title', 'Create feature store');
  });
});
