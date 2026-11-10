import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getKueueAvailability } from '~/app/api/k8s';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import { useKueueAvailability } from '~/app/hooks/useKueueAvailability';

jest.mock('~/app/api/k8s', () => ({
  getKueueAvailability: jest.fn(),
}));

const mockGetKueueAvailability = jest.mocked(getKueueAvailability);

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30000 } } });

// RHOAIENG-99645: the Kueue integration is disabled, so the hook must report the off
// state (loaded, no availability, no error) without ever fetching.
describe('useKueueAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports the disabled state without fetching', () => {
    const result = renderHook(() => useKueueAvailability('test-ns'), {
      wrapper: createWrapper(makeQueryClient()),
    });

    expect(result.result.current).toEqual({
      availability: undefined,
      loaded: true,
      error: undefined,
    });
    expect(mockGetKueueAvailability).not.toHaveBeenCalled();
  });
});
