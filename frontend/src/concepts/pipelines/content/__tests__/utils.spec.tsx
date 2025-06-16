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
import { computeRunStatus, getStatusFromCondition } from '#~/concepts/pipelines/content/utils';
import { K8sCondition } from '#~/k8sTypes';
import { StatusType } from '#~/concepts/pipelines/content/K8sStatusIcon.tsx';

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

describe('getStatusFromCondition', () => {
  it('should return pending for MLMDProxyReady with Unknown status', () => {
    const condition: K8sCondition = {
      lastTransitionTime: '2025-06-04T19:48:42Z',
      message: '',
      reason: 'Unknown',
      status: 'Unknown',
      type: 'MLMDProxyReady',
    };

    expect(getStatusFromCondition(condition)).toBe(StatusType.PENDING);
  });

  it('should return success for ObjectStoreAvailable with True status', () => {
    const condition: K8sCondition = {
      lastTransitionTime: '2025-06-04T19:48:43Z',
      message: 'Object Store connectivity successfully verified',
      reason: 'ObjectStoreAvailable',
      status: 'True',
      type: 'ObjectStoreAvailable',
    };

    expect(getStatusFromCondition(condition)).toBe(StatusType.SUCCESS);
  });

  it('should return error for FailingToDeploy with False status and long transition time', () => {
    const condition: K8sCondition = {
      lastTransitionTime: '2025-06-04T19:49:04Z',
      message:
        'Component\'s replica [ds-pipeline-dspa] has failed to create. Reason: [FailedCreate]. Message: [pods "ds-pipeline-dspa-84f8c4d8b-" is forbidden: error looking up service account brand-new-one/ds-pipeline-dspa: serviceaccount "ds-pipeline-dspa" not found]',
      reason: 'FailingToDeploy',
      status: 'False',
      type: 'APIServerReady',
    };

    expect(getStatusFromCondition(condition)).toBe(StatusType.ERROR);
  });

  it('should return in-progress for Deploying with False status', () => {
    const condition: K8sCondition = {
      lastTransitionTime: '2025-06-04T19:49:04Z',
      message: 'Component [ds-pipeline-dspa] is deploying.',
      reason: 'Deploying',
      status: 'False',
      type: 'APIServerReady',
    };

    expect(getStatusFromCondition(condition)).toBe(StatusType.IN_PROGRESS);

    const condition2: K8sCondition = {
      lastTransitionTime: '2025-06-16T19:58:10Z',
      message: 'Component [ds-pipeline-persistenceagent-dspa] is deploying.',
      reason: 'Deploying',
      status: 'False',
      type: 'PersistenceAgentReady',
    };
    expect(getStatusFromCondition(condition2)).toBe(StatusType.IN_PROGRESS);
  });

  // Additional test cases to cover all branches
  it('should return warning for FailingToDeploy with medium transition time (4 minutes)', () => {
    const condition: K8sCondition = {
      lastTransitionTime: new Date(Date.now() - 1000 * 60 * 4).toISOString(), // 4 minutes ago
      message: 'Component failed to deploy',
      reason: 'FailingToDeploy',
      status: 'False',
      type: 'APIServerReady',
    };

    expect(getStatusFromCondition(condition)).toBe(StatusType.WARNING);
  });

  it('should return pending for FailingToDeploy with short transition time (2 minutes)', () => {
    const condition: K8sCondition = {
      lastTransitionTime: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 minutes ago
      message: 'Component failed to deploy',
      reason: 'FailingToDeploy',
      status: 'False',
      type: 'APIServerReady',
    };

    expect(getStatusFromCondition(condition)).toBe(StatusType.PENDING);
  });

  it('should return error for FailingToDeploy with long transition time (11 minutes)', () => {
    const condition: K8sCondition = {
      lastTransitionTime: new Date(Date.now() - 1000 * 60 * 11).toISOString(), // 11 minutes ago
      message: 'Component failed to deploy',
      reason: 'FailingToDeploy',
      status: 'False',
      type: 'APIServerReady',
    };

    expect(getStatusFromCondition(condition)).toBe(StatusType.ERROR);
  });

  it('should return warning for FailingToDeploy at 3 minutes 15 seconds', () => {
    const condition: K8sCondition = {
      lastTransitionTime: new Date(Date.now() - 1000 * 60 * 3 - 1000 * 15).toISOString(), // exactly 3 minutes ago
      message: 'Component failed to deploy',
      reason: 'FailingToDeploy',
      status: 'False',
      type: 'APIServerReady',
    };

    expect(getStatusFromCondition(condition)).toBe(StatusType.WARNING);
  });

  it('should return error for FailingToDeploy at exactly 10 minutes', () => {
    const condition: K8sCondition = {
      lastTransitionTime: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // exactly 10 minutes ago
      message: 'Component failed to deploy',
      reason: 'FailingToDeploy',
      status: 'False',
      type: 'APIServerReady',
    };

    expect(getStatusFromCondition(condition)).toBe(StatusType.ERROR);
  });
});
