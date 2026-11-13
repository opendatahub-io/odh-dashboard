/* eslint-disable camelcase -- API contract field names */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { waitFor } from '@testing-library/react';
import { getInfo, validateHardwareProfiles } from '~/app/api/k8s';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import { useHardwareProfiles } from '~/app/hooks/useHardwareProfiles';
import type { HardwareProfileInfo } from '~/app/types';

jest.mock('~/app/api/k8s', () => ({
  getInfo: jest.fn(),
  validateHardwareProfiles: jest.fn(),
}));

const mockGetInfo = jest.mocked(getInfo);
const mockValidateHardwareProfiles = jest.mocked(validateHardwareProfiles);

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

const makeQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30000 } } });

const profile = (name: string): HardwareProfileInfo => ({
  name,
  display_name: name,
  scheduling_type: 'queue',
  queue_name: 'default',
  identifiers: [],
});

describe('useHardwareProfiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('offers queue-backed profiles from the info API and merges compatibility results', async () => {
    mockGetInfo.mockReturnValue((() =>
      Promise.resolve({
        hardware_profiles: [profile('gpu-default'), profile('cpu-small')],
      })) as ReturnType<typeof mockGetInfo>);
    mockValidateHardwareProfiles.mockReturnValue((() =>
      Promise.resolve({
        items: [
          {
            compatible: false,
            hardware_profile: 'cpu-small',
            mismatches: [
              {
                provider_id: 'provider-a',
                resource: 'cpu',
                required: '4',
                available: '2',
                message: 'below the provider minimum',
              },
            ],
          },
        ],
      })) as ReturnType<typeof mockValidateHardwareProfiles>);

    const result = renderHook(() => useHardwareProfiles('test-ns', ['provider-a']), {
      wrapper: createWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.result.current.loaded).toBe(true));

    expect(result.result.current.profiles).toEqual([
      profile('gpu-default'),
      {
        ...profile('cpu-small'),
        compatibility: {
          compatible: false,
          hardware_profile: 'cpu-small',
          mismatches: [
            {
              provider_id: 'provider-a',
              resource: 'cpu',
              required: '4',
              available: '2',
              message: 'below the provider minimum',
            },
          ],
        },
      },
    ]);
    expect(result.result.current.error).toBeUndefined();
    expect(result.result.current.compatibilityError).toBeUndefined();
    expect(mockGetInfo).toHaveBeenCalledWith('', 'test-ns');
    expect(mockValidateHardwareProfiles).toHaveBeenCalledWith('', 'test-ns', {
      hardware_profiles: ['gpu-default', 'cpu-small'],
      provider_ids: ['provider-a'],
    });
  });

  it('filters out node-scheduled profiles', async () => {
    mockGetInfo.mockReturnValue((() =>
      Promise.resolve({
        hardware_profiles: [
          profile('gpu-default'),
          { name: 'node-profile', scheduling_type: 'node', identifiers: [] },
        ],
      })) as ReturnType<typeof mockGetInfo>);

    const result = renderHook(() => useHardwareProfiles('test-ns'), {
      wrapper: createWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.result.current.loaded).toBe(true));

    expect(result.result.current.profiles).toEqual([profile('gpu-default')]);
    expect(mockValidateHardwareProfiles).not.toHaveBeenCalled();
  });

  it('does not fetch without a namespace', () => {
    const result = renderHook(() => useHardwareProfiles(undefined), {
      wrapper: createWrapper(makeQueryClient()),
    });

    expect(mockGetInfo).not.toHaveBeenCalled();
    expect(result.result.current.profiles).toEqual([]);
  });

  it('skips validation when no provider IDs are given', async () => {
    mockGetInfo.mockReturnValue((() =>
      Promise.resolve({ hardware_profiles: [profile('gpu-default')] })) as ReturnType<
      typeof mockGetInfo
    >);

    const result = renderHook(() => useHardwareProfiles('test-ns'), {
      wrapper: createWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.result.current.loaded).toBe(true));

    expect(mockValidateHardwareProfiles).not.toHaveBeenCalled();
    expect(result.result.current.compatibilityError).toBeUndefined();
  });

  it('surfaces info fetch errors', async () => {
    mockGetInfo.mockReturnValue((() => Promise.reject(new Error('unavailable'))) as ReturnType<
      typeof mockGetInfo
    >);

    const result = renderHook(() => useHardwareProfiles('test-ns', ['provider-a']), {
      wrapper: createWrapper(makeQueryClient()),
    });

    await waitFor(() => expect(result.result.current.loaded).toBe(true));

    expect(result.result.current.error).toBeInstanceOf(Error);
    expect(result.result.current.profiles).toEqual([]);
  });
});
