// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as React from 'react';
import { useFetchState } from 'mod-arch-core';
import { useEvaluationJobs } from '~/app/hooks/useEvaluationJobs';
import { getEvaluationJobs } from '~/app/api/k8s';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import type { EvaluationJob } from '~/app/types';

jest.mock('mod-arch-core', () => ({
  useFetchState: jest.fn(),
  NotReadyError: class NotReadyError extends Error {},
}));

jest.mock('~/app/utilities/const', () => ({
  POLL_INTERVAL: 30000,
}));

jest.mock('~/app/api/k8s', () => ({
  getEvaluationJobs: jest.fn(),
}));

const mockUseFetchState = jest.mocked(useFetchState);
const mockGetEvaluationJobs = jest.mocked(getEvaluationJobs);

describe('useEvaluationJobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEvaluationJobs.mockReturnValue(jest.fn());
    mockUseFetchState.mockReturnValue([[], false, undefined, jest.fn()]);
  });

  it('should return loading state with empty array initially', () => {
    const renderResult = testHook(useEvaluationJobs)({ namespace: 'test-ns' });

    expect(renderResult).hookToStrictEqual([[], false, undefined, expect.any(Function)]);
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should return evaluation jobs when loaded', () => {
    const jobs: EvaluationJob[] = [];
    mockUseFetchState.mockReturnValue([jobs, true, undefined, jest.fn()]);

    const renderResult = testHook(useEvaluationJobs)({ namespace: 'test-ns' });

    expect(renderResult).hookToStrictEqual([jobs, true, undefined, expect.any(Function)]);
  });

  it('should return error when fetch fails', () => {
    const fetchError = new Error('Failed to fetch');
    mockUseFetchState.mockReturnValue([[], false, fetchError, jest.fn()]);

    const renderResult = testHook(useEvaluationJobs)({ namespace: 'test-ns' });

    expect(renderResult).hookToStrictEqual([[], false, fetchError, expect.any(Function)]);
  });

  it('should call getEvaluationJobs with the provided params when evalHubNotReady is false', () => {
    const mockFetcher = jest.fn().mockResolvedValue([]);
    mockGetEvaluationJobs.mockReturnValue(mockFetcher);

    testHook(useEvaluationJobs)({ namespace: 'my-ns' }, false);

    const [fetchCallback] = mockUseFetchState.mock.calls[0] as unknown as [
      (opts: unknown) => Promise<EvaluationJob[]>,
    ];
    const mockOpts = {};
    fetchCallback(mockOpts);

    expect(mockGetEvaluationJobs).toHaveBeenCalledWith('', { namespace: 'my-ns' });
    expect(mockFetcher).toHaveBeenCalledWith(mockOpts);
  });

  it('should reject with NotReadyError when evalHubNotReady is true', async () => {
    const mockFetcher = jest.fn().mockResolvedValue([]);
    mockGetEvaluationJobs.mockReturnValue(mockFetcher);

    testHook(useEvaluationJobs)({ namespace: 'test-ns' }, true);

    const [fetchCallback] = mockUseFetchState.mock.calls[0] as unknown as [
      (opts: unknown) => Promise<EvaluationJob[]>,
    ];

    await expect(fetchCallback({})).rejects.toThrow('EvalHub is not ready');
    expect(mockGetEvaluationJobs).not.toHaveBeenCalled();
  });

  it('should pass initialPromisePurity option to useFetchState', () => {
    testHook(useEvaluationJobs)({ namespace: 'test-ns' });

    expect(mockUseFetchState).toHaveBeenCalledWith(expect.any(Function), [], {
      initialPromisePurity: true,
      refreshRate: expect.any(Number),
    });
  });

  it('should use POLL_INTERVAL when evalHubNotReady is false', () => {
    testHook(useEvaluationJobs)({ namespace: 'test-ns' }, false);

    expect(mockUseFetchState).toHaveBeenCalledWith(
      expect.any(Function),
      [],
      expect.objectContaining({ refreshRate: 30000 }),
    );
  });

  it('should disable polling when evalHubNotReady is true', () => {
    testHook(useEvaluationJobs)({ namespace: 'test-ns' }, true);

    expect(mockUseFetchState).toHaveBeenCalledWith(
      expect.any(Function),
      [],
      expect.objectContaining({ refreshRate: 0 }),
    );
  });
});
