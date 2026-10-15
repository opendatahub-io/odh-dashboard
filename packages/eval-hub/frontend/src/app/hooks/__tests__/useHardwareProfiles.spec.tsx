import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getHardwareProfiles, validateHardwareProfiles } from '~/app/api/k8s';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import { useHardwareProfiles } from '~/app/hooks/useHardwareProfiles';

jest.mock('~/app/api/k8s', () => ({
  getHardwareProfiles: jest.fn(),
  validateHardwareProfiles: jest.fn(),
}));

const mockGetHardwareProfiles = jest.mocked(getHardwareProfiles);
const mockValidateHardwareProfiles = jest.mocked(validateHardwareProfiles);

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30000 } } });

// RHOAIENG-99645: the Kueue integration is disabled, so the hook must report the off
// state (loaded, no profiles, no errors) without ever fetching.
describe('useHardwareProfiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports the disabled state without fetching', () => {
    const result = renderHook(() => useHardwareProfiles('test-ns', ['provider-a']), {
      wrapper: createWrapper(makeQueryClient()),
    });

    expect(result.result.current).toEqual({
      profiles: [],
      loaded: true,
      error: undefined,
      compatibilityError: undefined,
    });
    expect(mockGetHardwareProfiles).not.toHaveBeenCalled();
    expect(mockValidateHardwareProfiles).not.toHaveBeenCalled();
  });
});
