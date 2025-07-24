import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnsureFeatureStoreAPIAvailability from '#~/pages/featureStore/EnsureAPIAvailability';
import { useFeatureStoreAPI } from '#~/pages/featureStore/FeatureStoreContext';
import { useFeatureStoreCR } from '#~/pages/featureStore/apiHooks/useFeatureStoreCR';
import { FeatureStoreAPIs } from '#~/pages/featureStore/types/global';
import { FetchStateObject } from '#~/utilities/useFetch';
import { FeatureStoreKind } from '#~/k8sTypes';

jest.mock('#~/pages/featureStore/FeatureStoreContext', () => ({
  useFeatureStoreAPI: jest.fn(),
}));

jest.mock('#~/pages/featureStore/apiHooks/useFeatureStoreCR', () => ({
  useFeatureStoreCR: jest.fn(),
}));

const useFeatureStoreAPIMock = jest.mocked(useFeatureStoreAPI);
const useFeatureStoreCRMock = jest.mocked(useFeatureStoreCR);

describe('EnsureFeatureStoreAPIAvailability', () => {
  const MockChildren = () => <div data-testid="children">Test Children</div>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for useFeatureStoreCR
    useFeatureStoreCRMock.mockReturnValue({
      data: { metadata: { name: 'feature-store' } } as FeatureStoreKind,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    } as FetchStateObject<FeatureStoreKind | null>);
  });

  it('should render children when API is available', () => {
    useFeatureStoreAPIMock.mockReturnValue({
      apiAvailable: true,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      api: {} as FeatureStoreAPIs,
      refreshAllAPI: jest.fn(),
    });

    render(
      <EnsureFeatureStoreAPIAvailability>
        <MockChildren />
      </EnsureFeatureStoreAPIAvailability>,
    );

    expect(screen.getByTestId('children')).toBeInTheDocument();
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
  });

  it('should render loading state when API is not available but CR exists', () => {
    useFeatureStoreAPIMock.mockReturnValue({
      apiAvailable: false,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      api: {} as FeatureStoreAPIs,
      refreshAllAPI: jest.fn(),
    });

    useFeatureStoreCRMock.mockReturnValue({
      data: { metadata: { name: 'feature-store' } } as FeatureStoreKind,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    } as FetchStateObject<FeatureStoreKind | null>);

    render(
      <EnsureFeatureStoreAPIAvailability>
        <MockChildren />
      </EnsureFeatureStoreAPIAvailability>,
    );

    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId('children')).not.toBeInTheDocument();

    // Check for the EmptyState container with data-id
    const emptyState = document.querySelector('[data-id="loading-empty-state"]');
    expect(emptyState).toBeInTheDocument();
  });

  it('should render children when API is not available but CR has error', () => {
    useFeatureStoreAPIMock.mockReturnValue({
      apiAvailable: false,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      api: {} as FeatureStoreAPIs,
      refreshAllAPI: jest.fn(),
    });

    useFeatureStoreCRMock.mockReturnValue({
      data: null,
      loaded: true,
      error: new Error('CR load error'),
      refresh: jest.fn(),
    } as FetchStateObject<FeatureStoreKind | null>);

    render(
      <EnsureFeatureStoreAPIAvailability>
        <MockChildren />
      </EnsureFeatureStoreAPIAvailability>,
    );

    expect(screen.getByTestId('children')).toBeInTheDocument();
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
  });

  it('should render children when API is not available and no CR exists', () => {
    useFeatureStoreAPIMock.mockReturnValue({
      apiAvailable: false,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      api: {} as FeatureStoreAPIs,
      refreshAllAPI: jest.fn(),
    });

    useFeatureStoreCRMock.mockReturnValue({
      data: null,
      loaded: true,
      error: undefined,
      refresh: jest.fn(),
    } as FetchStateObject<FeatureStoreKind | null>);

    render(
      <EnsureFeatureStoreAPIAvailability>
        <MockChildren />
      </EnsureFeatureStoreAPIAvailability>,
    );

    expect(screen.getByTestId('children')).toBeInTheDocument();
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
  });
});
