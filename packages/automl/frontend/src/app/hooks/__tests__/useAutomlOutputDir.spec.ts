import type { PipelineRun } from '~/app/types';
import { useAutomlOutputDir } from '~/app/hooks/useAutomlOutputDir';

/* eslint-disable camelcase */
const createMockPipelineRun = (parameters?: Record<string, unknown>): PipelineRun =>
  ({
    run_id: 'run-123',
    display_name: 'Test Run',
    state: 'SUCCEEDED',
    created_at: '2025-01-17T00:00:00Z',
    runtime_config: parameters ? { parameters } : undefined,
  }) as PipelineRun;

describe('useAutomlOutputDir', () => {
  it('should return tabular dirs for binary task type', () => {
    const pipelineRun = createMockPipelineRun({ task_type: 'binary' });
    const result = useAutomlOutputDir(pipelineRun);

    expect(result).toEqual({
      rootDir: 'autogluon-tabular-training-pipeline',
      modelGenerationDir: 'autogluon-models-training',
      isTabular: true,
    });
  });

  it('should return tabular dirs for multiclass task type', () => {
    const pipelineRun = createMockPipelineRun({ task_type: 'multiclass' });
    const result = useAutomlOutputDir(pipelineRun);

    expect(result).toEqual({
      rootDir: 'autogluon-tabular-training-pipeline',
      modelGenerationDir: 'autogluon-models-training',
      isTabular: true,
    });
  });

  it('should return tabular dirs for regression task type', () => {
    const pipelineRun = createMockPipelineRun({ task_type: 'regression' });
    const result = useAutomlOutputDir(pipelineRun);

    expect(result).toEqual({
      rootDir: 'autogluon-tabular-training-pipeline',
      modelGenerationDir: 'autogluon-models-training',
      isTabular: true,
    });
  });

  it('should return timeseries dirs for timeseries task type', () => {
    const pipelineRun = createMockPipelineRun({ task_type: 'timeseries' });
    const result = useAutomlOutputDir(pipelineRun);

    expect(result).toEqual({
      rootDir: 'autogluon-timeseries-training-pipeline',
      modelGenerationDir: 'autogluon-timeseries-models-training',
      isTabular: false,
    });
  });

  it('should default to timeseries when task_type is missing', () => {
    const pipelineRun = createMockPipelineRun({});
    const result = useAutomlOutputDir(pipelineRun);

    expect(result).toEqual({
      rootDir: 'autogluon-timeseries-training-pipeline',
      modelGenerationDir: 'autogluon-timeseries-models-training',
      isTabular: false,
    });
  });

  it('should default to timeseries when pipelineRun is undefined', () => {
    const result = useAutomlOutputDir(undefined);

    expect(result).toEqual({
      rootDir: 'autogluon-timeseries-training-pipeline',
      modelGenerationDir: 'autogluon-timeseries-models-training',
      isTabular: false,
    });
  });
});
