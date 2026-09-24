import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from '@testing-library/react';
import { getKueueWorkloadStatuses } from '~/app/api/k8s';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import {
  hasActiveKueueWorkloadStatus,
  useKueueWorkloadStatuses,
} from '~/app/hooks/useKueueWorkloadStatuses';
import type { KueueWorkloadState, KueueWorkloadStatus } from '~/app/types';

jest.mock('~/app/api/k8s', () => ({
  getKueueWorkloadStatuses: jest.fn(),
}));

const mockGetKueueWorkloadStatuses = jest.mocked(getKueueWorkloadStatuses);

const makeStatus = (state: KueueWorkloadState): KueueWorkloadStatus => ({
  // eslint-disable-next-line camelcase -- API payload uses OpenAPI field names.
  evaluation_id: 'evaluation-1',
  // eslint-disable-next-line camelcase -- API payload uses OpenAPI field names.
  queue_name: 'default',
  state,
});

describe('hasActiveKueueWorkloadStatus', () => {
  it('keeps polling while Kueue may still change the Workload state', () => {
    expect(hasActiveKueueWorkloadStatus([makeStatus('queued')])).toBe(true);
    expect(hasActiveKueueWorkloadStatus([makeStatus('admitted')])).toBe(true);
    expect(hasActiveKueueWorkloadStatus([makeStatus('preempted')])).toBe(true);
    expect(hasActiveKueueWorkloadStatus([makeStatus('inadmissible')])).toBe(true);
  });

  it('stops polling once Kueue reaches a terminal Workload state', () => {
    expect(hasActiveKueueWorkloadStatus([makeStatus('finished')])).toBe(false);
    expect(hasActiveKueueWorkloadStatus([])).toBe(false);
  });
});

describe('useKueueWorkloadStatuses', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('should discover a Workload created after the first empty response', async () => {
    jest.useFakeTimers();
    const getStatuses = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeStatus('queued')]);
    mockGetKueueWorkloadStatuses.mockReturnValue(getStatuses);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);

    const result = renderHook(
      () => useKueueWorkloadStatuses('test-ns', ['evaluation-1'], true, true, true),
      { wrapper: Wrapper },
    );

    await act(async () => {
      await jest.advanceTimersByTimeAsync(0);
    });
    expect(getStatuses).toHaveBeenCalledTimes(1);
    expect(result.result.current.statusesByEvaluationId.size).toBe(0);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(10_000);
      await jest.advanceTimersByTimeAsync(0);
    });
    expect(getStatuses).toHaveBeenCalledTimes(2);
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1);
    });
    expect(result.result.current.statusesByEvaluationId.get('evaluation-1')?.state).toBe('queued');

    result.unmount();
    queryClient.clear();
  });
});
