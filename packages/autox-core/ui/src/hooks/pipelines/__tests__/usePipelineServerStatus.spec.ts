/* eslint-disable camelcase -- API response fixtures use snake_case */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import type { PipelinesApi } from '../../../api/pipelines/pipelines';
import { AutoXApiProvider } from '../../../context/AutoXApiContext';
import { usePipelineServerStatus } from '../usePipelineServerStatus';

const mockPipelinesApi: PipelinesApi = {
  createPipelineRun: jest.fn(),
  getPipelineRunsFromBFF: jest.fn(),
  getPipelineRunFromBFF: jest.fn(),
  enableManagedPipelines: jest.fn(),
  getPipelineServerStatus: jest.fn(),
  terminatePipelineRun: jest.fn(),
  retryPipelineRun: jest.fn(),
  deletePipelineRun: jest.fn(),
};

jest.mock('../../../api/pipelines/pipelines', () => ({
  ...jest.requireActual('../../../api/pipelines/pipelines'),
  createPipelinesApi: jest.fn(() => mockPipelinesApi),
}));

const createWrapper = () => {
  const queryClient = new QueryClient();
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(
      AutoXApiProvider,
      {
        apiPrefix: '/test',
        bffApiVersion: 'v1',
      },
      React.createElement(QueryClientProvider, { client: queryClient }, children),
    );
  return Wrapper;
};

describe('usePipelineServerStatus', () => {
  const getPipelineServerStatus = jest.mocked(mockPipelinesApi.getPipelineServerStatus);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should report a successfully observed unready DSPA as starting', async () => {
    getPipelineServerStatus.mockResolvedValue({ status: 'starting', dspa_name: 'dspa' });

    const { result } = renderHook(() => usePipelineServerStatus('test-project'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current).toStrictEqual({ loaded: true, isStarting: true, error: undefined });
    expect(getPipelineServerStatus).toHaveBeenCalledWith(
      '',
      'test-project',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('should stop reporting starting when the status query fails after observing', async () => {
    const error = new Error('Pipeline Server returned invalid readiness conditions');
    getPipelineServerStatus.mockRejectedValue(error);

    const { result } = renderHook(() => usePipelineServerStatus('test-project'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.error).toBe(error));

    expect(result.current.loaded).toBe(true);
    expect(result.current.isStarting).toBe(false);
  });

  it('should treat a not-found result as inconclusive rather than starting', async () => {
    getPipelineServerStatus.mockResolvedValue({ status: 'not-found' });

    const { result } = renderHook(() => usePipelineServerStatus('test-project'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current).toStrictEqual({ loaded: true, isStarting: false, error: undefined });
  });

  it('should not fetch while disabled and stay unsettled', async () => {
    getPipelineServerStatus.mockResolvedValue({ status: 'ready', dspa_name: 'dspa' });

    const { result } = renderHook(() => usePipelineServerStatus('test-project', false), {
      wrapper: createWrapper(),
    });
    // Flush any stray microtasks; the query must never fire.
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toStrictEqual({ loaded: false, isStarting: false, error: undefined });
    expect(getPipelineServerStatus).not.toHaveBeenCalled();
  });

  describe('ready confirmation delay', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    // React Query batches result notifications through a 0ms timer, so under fake
    // timers the initial fetch only lands once that tick is advanced.
    const flushQuery = () =>
      act(async () => {
        await jest.advanceTimersByTimeAsync(0);
      });

    it('should wait for the Ready confirmation delay before marking the server loaded', async () => {
      getPipelineServerStatus.mockResolvedValue({ status: 'ready', dspa_name: 'dspa' });

      const { result } = renderHook(() => usePipelineServerStatus('test-project'), {
        wrapper: createWrapper(),
      });
      await flushQuery();

      expect(result.current.loaded).toBe(false);

      act(() => {
        jest.advanceTimersByTime(1999);
      });
      expect(result.current.loaded).toBe(false);

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(result.current.loaded).toBe(true);
      expect(result.current.isStarting).toBe(false);
    });

    it('should accept Ready when the DSPA reports no dspa_name', async () => {
      getPipelineServerStatus.mockResolvedValue({ status: 'ready' });

      const { result } = renderHook(() => usePipelineServerStatus('test-project'), {
        wrapper: createWrapper(),
      });
      await flushQuery();

      expect(result.current.isStarting).toBe(false);
      expect(result.current.loaded).toBe(false);

      act(() => jest.advanceTimersByTime(2000));

      expect(result.current.loaded).toBe(true);
    });

    it('should expose a Ready transition on the next poll after observing the DSPA', async () => {
      getPipelineServerStatus.mockResolvedValueOnce({ status: 'starting', dspa_name: 'dspa' });
      getPipelineServerStatus.mockResolvedValue({ status: 'ready', dspa_name: 'dspa' });

      const { result } = renderHook(() => usePipelineServerStatus('test-project'), {
        wrapper: createWrapper(),
      });
      await flushQuery();

      expect(result.current.isStarting).toBe(true);

      // The next poll flips the observed state to Ready. Advance slightly past the
      // interval: the result notification is a 0ms timer scheduled at poll time,
      // which lands just after the boundary.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(5100);
      });

      expect(result.current.isStarting).toBe(false);
    });
  });
});
