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

    expect(metadata.description).toBe(
      'Validating pipeline inputs and configuration before processing begins.',
    );
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

    expect(metadata.description).toBe('Validating and preprocessing input data for training.');
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

  it('prefers curated descriptions over stage map copy', () => {
    const componentStageMap: ComponentStageMap = {
      pipeline_id: 'pipeline-1',
      description: 'test',
      kfp_run_id: 'run-1',
      published_at: '2024-01-01T10:00:00Z',
      components: [
        {
          id: 'automl_data_loader',
          description: 'Data loader',
          stages: [
            {
              id: 'prepare_data',
              description: 'Stage map prepare data.',
              status: 'completed',
              timestamp: '2024-01-01T10:00:10Z',
            },
            {
              id: 'split_and_export',
              description: 'Stage map split.',
              status: 'completed',
              timestamp: '2024-01-01T10:00:20Z',
            },
          ],
        },
        {
          id: 'training',
          description: 'Training',
          stages: [
            {
              id: 'load_data',
              description: 'Stage map load data.',
              status: 'completed',
              timestamp: '2024-01-01T10:00:30Z',
            },
            {
              id: 'model_selection',
              description: 'Stage map model selection.',
              status: 'completed',
              timestamp: '2024-01-01T10:00:40Z',
              steps: ['feature_engineering', 'model_training', 'stacking', 'evaluation'],
            },
            {
              id: 'refit_full',
              description: 'Stage map refit.',
              status: 'completed',
              timestamp: '2024-01-01T10:01:00Z',
            },
            {
              id: 'build_leaderboard',
              description: 'Stage map leaderboard.',
              status: 'completed',
              timestamp: '2024-01-01T10:01:10Z',
            },
          ],
        },
      ],
    };

    expect(
      getStepMetadata('automl_data_loader__prepare_data', 'Prepare data', 'completed', {
        componentStageMap,
      }).description,
    ).toBe('Validating and preprocessing input data for training.');
    expect(
      getStepMetadata('automl_data_loader__split_and_export', 'Split data', 'completed', {
        componentStageMap,
      }).description,
    ).toBe('Splitting data into training and test sets for model evaluation.');
    expect(
      getStepMetadata('training__load_data', 'Load data', 'completed', { componentStageMap })
        .description,
    ).toBe('Loading prepared data into the training workspace.');
    expect(
      getStepMetadata('training__model_selection', 'Select models', 'completed', {
        componentStageMap,
      }).description,
    ).toBe('Selecting candidate model architectures to train and evaluate.');
    expect(
      getStepMetadata(
        'training__step__feature_engineering__branch-0',
        'Engineer features',
        'completed',
        { componentStageMap },
      ).description,
    ).toBe('Transforming raw data into features for model training.');
    expect(
      getStepMetadata('training__step__model_training__branch-0', 'Train model', 'completed', {
        componentStageMap,
      }).description,
    ).toBe('Training the model using the prepared training data.');
    expect(
      getStepMetadata('training__step__stacking__branch-0', 'Stack predictions', 'completed', {
        componentStageMap,
      }).description,
    ).toBe('Combining predictions from multiple models to improve accuracy.');
    expect(
      getStepMetadata('training__step__evaluation__branch-0', 'Evaluate results', 'completed', {
        componentStageMap,
      }).description,
    ).toBe('Evaluating model performance against the test set.');
    expect(
      getStepMetadata('training__model__branch-0', 'XGBoost', 'completed', { componentStageMap })
        .description,
    ).toBe('The trained model candidate and its configuration.');
    expect(
      getStepMetadata('training__refit_full', 'Refit and evaluate', 'completed', {
        componentStageMap,
      }).description,
    ).toBe('Retraining top models using the complete dataset and evaluating final performance.');
    expect(
      getStepMetadata('training__build_leaderboard', 'Build leaderboard', 'completed', {
        componentStageMap,
      }).description,
    ).toBe('Ranking models by performance and generating the results leaderboard.');
  });

  it('falls back to stage map description when no curated mapping exists', () => {
    const componentStageMap: ComponentStageMap = {
      pipeline_id: 'pipeline-1',
      description: 'test',
      kfp_run_id: 'run-1',
      published_at: '2024-01-01T10:00:00Z',
      components: [
        {
          id: 'custom_component',
          description: 'Custom',
          stages: [
            {
              id: 'custom_unmapped_stage',
              description: 'Custom stage map description.',
              status: 'completed',
              timestamp: '2024-01-01T10:00:10Z',
            },
          ],
        },
      ],
    };

    expect(
      getStepMetadata(
        'custom_component__custom_unmapped_stage',
        'Custom unmapped stage',
        'completed',
        { componentStageMap },
      ).description,
    ).toBe('Custom stage map description.');
  });
});
