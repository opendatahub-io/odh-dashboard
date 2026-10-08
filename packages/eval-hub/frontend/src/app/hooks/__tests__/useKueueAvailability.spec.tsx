/* eslint-disable camelcase */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react';
import { getKueueAvailability } from '~/app/api/k8s';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import { useKueueAvailability } from '~/app/hooks/useKueueAvailability';
import type { KueueAvailability } from '~/app/types';

jest.mock('~/app/api/k8s', () => ({
  getKueueAvailability: jest.fn(),
}));

const mockGetKueueAvailability = jest.mocked(getKueueAvailability);

const availability: KueueAvailability = {
  enabled: true,
  scheduling_ready: true,
  cluster_enabled: true,
  namespace_managed: true,
  local_queues_available: true,
  local_queue_names: ['gpu-default'],
};

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30000 } } });

describe('useKueueAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not fetch until a namespace is available', () => {
    const result = renderHook(() => useKueueAvailability(undefined), {
      wrapper: createWrapper(makeQueryClient()),
    });

    expect(result.result.current.loaded).toBe(false);
    expect(result.result.current.availability).toBeUndefined();
    expect(mockGetKueueAvailability).not.toHaveBeenCalled();
  });

  it('loads availability through a cached query', async () => {
    mockGetKueueAvailability.mockReturnValue(() => Promise.resolve(availability));
    const queryClient = makeQueryClient();

    const first = renderHook(() => useKueueAvailability('test-ns'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(first.result.current.loaded).toBe(true));

    expect(first.result.current.availability).toEqual(availability);

    const second = renderHook(() => useKueueAvailability('test-ns'), {
      wrapper: createWrapper(queryClient),
    });
    expect(second.result.current.availability).toEqual(availability);
    expect(mockGetKueueAvailability).toHaveBeenCalledTimes(1);
  });

  it('treats a failed query as loaded and exposes the error', async () => {
    const error = new Error('Kueue unavailable');
    mockGetKueueAvailability.mockReturnValue(() => Promise.reject(error));

    const result = renderHook(() => useKueueAvailability('test-ns'), {
      wrapper: createWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.result.current.loaded).toBe(true));

    expect(result.result.current.error).toBe(error);
    expect(result.result.current.availability).toBeUndefined();
  });
});
