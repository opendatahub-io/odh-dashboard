/* eslint-disable camelcase -- PipelineRun type uses snake_case */
import { useFetchState } from 'mod-arch-core';
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { getPipelineRunsFromBFF } from '~/app/api/pipelines';
import type { PipelineRun } from '~/app/types';
import { POLL_INTERVAL } from '~/app/utilities/const';
import { usePipelineRuns } from '~/app/hooks/usePipelineRuns';

jest.mock('mod-arch-core', () => {
  const actual = jest.requireActual<typeof import('mod-arch-core')>('mod-arch-core');
  return {
    ...actual,
    useFetchState: jest.fn((...args: unknown[]) =>
      Reflect.apply(actual.useFetchState, actual, args),
    ),
  };
});

jest.mock('~/app/api/pipelines', () => ({
  getPipelineRunsFromBFF: jest.fn(),
}));

const getPipelineRunsFromBFFMock = jest.mocked(getPipelineRunsFromBFF);
const useFetchStateMock = jest.mocked(useFetchState);

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
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty runs when namespace is empty', async () => {
    getPipelineRunsFromBFFMock.mockResolvedValue({
      runs: [],
      total_size: 0,
      next_page_token: '',
    });

    const renderResult = testHook(usePipelineRuns)('');
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.runs).toEqual([]);
    expect(renderResult.result.current.totalSize).toBe(0);
    expect(getPipelineRunsFromBFFMock).not.toHaveBeenCalled();
  });

  it('should fetch and return pipeline runs from BFF with pagination data', async () => {
    getPipelineRunsFromBFFMock.mockResolvedValue(mockPipelineRunsData);

    const renderResult = testHook(usePipelineRuns)('my-namespace');
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.runs).toEqual(mockRuns);
    expect(renderResult.result.current.totalSize).toBe(mockRuns.length);
    expect(renderResult.result.current.nextPageToken).toBe('');
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(getPipelineRunsFromBFFMock).toHaveBeenCalledWith('', {
      namespace: 'my-namespace',
      pageSize: 20,
      nextPageToken: undefined,
    });
  });

  it('should handle fetch errors', async () => {
    const fetchError = new Error('Fetch failed');
    getPipelineRunsFromBFFMock.mockRejectedValue(fetchError);

    const renderResult = testHook(usePipelineRuns)('my-namespace');
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.runs).toEqual([]);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBe(fetchError);
  });

  it('should pass refreshRate to useFetchState for polling', () => {
    testHook(usePipelineRuns)('my-namespace');

    expect(useFetchStateMock).toHaveBeenCalledWith(
      expect.any(Function),
      { runs: [], total_size: 0, next_page_token: '' },
      { refreshRate: POLL_INTERVAL },
    );
  });

  describe('pagination', () => {
    it('should reset page to 1 when namespace changes', async () => {
      getPipelineRunsFromBFFMock.mockResolvedValue(mockPipelineRunsData);

      const renderResult = testHook(usePipelineRuns)('ns-1');
      await renderResult.waitForNextUpdate();

      getPipelineRunsFromBFFMock.mockResolvedValue({
        runs: [],
        total_size: 0,
        next_page_token: '',
      });

      renderResult.rerender('ns-2');
      await renderResult.waitForNextUpdate();

      expect(renderResult.result.current.page).toBe(1);
      expect(getPipelineRunsFromBFFMock).toHaveBeenLastCalledWith('', {
        namespace: 'ns-2',
        pageSize: 20,
        nextPageToken: undefined,
      });
    });

    it('should start with page 1 and default pageSize 20', async () => {
      getPipelineRunsFromBFFMock.mockResolvedValue(mockPipelineRunsData);

      const renderResult = testHook(usePipelineRuns)('my-namespace');
      expect(renderResult.result.current.page).toBe(1);
      expect(renderResult.result.current.pageSize).toBe(20);

      await renderResult.waitForNextUpdate();
      expect(renderResult.result.current.page).toBe(1);
      expect(renderResult.result.current.pageSize).toBe(20);
    });

    it('should expose setPage and setPageSize callbacks', async () => {
      getPipelineRunsFromBFFMock.mockResolvedValue(mockPipelineRunsData);

      const renderResult = testHook(usePipelineRuns)('my-namespace');
      await renderResult.waitForNextUpdate();

      expect(typeof renderResult.result.current.setPage).toBe('function');
      expect(typeof renderResult.result.current.setPageSize).toBe('function');
    });
  });
});
