/* eslint-disable camelcase */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react';
import { getHardwareProfiles } from '~/app/api/k8s';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import { useHardwareProfiles } from '~/app/hooks/useHardwareProfiles';
import type { HardwareProfile } from '~/app/types';

jest.mock('~/app/api/k8s', () => ({
  getHardwareProfiles: jest.fn(),
}));

const mockGetHardwareProfiles = jest.mocked(getHardwareProfiles);

const profile: HardwareProfile = {
  name: 'gpu-small',
  display_name: 'GPU Small',
  enabled: true,
  local_queue_name: 'gpu-default',
};

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30000 } } });

describe('useHardwareProfiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not fetch until a namespace is available', () => {
    const result = renderHook(() => useHardwareProfiles(undefined), {
      wrapper: createWrapper(makeQueryClient()),
    });

    expect(result.result.current.loaded).toBe(false);
    expect(result.result.current.profiles).toEqual([]);
    expect(mockGetHardwareProfiles).not.toHaveBeenCalled();
  });

  it('loads profiles through a cached query', async () => {
    mockGetHardwareProfiles.mockReturnValue(() => Promise.resolve([profile]));
    const queryClient = makeQueryClient();

    const first = renderHook(() => useHardwareProfiles('test-ns'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(first.result.current.loaded).toBe(true));

    expect(first.result.current.profiles).toEqual([profile]);

    const second = renderHook(() => useHardwareProfiles('test-ns'), {
      wrapper: createWrapper(queryClient),
    });
    expect(second.result.current.profiles).toEqual([profile]);
    expect(mockGetHardwareProfiles).toHaveBeenCalledTimes(1);
  });

  it('treats a failed query as loaded and exposes the error', async () => {
    const error = new Error('HardwareProfiles unavailable');
    mockGetHardwareProfiles.mockReturnValue(() => Promise.reject(error));

    const result = renderHook(() => useHardwareProfiles('test-ns'), {
      wrapper: createWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.result.current.loaded).toBe(true));

    expect(result.result.current.error).toBe(error);
    expect(result.result.current.profiles).toEqual([]);
  });
});
