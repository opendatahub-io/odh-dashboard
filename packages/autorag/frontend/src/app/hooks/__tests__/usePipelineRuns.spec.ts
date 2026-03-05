/* eslint-disable camelcase -- PipelineRun type uses snake_case */
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { getPipelineRuns } from '~/app/api/pipelines';
import type { PipelineDefinition, PipelineRun } from '~/app/types';
import { usePipelineRuns } from '~/app/hooks/usePipelineRuns';

jest.mock('~/app/api/pipelines', () => ({
  getPipelineRuns: jest.fn(),
}));

const getPipelineRunsMock = jest.mocked(getPipelineRuns);

const mockPipelineDefinitions: PipelineDefinition[] = [
  {
    pipeline_id: 'p1',
    display_name: 'Pipeline 1',
    created_at: '2025-01-01',
    description: 'Desc 1',
  },
];

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
    getPipelineRunsMock.mockResolvedValue({
      runs: [],
      total_size: 0,
      next_page_token: '',
    });

    const renderResult = testHook(usePipelineRuns)('', mockPipelineDefinitions);
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.runs).toEqual([]);
    expect(renderResult.result.current.totalSize).toBe(0);
    expect(getPipelineRunsMock).not.toHaveBeenCalled();
  });

  it('should fetch and return pipeline runs from BFF with pagination data', async () => {
    getPipelineRunsMock.mockResolvedValue(mockPipelineRunsData);

    const renderResult = testHook(usePipelineRuns)('my-namespace', mockPipelineDefinitions);
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.runs).toEqual(mockRuns);
    expect(renderResult.result.current.totalSize).toBe(mockRuns.length);
    expect(renderResult.result.current.nextPageToken).toBe('');
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(getPipelineRunsMock).toHaveBeenCalledWith('', 'my-namespace', {
      pageSize: 20,
      nextPageToken: undefined,
    });
  });

  it('should fetch runs from BFF even with empty pipelineDefinitions', async () => {
    getPipelineRunsMock.mockResolvedValue(mockPipelineRunsData);

    const renderResult = testHook(usePipelineRuns)('my-namespace', []);
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.runs).toEqual(mockRuns);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(getPipelineRunsMock).toHaveBeenCalledWith('', 'my-namespace', {
      pageSize: 20,
      nextPageToken: undefined,
    });
  });

  it('should handle fetch errors', async () => {
    const fetchError = new Error('Fetch failed');
    getPipelineRunsMock.mockRejectedValue(fetchError);

    const renderResult = testHook(usePipelineRuns)('my-namespace', mockPipelineDefinitions);
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.runs).toEqual([]);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBe(fetchError);
  });
});
