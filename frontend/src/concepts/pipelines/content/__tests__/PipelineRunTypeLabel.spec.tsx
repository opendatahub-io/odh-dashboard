/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import {
  PipelineRunKF,
  PipelineRecurringRunKF,
  StorageStateKF,
  RuntimeStateKF,
} from '#~/concepts/pipelines/kfTypes';
import PipelineRunTypeLabel from '#~/concepts/pipelines/content/PipelineRunTypeLabel';

const baseRun: PipelineRunKF = {
  created_at: '2023-09-05T16:23:25Z',
  storage_state: StorageStateKF.AVAILABLE,
  finished_at: '2023-09-05T16:24:34Z',
  run_id: 'test-run-id',
  display_name: 'test-run',
  scheduled_at: '1970-01-01T00:00:00Z',
  service_account: 'pipeline-runner',
  state: RuntimeStateKF.SUCCEEDED,
  experiment_id: 'experiment-id',
  pipeline_version_reference: {
    pipeline_id: 'pipeline-id',
    pipeline_version_id: 'version-id',
  },
  runtime_config: { parameters: {}, pipeline_root: '' },
  run_details: { pipeline_context_id: '', pipeline_run_context_id: '', task_details: [] },
  recurring_run_id: '',
  state_history: [],
};

const recurringRun: PipelineRecurringRunKF = {
  ...baseRun,
  recurring_run_id: 'recurring-run-id',
} as unknown as PipelineRecurringRunKF;

describe('PipelineRunTypeLabel', () => {
  it('should render "One-off" label for a non-recurring run', () => {
    render(<PipelineRunTypeLabel run={baseRun} />);
    expect(screen.getByText('One-off')).toBeInTheDocument();
  });

  it('should render "Recurring" label for a recurring run', () => {
    render(<PipelineRunTypeLabel run={recurringRun} />);
    expect(screen.getByText('Recurring')).toBeInTheDocument();
  });

  it('should render "Model registered" label with success status when isModelRegistered is true', () => {
    render(<PipelineRunTypeLabel run={baseRun} isModelRegistered />);
    const modelLabel = screen.getByTestId('model-registered-label');
    expect(modelLabel).toHaveTextContent('Model registered');
    expect(modelLabel).toHaveClass('pf-m-success');
    expect(modelLabel).toHaveClass('pf-m-outline');
  });

  it('should not render "Model registered" label when isModelRegistered is false', () => {
    render(<PipelineRunTypeLabel run={baseRun} isModelRegistered={false} />);
    expect(screen.queryByTestId('model-registered-label')).not.toBeInTheDocument();
  });
});
