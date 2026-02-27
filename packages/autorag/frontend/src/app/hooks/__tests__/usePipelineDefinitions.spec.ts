/* eslint-disable camelcase -- PipelineDefinition type uses snake_case */
import { testHook } from '~/__tests__/unit/testUtils/hooks';
import { getPipelineDefinitions } from '~/app/api/pipelines';
import { usePipelineDefinitions } from '~/app/hooks/usePipelineDefinitions';

jest.mock('~/app/api/pipelines', () => ({
  getPipelineDefinitions: jest.fn(),
}));

jest.mock('~/app/hooks/useAutoragMockPipelines', () => ({
  useAutoragMockPipelines: () => [true, jest.fn()],
}));

const getPipelineDefinitionsMock = jest.mocked(getPipelineDefinitions);

describe('usePipelineDefinitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty pipelineDefinitions when namespace is empty', async () => {
    getPipelineDefinitionsMock.mockResolvedValue([]);

    const renderResult = testHook(usePipelineDefinitions)('');
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.pipelineDefinitions).toEqual([]);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(getPipelineDefinitionsMock).not.toHaveBeenCalled();
  });

  it('should fetch and return pipeline definitions', async () => {
    const mockPipelines = [
      { id: 'p1', name: 'Pipeline 1', created_at: '2025-01-01', description: 'Desc 1' },
    ];
    getPipelineDefinitionsMock.mockResolvedValue(mockPipelines);

    const renderResult = testHook(usePipelineDefinitions)('my-namespace');
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.pipelineDefinitions).toEqual(mockPipelines);
    expect(renderResult.result.current.loaded).toBe(true);
    expect(renderResult.result.current.error).toBeUndefined();
    expect(getPipelineDefinitionsMock).toHaveBeenCalledWith(true, '', 'my-namespace');
  });

  it('should handle fetch errors', async () => {
    const fetchError = new Error('Fetch failed');
    getPipelineDefinitionsMock.mockRejectedValue(fetchError);

    const renderResult = testHook(usePipelineDefinitions)('my-namespace');
    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current.pipelineDefinitions).toEqual([]);
    expect(renderResult.result.current.loaded).toBe(false);
    expect(renderResult.result.current.error).toBe(fetchError);
  });

  it('should call getPipelineDefinitions when refresh is invoked', async () => {
    const mockPipelines = [
      { id: 'p1', name: 'Pipeline 1', created_at: '2025-01-01', description: 'Desc 1' },
    ];
    getPipelineDefinitionsMock.mockResolvedValue(mockPipelines);

    const renderResult = testHook(usePipelineDefinitions)('my-namespace');
    await renderResult.waitForNextUpdate();

    expect(getPipelineDefinitionsMock).toHaveBeenCalledTimes(1);

    const { act } = await import('@testing-library/react');
    await act(async () => {
      await renderResult.result.current.refresh();
    });

    expect(getPipelineDefinitionsMock).toHaveBeenCalledTimes(2);
  });
});
