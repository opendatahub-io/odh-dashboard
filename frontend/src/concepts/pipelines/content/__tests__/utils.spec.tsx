/* eslint-disable camelcase*/
import {
  BanIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  NotStartedIcon,
  QuestionCircleIcon,
  SyncAltIcon,
} from '@patternfly/react-icons';
import React from 'react';
import {
  PipelineRunKF,
  PipelineRunStatusesKF,
  RunStorageStateKF,
} from '~/concepts/pipelines/kfTypes';
import { computeRunStatus } from '~/concepts/pipelines/content/utils';

const run: PipelineRunKF = {
  created_at: '2023-09-05T16:23:25Z',
  storage_state: RunStorageStateKF.AVAILABLE,
  pipeline_spec: {
    runtime_config: {
      parameters: {},
      pipeline_root: '',
    },
  },
  finished_at: '2023-09-05T16:24:34Z',
  id: 'dc66a214-4df2-4d4d-a302-0d02d8bba0e7',
  name: 'flip-coin',
  scheduled_at: '1970-01-01T00:00:00Z',
  service_account: 'pipeline-runner-pipelines-definition',
  status: '',
  error: '',
  metrics: [],
};

const createRun = (status: string): PipelineRunKF => ({
  ...run,
  status,
});

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
    const runStatus = computeRunStatus(createRun('Started'));
    expect(runStatus.label).toBe(PipelineRunStatusesKF.STARTED);
    expect(runStatus.icon).toStrictEqual(<NotStartedIcon />);
  });

  it('should check for Running run status', () => {
    const runStatus = computeRunStatus(createRun('Running'));
    expect(runStatus.label).toBe(PipelineRunStatusesKF.RUNNING);
    expect(runStatus.icon).toStrictEqual(<SyncAltIcon />);
  });

  it('should check for Completed run status', () => {
    const runStatus = computeRunStatus(createRun('Completed'));
    expect(runStatus.label).toBe(PipelineRunStatusesKF.COMPLETED);
    expect(runStatus.icon).toStrictEqual(<CheckCircleIcon />);
    expect(runStatus.status).toBe('success');
  });

  it('should check for Failed run status', () => {
    const runStatus = computeRunStatus(createRun('Failed'));
    expect(runStatus.label).toBe(PipelineRunStatusesKF.FAILED);
    expect(runStatus.icon).toStrictEqual(<ExclamationCircleIcon />);
    expect(runStatus.status).toBe('danger');
    expect(runStatus.details).toBe(run.error);
  });

  it('should check for Cancelled run status', () => {
    const runStatus = computeRunStatus(createRun('Cancelled'));
    expect(runStatus.label).toBe(PipelineRunStatusesKF.CANCELLED);
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
