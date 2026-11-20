/* eslint-disable camelcase -- API contract field names */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react';
import { getInfo } from '~/app/api/k8s';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import { useKueueAvailability } from '~/app/hooks/useKueueAvailability';

jest.mock('~/app/api/k8s', () => ({
  getInfo: jest.fn(),
}));

const mockGetInfo = jest.mocked(getInfo);

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30000 } } });

const queueProfile = (queueName: string, status: string) => ({
  name: `profile-${queueName}`,
  scheduling_type: 'queue',
  queue_name: queueName,
  identifiers: [],
  queue_availability: { status },
});

describe('useKueueAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('derives availability from the info API hardware profiles', async () => {
    mockGetInfo.mockReturnValue((() =>
      Promise.resolve({
        hardware_profiles: [
          queueProfile('gpu', 'active'),
          queueProfile('cpu', 'inactive'),
          { name: 'node-profile', scheduling_type: 'node', identifiers: [] },
        ],
      })) as ReturnType<typeof mockGetInfo>);

    const result = renderHook(() => useKueueAvailability('test-ns'), {
      wrapper: createWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.result.current.loaded).toBe(true));

    expect(result.result.current.availability).toEqual({
      enabled: true,
      scheduling_ready: true,
    });
    expect(result.result.current.error).toBeUndefined();
  });

  it('reports no availability when the tenant has no hardware profiles', async () => {
    mockGetInfo.mockReturnValue((() => Promise.resolve({ hardware_profiles: [] })) as ReturnType<
      typeof mockGetInfo
    >);

    const result = renderHook(() => useKueueAvailability('test-ns'), {
      wrapper: createWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.result.current.loaded).toBe(true));

    expect(result.result.current.availability).toEqual({
      enabled: false,
      scheduling_ready: false,
    });
  });

  it('reports scheduling not ready when no queue-backed profile is active', async () => {
    mockGetInfo.mockReturnValue((() =>
      Promise.resolve({
        hardware_profiles: [queueProfile('cpu', 'inactive')],
      })) as ReturnType<typeof mockGetInfo>);

    const result = renderHook(() => useKueueAvailability('test-ns'), {
      wrapper: createWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.result.current.loaded).toBe(true));

    expect(result.result.current.availability).toEqual({
      enabled: true,
      scheduling_ready: false,
    });
  });

  it('ignores node-scheduled profiles when deriving availability', async () => {
    mockGetInfo.mockReturnValue((() =>
      Promise.resolve({
        hardware_profiles: [{ name: 'node-profile', scheduling_type: 'node', identifiers: [] }],
      })) as ReturnType<typeof mockGetInfo>);

    const result = renderHook(() => useKueueAvailability('test-ns'), {
      wrapper: createWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.result.current.loaded).toBe(true));

    expect(result.result.current.availability).toEqual({
      enabled: false,
      scheduling_ready: false,
    });
  });

  it('does not fetch without a namespace', () => {
    const result = renderHook(() => useKueueAvailability(undefined), {
      wrapper: createWrapper(makeQueryClient()),
    });

    expect(mockGetInfo).not.toHaveBeenCalled();
    expect(result.result.current.availability).toBeUndefined();
  });

  it('surfaces fetch errors', async () => {
    mockGetInfo.mockReturnValue((() => Promise.reject(new Error('unavailable'))) as ReturnType<
      typeof mockGetInfo
    >);

    const result = renderHook(() => useKueueAvailability('test-ns'), {
      wrapper: createWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.result.current.loaded).toBe(true));

    expect(result.result.current.error).toBeInstanceOf(Error);
    expect(result.result.current.availability).toBeUndefined();
  });
});
