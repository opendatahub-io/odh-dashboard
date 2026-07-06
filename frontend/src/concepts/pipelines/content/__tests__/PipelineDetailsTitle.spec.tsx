/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import {
  PipelineRunKF,
  StorageStateKF,
  RuntimeStateKF,
  runtimeStateLabels,
} from '#~/concepts/pipelines/kfTypes';
import PipelineDetailsTitle from '#~/concepts/pipelines/content/pipelinesDetails/PipelineDetailsTitle';

const createRun = (overrides: Partial<PipelineRunKF> = {}): PipelineRunKF => ({
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
  ...overrides,
});

describe('PipelineDetailsTitle', () => {
  it('should render the run display name', () => {
    render(<PipelineDetailsTitle run={createRun({ display_name: 'My Pipeline Run' })} />);
    expect(screen.getByText('My Pipeline Run')).toBeInTheDocument();
  });

  it('should render status icon with success status for succeeded run', () => {
    render(
      <PipelineDetailsTitle run={createRun({ state: RuntimeStateKF.SUCCEEDED })} statusIcon />,
    );
    const statusLabel = screen.getByTestId('status-icon');
    expect(statusLabel).toHaveTextContent(runtimeStateLabels[RuntimeStateKF.SUCCEEDED]);
    expect(statusLabel).toHaveClass('pf-m-success');
    expect(statusLabel).toHaveClass('pf-m-outline');
  });

  it('should render status icon with danger status for failed run', () => {
    render(<PipelineDetailsTitle run={createRun({ state: RuntimeStateKF.FAILED })} statusIcon />);
    const statusLabel = screen.getByTestId('status-icon');
    expect(statusLabel).toHaveTextContent(runtimeStateLabels[RuntimeStateKF.FAILED]);
    expect(statusLabel).toHaveClass('pf-m-danger');
  });

  it('should render "Model registered" label with success status when isRegistered is true', () => {
    render(<PipelineDetailsTitle run={createRun()} isRegistered />);
    const modelLabels = screen.getAllByText('Model registered');
    const modelLabel = modelLabels[0].closest('.pf-v6-c-label');
    expect(modelLabel).toHaveClass('pf-m-success');
    expect(modelLabel).toHaveClass('pf-m-outline');
  });

  it('should not render "Model registered" label when isRegistered is false', () => {
    render(<PipelineDetailsTitle run={createRun()} />);
    expect(screen.queryByText('Model registered')).not.toBeInTheDocument();
  });

  it('should render "Archived" label when run is archived', () => {
    render(<PipelineDetailsTitle run={createRun({ storage_state: StorageStateKF.ARCHIVED })} />);
    expect(screen.getByText('Archived')).toBeInTheDocument();
  });

  it('should not render status icon when statusIcon is false', () => {
    render(<PipelineDetailsTitle run={createRun()} />);
    expect(screen.queryByTestId('status-icon')).not.toBeInTheDocument();
  });
});
