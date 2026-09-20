import React from 'react';
import { waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getEvaluationJob } from '~/app/api/k8s';
import { mockEvaluationJob } from '~/__tests__/unit/testUtils/mockEvaluationData';
import { renderHook } from '~/__tests__/unit/testUtils/hooks';
import useEvaluationJobDetailPolling from '~/app/hooks/useEvaluationJobDetailPolling';

jest.mock('~/app/api/k8s', () => ({
  getEvaluationJob: jest.fn(),
}));

const mockGetEvaluationJob = jest.mocked(getEvaluationJob);

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return Wrapper;
};

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false } },
  });

describe('useEvaluationJobDetailPolling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an empty map and no warning when enabled is false', () => {
    const queryClient = makeQueryClient();
    const renderResult = renderHook(
      () => useEvaluationJobDetailPolling(['job-1'], 'test-ns', false),
      { wrapper: createWrapper(queryClient) },
    );
    expect(renderResult.result.current.polledJobDataMap.size).toBe(0);
    expect(renderResult.result.current.isWarning).toBe(false);
    expect(mockGetEvaluationJob).not.toHaveBeenCalled();
  });

  it('should return an empty map when jobIds is empty', () => {
    const queryClient = makeQueryClient();
    const renderResult = renderHook(() => useEvaluationJobDetailPolling([], 'test-ns', true), {
      wrapper: createWrapper(queryClient),
    });
    expect(renderResult.result.current.polledJobDataMap.size).toBe(0);
    expect(renderResult.result.current.isWarning).toBe(false);
    expect(mockGetEvaluationJob).not.toHaveBeenCalled();
  });

  it('should return an empty map when namespace is undefined', () => {
    const queryClient = makeQueryClient();
    const renderResult = renderHook(
      () => useEvaluationJobDetailPolling(['job-1'], undefined, true),
      { wrapper: createWrapper(queryClient) },
    );
    expect(renderResult.result.current.polledJobDataMap.size).toBe(0);
    expect(renderResult.result.current.isWarning).toBe(false);
    expect(mockGetEvaluationJob).not.toHaveBeenCalled();
  });

  it('should populate polledJobDataMap after a successful fetch', async () => {
    const mockJob = mockEvaluationJob({ id: 'job-1', state: 'running' });
    mockGetEvaluationJob.mockReturnValue(() => Promise.resolve(mockJob));

    const queryClient = makeQueryClient();
    const renderResult = renderHook(
      () => useEvaluationJobDetailPolling(['job-1'], 'test-ns', true),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => {
      expect(renderResult.result.current.polledJobDataMap.get('job-1')).toBeDefined();
    });
    expect(renderResult.result.current.polledJobDataMap.get('job-1')).toEqual(mockJob);
    expect(renderResult.result.current.isWarning).toBe(false);
  });

  it('should populate polledJobDataMap for multiple job ids', async () => {
    const job1 = mockEvaluationJob({ id: 'job-1', state: 'running' });
    const job2 = mockEvaluationJob({ id: 'job-2', state: 'pending' });
    mockGetEvaluationJob
      .mockReturnValueOnce(() => Promise.resolve(job1))
      .mockReturnValueOnce(() => Promise.resolve(job2));

    const queryClient = makeQueryClient();
    const renderResult = renderHook(
      () => useEvaluationJobDetailPolling(['job-1', 'job-2'], 'test-ns', true),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => {
      expect(renderResult.result.current.polledJobDataMap.size).toBe(2);
    });
    expect(renderResult.result.current.polledJobDataMap.get('job-1')).toEqual(job1);
    expect(renderResult.result.current.polledJobDataMap.get('job-2')).toEqual(job2);
  });

  it('should set isWarning to true when a query errors', async () => {
    // Use a 4xx so the hook's retry callback gives up immediately (no backoff delays)
    mockGetEvaluationJob.mockReturnValue(() => Promise.reject(new Error('HTTP 400 Bad Request')));

    const queryClient = makeQueryClient();
    const renderResult = renderHook(
      () => useEvaluationJobDetailPolling(['job-1'], 'test-ns', true),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => {
      expect(renderResult.result.current.isWarning).toBe(true);
    });
    expect(renderResult.result.current.polledJobDataMap.size).toBe(0);
  });

  it('should not retry on 4xx errors', async () => {
    mockGetEvaluationJob.mockReturnValue(() => Promise.reject(new Error('HTTP 404 Not Found')));

    const queryClient = makeQueryClient();
    const renderResult = renderHook(
      () => useEvaluationJobDetailPolling(['job-1'], 'test-ns', true),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => {
      expect(renderResult.result.current.isWarning).toBe(true);
    });
    // 4xx: queryFn should be called exactly once (no retries)
    expect(mockGetEvaluationJob).toHaveBeenCalledTimes(1);
  });
});
