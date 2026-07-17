/* eslint-disable camelcase */
import type { ComponentStageMap } from '~/app/hooks/useComponentStageMap';
import type { PipelineRun } from '~/app/types';
import { getStepMetadata } from '~/app/topology/tree-view/stepMetadata';

const buildPipelineRun = (
  taskDetails: NonNullable<NonNullable<PipelineRun['run_details']>['task_details']>,
): PipelineRun =>
  ({
    run_id: 'run-1',
    display_name: 'test-run',
    created_at: '2024-01-01T00:00:00Z',
    state: 'FAILED',
    run_details: {
      task_details: taskDetails,
    },
  }) as PipelineRun;

describe('getStepMetadata', () => {
  it('uses pipeline run task duration when there is no stage map', () => {
    const pipelineRun = buildPipelineRun([
      {
        task_id: 'leaderboard-evaluation',
        display_name: 'leaderboard-evaluation',
        create_time: '2024-01-01T10:00:00Z',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T10:00:34Z',
        state: 'FAILED',
      },
    ]);

    const metadata = getStepMetadata('leaderboard-evaluation', 'Leaderboard evaluation', 'failed', {
      pipelineRun,
    });

    expect(metadata.details).toEqual([{ label: 'Duration', value: '34 s' }]);
    expect(metadata.description).toContain('Leaderboard evaluation');
  });

  it('includes the run error message when present', () => {
    const pipelineRun = buildPipelineRun([
      {
        task_id: 'automl-data-loader',
        display_name: 'automl-data-loader',
        create_time: '2024-01-01T10:00:00Z',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T10:01:42Z',
        state: 'FAILED',
        error: {
          code: 1,
          message: 'Data preparation output write failed',
        },
      },
    ]);

    const metadata = getStepMetadata('automl-data-loader', 'Input data loader', 'failed', {
      pipelineRun,
    });

    expect(metadata.details).toEqual([
      { label: 'Duration', value: '1 m 42 s' },
      { label: 'Error', value: 'Data preparation output write failed' },
    ]);
  });

  it('resolves a branch-suffixed executor task from a base node id', () => {
    const pipelineRun = buildPipelineRun([
      {
        task_id: 'automl-data-loader-2',
        display_name: 'automl-data-loader-2',
        create_time: '2024-01-01T10:00:00Z',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T10:01:42Z',
        state: 'FAILED',
        error: {
          code: 1,
          message: 'Branch executor failed',
        },
      },
    ]);

    const metadata = getStepMetadata('automl-data-loader', 'Input data loader', 'failed', {
      pipelineRun,
    });

    expect(metadata.details).toEqual([
      { label: 'Duration', value: '1 m 42 s' },
      { label: 'Error', value: 'Branch executor failed' },
    ]);
  });

  it('does not use hardcoded failure details when the run has no task timing', () => {
    const metadata = getStepMetadata('automl-data-loader', 'Input data loader', 'failed');

    expect(metadata.details).toEqual([{ label: 'Duration', value: '—' }]);
    expect(metadata.details.some((detail) => detail.label === 'Exit code')).toBe(false);
    expect(metadata.details.some((detail) => detail.label === 'Failed at')).toBe(false);
  });

  it('prefers stage-map details over run task details when both are available', () => {
    const pipelineRun = buildPipelineRun([
      {
        task_id: 'data-prep',
        display_name: 'data-prep',
        create_time: '2024-01-01T10:00:00Z',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T10:05:00Z',
        state: 'SUCCEEDED',
      },
    ]);

    const componentStageMap: ComponentStageMap = {
      pipeline_id: 'pipeline-1',
      description: 'test',
      kfp_run_id: 'run-1',
      published_at: '2024-01-01T10:00:00Z',
      components: [
        {
          id: 'data_prep',
          description: 'Data prep',
          stages: [
            {
              id: 'validate_inputs',
              status: 'completed',
              timestamp: '2024-01-01T10:00:10Z',
              description: 'Validating inputs from the stage map.',
            },
          ],
        },
      ],
    };

    const metadata = getStepMetadata('data_prep__validate_inputs', 'Validate inputs', 'completed', {
      pipelineRun,
      componentStageMap,
    });

    expect(metadata.description).toBe('Validating inputs from the stage map.');
    expect(metadata.details[0]).toEqual({ label: 'Duration', value: '4 m 50 s' });
  });

  it('merges component task error into stage-map details when the map has no error', () => {
    const pipelineRun = buildPipelineRun([
      {
        task_id: 'automl-data-loader',
        display_name: 'automl-data-loader',
        create_time: '2024-01-01T10:00:00Z',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T10:01:42Z',
        state: 'FAILED',
        error: {
          code: 1,
          message: 'Data preparation output write failed',
        },
      },
    ]);

    const componentStageMap: ComponentStageMap = {
      pipeline_id: 'pipeline-1',
      description: 'test',
      kfp_run_id: 'run-1',
      published_at: '2024-01-01T10:00:00Z',
      components: [
        {
          id: 'automl_data_loader',
          description: 'Load tabular data',
          stages: [
            {
              id: 'prepare_data',
              description: 'Prepare data from the stage map.',
              status: 'failed',
              timestamp: '2024-01-01T10:00:10Z',
            },
          ],
        },
      ],
    };

    const metadata = getStepMetadata('automl_data_loader__prepare_data', 'Prepare data', 'failed', {
      pipelineRun,
      componentStageMap,
    });

    expect(metadata.description).toBe('Prepare data from the stage map.');
    expect(metadata.details).toEqual(
      expect.arrayContaining([
        { label: 'Duration', value: '1 m 32 s' },
        { label: 'Error', value: 'Data preparation output write failed' },
      ]),
    );
  });

  it('does not attach component task error to completed stage nodes when a later stage fails', () => {
    const pipelineRun = buildPipelineRun([
      {
        task_id: 'automl-data-loader',
        display_name: 'automl-data-loader',
        create_time: '2024-01-01T10:00:00Z',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T10:01:42Z',
        state: 'FAILED',
        error: {
          code: 1,
          message: 'Split write failed',
        },
      },
    ]);

    const componentStageMap: ComponentStageMap = {
      pipeline_id: 'pipeline-1',
      description: 'test',
      kfp_run_id: 'run-1',
      published_at: '2024-01-01T10:00:00Z',
      components: [
        {
          id: 'automl_data_loader',
          description: 'Load tabular data',
          stages: [
            {
              id: 'prepare_data',
              description: 'Prepare data from the stage map.',
              status: 'completed',
              timestamp: '2024-01-01T10:00:10Z',
            },
            {
              id: 'split',
              description: 'Split and export',
              status: 'failed',
              timestamp: '2024-01-01T10:01:00Z',
            },
          ],
        },
      ],
    };

    const completedMetadata = getStepMetadata(
      'automl_data_loader__prepare_data',
      'Prepare data',
      'completed',
      {
        pipelineRun,
        componentStageMap,
      },
    );

    expect(completedMetadata.details.some((detail) => detail.label === 'Error')).toBe(false);

    const failedMetadata = getStepMetadata(
      'automl_data_loader__split',
      'Split and export',
      'failed',
      {
        pipelineRun,
        componentStageMap,
      },
    );

    expect(failedMetadata.details).toEqual(
      expect.arrayContaining([{ label: 'Error', value: 'Split write failed' }]),
    );
  });

  it('falls back to pipeline run details when the stage map has no matching node', () => {
    const pipelineRun = buildPipelineRun([
      {
        task_id: 'automl-data-loader',
        display_name: 'automl-data-loader',
        create_time: '2024-01-01T10:00:00Z',
        start_time: '2024-01-01T10:00:00Z',
        end_time: '2024-01-01T10:01:42Z',
        state: 'FAILED',
        error: {
          code: 1,
          message: 'Component failed before stage map entry existed',
        },
      },
    ]);

    const componentStageMap: ComponentStageMap = {
      pipeline_id: 'pipeline-1',
      description: 'test',
      kfp_run_id: 'run-1',
      published_at: '2024-01-01T10:00:00Z',
      components: [
        {
          id: 'other_component',
          description: 'Unrelated component',
          stages: [
            {
              id: 'prepare_data',
              description: 'Unrelated stage',
              status: 'completed',
              timestamp: '2024-01-01T10:00:10Z',
            },
          ],
        },
      ],
    };

    const metadata = getStepMetadata('automl_data_loader__prepare_data', 'Prepare data', 'failed', {
      pipelineRun,
      componentStageMap,
    });

    expect(metadata.details).toEqual([
      { label: 'Duration', value: '1 m 42 s' },
      { label: 'Error', value: 'Component failed before stage map entry existed' },
    ]);
  });
});
