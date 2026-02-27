/* eslint-disable camelcase -- PipelineRun type uses snake_case */
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { getPipelineRuns } from '~/app/api/pipelines';
import type { PipelineDefinition, PipelineRun } from '~/app/types';
import { usePipelineRuns } from '~/app/hooks/usePipelineRuns';

jest.mock('~/app/api/pipelines', () => ({
  getPipelineRuns: jest.fn(),
}));

jest.mock('~/app/hooks/useAutoragMockPipelines', () => ({
  useAutoragMockPipelines: () => [true, jest.fn()],
}));

const getPipelineRunsMock = jest.mocked(getPipelineRuns);

const mockPipelineDefinitions: PipelineDefinition[] = [
  { id: 'p1', name: 'Pipeline 1', created_at: '2025-01-01', description: 'Desc 1' },
];

const mockRuns: PipelineRun[] = [
  {
    id: 'r1',
    name: 'Run 1',
    description: 'Run desc',
    tags: ['tag1'],
    stats: '1h',
    pipeline_id: 'p1',
    pipeline_name: 'Pipeline 1',
    status: 'Succeeded',
    created_at: '2025-01-17',
  },
];

describe('usePipelineRuns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty runs when namespace is empty', async () => {
    getPipelineRunsMock.mockResolvedValue([]);

    const renderResult = testHook(usePipelineRuns)('', mockPipelineDefinitions);
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.runs).toEqual([]);
    expect(getPipelineRunsMock).not.toHaveBeenCalled();
  });

  it('should return empty runs when pipelineDefinitions is empty', async () => {
    const renderResult = testHook(usePipelineRuns)('my-namespace', []);
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.runs).toEqual([]);
    expect(getPipelineRunsMock).not.toHaveBeenCalled();
  });

  it('should fetch and return pipeline runs', async () => {
    getPipelineRunsMock.mockResolvedValue(mockRuns);

    const renderResult = testHook(usePipelineRuns)('my-namespace', mockPipelineDefinitions);
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.runs).toEqual(mockRuns);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(getPipelineRunsMock).toHaveBeenCalledWith(true, '', 'my-namespace', ['p1']);
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
