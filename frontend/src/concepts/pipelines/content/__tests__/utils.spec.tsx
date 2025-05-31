/* eslint-disable camelcase*/
import {
  BanIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  PendingIcon,
  QuestionCircleIcon,
} from '@patternfly/react-icons';
import React from 'react';
import {
  PipelineRunKF,
  StorageStateKF,
  RuntimeStateKF,
  runtimeStateLabels,
} from '#~/concepts/pipelines/kfTypes';
import { computeRunStatus } from '#~/concepts/pipelines/content/utils';

const run: PipelineRunKF = {
  created_at: '2023-09-05T16:23:25Z',
  storage_state: StorageStateKF.AVAILABLE,
  finished_at: '2023-09-05T16:24:34Z',
  run_id: 'dc66a214-4df2-4d4d-a302-0d02d8bba0e7',
  display_name: 'flip-coin',
  scheduled_at: '1970-01-01T00:00:00Z',
  service_account: 'pipeline-runner-pipelines-definition',
  state: RuntimeStateKF.SUCCEEDED,
  error: { code: 500, message: 'Some error message', details: [] },
  experiment_id: 'experiment-id',
  pipeline_version_reference: {
    pipeline_id: 'pipeline-id',
    pipeline_version_id: 'version-id',
  },
  runtime_config: {
    parameters: {},
    pipeline_root: '',
  },
  run_details: {
    pipeline_context_id: '',
    pipeline_run_context_id: '',
    task_details: [],
  },
  recurring_run_id: '',
  state_history: [],
};

const createRun = (state: RuntimeStateKF | string): PipelineRunKF =>
  ({
    ...run,
    state,
  } as PipelineRunKF);

describe('computeRunStatus', () => {
  it('should check for run status when run status is undefined', () => {
    const UNKNOWN_ICON = <QuestionCircleIcon />;
    const UNKNOWN_STATUS = 'warning';
    const UNKNOWN_LABEL = '-';
    const runStatus = computeRunStatus(createRun('-'));
    expect(runStatus.label).toBe(UNKNOWN_LABEL);
    expect(runStatus.icon).toStrictEqual(UNKNOWN_ICON);
    expect(runStatus.status).toBe(UNKNOWN_STATUS);
  });

  it('should check for Started run status', () => {
    const runStatus = computeRunStatus(createRun(RuntimeStateKF.PENDING));
    expect(runStatus.label).toBe(runtimeStateLabels[RuntimeStateKF.PENDING]);
    expect(runStatus.icon).toStrictEqual(<PendingIcon />);
  });

  it('should check for Running run status', () => {
    const runStatus = computeRunStatus(createRun(RuntimeStateKF.RUNNING));
    expect(runStatus.label).toBe(runtimeStateLabels[RuntimeStateKF.RUNNING]);
    expect(runStatus.icon).toStrictEqual(<InProgressIcon />);
  });

  it('should check for Completed run status', () => {
    const runStatus = computeRunStatus(createRun(RuntimeStateKF.SUCCEEDED));
    expect(runStatus.label).toBe(runtimeStateLabels[RuntimeStateKF.SUCCEEDED]);
    expect(runStatus.icon).toStrictEqual(<CheckCircleIcon />);
    expect(runStatus.status).toBe('success');
  });

  it('should check for Failed run status', () => {
    const runStatus = computeRunStatus(createRun(RuntimeStateKF.FAILED));
    expect(runStatus.label).toBe(runtimeStateLabels[RuntimeStateKF.FAILED]);
    expect(runStatus.icon).toStrictEqual(<ExclamationCircleIcon />);
    expect(runStatus.status).toBe('danger');
    expect(runStatus.details).toBe(run.error?.message);
  });

  it('should check for Canceled run status', () => {
    const runStatus = computeRunStatus(createRun(RuntimeStateKF.CANCELED));
    expect(runStatus.label).toBe(runtimeStateLabels[RuntimeStateKF.CANCELED]);
    expect(runStatus.icon).toStrictEqual(<BanIcon />);
  });

  it('should check for default run status', () => {
    const UNKNOWN_ICON = <QuestionCircleIcon />;
    const UNKNOWN_STATUS = 'warning';
    const runStatus = computeRunStatus(createRun('warning'));
    expect(runStatus.status).toBe(UNKNOWN_STATUS);
    expect(runStatus.icon).toStrictEqual(UNKNOWN_ICON);
  });
});
