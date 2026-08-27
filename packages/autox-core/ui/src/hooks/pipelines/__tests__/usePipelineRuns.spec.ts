/* eslint-disable camelcase -- PipelineRun type uses snake_case */
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFetchState } from 'mod-arch-core';
import React from 'react';
import type { PipelineRun, PipelinesApi } from '../../../api/pipelines';
import { AutoXApiProvider } from '../../../context';
import { usePipelineRuns } from '../usePipelineRuns';

const mockPipelinesApi: PipelinesApi = {
  createPipelineRun: jest.fn(),
  getPipelineRunsFromBFF: jest.fn(),
  getPipelineRunFromBFF: jest.fn(),
  enableManagedPipelines: jest.fn(),
  terminatePipelineRun: jest.fn(),
  retryPipelineRun: jest.fn(),
  deletePipelineRun: jest.fn(),
};

jest.mock('../../../api', () => ({
  ...jest.requireActual('../../../api'),
  createPipelinesApi: jest.fn(() => mockPipelinesApi),
}));

const mockRefreshSpy: { current?: jest.Mock } = {};

jest.mock('mod-arch-core', () => {
  const actual = jest.requireActual<typeof import('mod-arch-core')>('mod-arch-core');
  return {
    ...actual,
    useFetchState: jest.fn((...args: unknown[]) => {
      const result = Reflect.apply(actual.useFetchState, actual, args) as ReturnType<
        typeof actual.useFetchState
      >;
      mockRefreshSpy.current = jest.fn((...refreshArgs: unknown[]) =>
        Reflect.apply(result[3], result, refreshArgs),
      );
      return [result[0], result[1], result[2], mockRefreshSpy.current];
    }),
  };
});

const useFetchStateMock = jest.mocked(useFetchState);

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

const mockRuns: PipelineRun[] = [
  {
    run_id: 'r1',
    display_name: 'Run 1',
    description: 'Run desc',
    state: 'SUCCEEDED',
    created_at: '2025-01-17',
    pipeline_version_reference: { pipeline_id: 'p1', pipeline_version_id: 'v1' },
  },
];

const mockPipelineRunsData = {
  runs: mockRuns,
  total_size: mockRuns.length,
  next_page_token: '',
};

describe('usePipelineRuns', () => {
  const getPipelineRunsFromBFF = jest.mocked(mockPipelinesApi.getPipelineRunsFromBFF);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty runs when namespace is empty', async () => {
    getPipelineRunsFromBFF.mockResolvedValue({
      runs: [],
      total_size: 0,
      next_page_token: '',
    });

    const { result } = renderHook(() => usePipelineRuns(''), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.runs).toEqual([]);
    expect(result.current.totalSize).toBe(0);
    expect(getPipelineRunsFromBFF).not.toHaveBeenCalled();
  });

  it('should fetch and return pipeline runs from BFF with pagination data', async () => {
    getPipelineRunsFromBFF.mockResolvedValue(mockPipelineRunsData);

    const { result } = renderHook(() => usePipelineRuns('my-namespace'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    expect(result.current.runs).toEqual(mockRuns);
    expect(result.current.totalSize).toBe(mockRuns.length);
    expect(result.current.nextPageToken).toBe('');
    expect(result.current.error).toBeUndefined();
    expect(getPipelineRunsFromBFF).toHaveBeenCalledWith('', {
      namespace: 'my-namespace',
      pageSize: 20,
      page: 1,
    });
  });

  it('should handle fetch errors', async () => {
    const fetchError = new Error('Fetch failed');
    getPipelineRunsFromBFF.mockRejectedValue(fetchError);

    const { result } = renderHook(() => usePipelineRuns('my-namespace'), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.error).toBe(fetchError));

    expect(result.current.runs).toEqual([]);
    expect(result.current.loaded).toBe(false);
  });

  it('should pass a custom defaultPageSize and pollInterval to useFetchState for polling', () => {
    getPipelineRunsFromBFF.mockResolvedValue(mockPipelineRunsData);
    renderHook(() => usePipelineRuns('my-namespace', 50, 5000), { wrapper: createWrapper() });

    expect(useFetchStateMock).toHaveBeenCalledWith(
      expect.any(Function),
      { runs: [], total_size: 0, next_page_token: '' },
      { refreshRate: 5000 },
    );
  });

  describe('pagination', () => {
    it('should reset page to 1 when namespace changes', async () => {
      getPipelineRunsFromBFF.mockResolvedValue(mockPipelineRunsData);

      const { result, rerender } = renderHook(({ namespace }) => usePipelineRuns(namespace), {
        initialProps: { namespace: 'ns-1' },
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loaded).toBe(true));

      getPipelineRunsFromBFF.mockResolvedValue({
        runs: [],
        total_size: 0,
        next_page_token: '',
      });

      rerender({ namespace: 'ns-2' });
      await waitFor(() =>
        expect(getPipelineRunsFromBFF).toHaveBeenLastCalledWith('', {
          namespace: 'ns-2',
          pageSize: 20,
          page: 1,
        }),
      );

      expect(result.current.page).toBe(1);
    });

    it('should start with page 1 and default pageSize 20', async () => {
      getPipelineRunsFromBFF.mockResolvedValue(mockPipelineRunsData);

      const { result } = renderHook(() => usePipelineRuns('my-namespace'), {
        wrapper: createWrapper(),
      });
      expect(result.current.page).toBe(1);
      expect(result.current.pageSize).toBe(20);

      await waitFor(() => expect(result.current.loaded).toBe(true));
      expect(result.current.page).toBe(1);
      expect(result.current.pageSize).toBe(20);
    });

    it('should expose setPage and setPageSize callbacks', async () => {
      getPipelineRunsFromBFF.mockResolvedValue(mockPipelineRunsData);

      const { result } = renderHook(() => usePipelineRuns('my-namespace'), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loaded).toBe(true));

      expect(typeof result.current.setPage).toBe('function');
      expect(typeof result.current.setPageSize).toBe('function');
    });

    it('should call refresh directly when on page 1', async () => {
      getPipelineRunsFromBFF.mockResolvedValue(mockPipelineRunsData);

      const { result } = renderHook(() => usePipelineRuns('my-namespace'), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loaded).toBe(true));

      mockRefreshSpy.current!.mockClear();
      await result.current.refresh();

      expect(mockRefreshSpy.current).toHaveBeenCalledTimes(1);
    });

    it('should reset to page 1 instead of calling refresh when on page 2+', async () => {
      getPipelineRunsFromBFF.mockResolvedValue(mockPipelineRunsData);

      const { result } = renderHook(() => usePipelineRuns('my-namespace'), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loaded).toBe(true));

      result.current.setPage(2);
      await waitFor(() => expect(result.current.page).toBe(2));

      mockRefreshSpy.current!.mockClear();
      await result.current.refresh();
      await waitFor(() => expect(result.current.page).toBe(1));

      expect(mockRefreshSpy.current).not.toHaveBeenCalled();
    });
  });
});
