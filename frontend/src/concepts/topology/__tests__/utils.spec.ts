import { RunStatus } from '@patternfly/react-topology';
import { ExecutionStateKF } from '#~/concepts/pipelines/kfTypes';
import {
  getExecutionStateLabel,
  getPipelineTaskStatusLabel,
  getRunStatusLabel,
} from '#~/concepts/topology/utils';

describe('getRunStatusLabel', () => {
  it.each([
    [RunStatus.Succeeded, 'Complete'],
    [RunStatus.Failed, 'Failed'],
    [RunStatus.FailedToStart, 'Failed'],
    [RunStatus.Cancelled, 'Canceled'],
    [RunStatus.Running, 'Running'],
    [RunStatus.InProgress, 'Running'],
    [RunStatus.Pending, 'Pending'],
    [RunStatus.Idle, 'Pending'],
    [RunStatus.Skipped, 'Skipped'],
  ])('should announce %s as %s', (status, label) => {
    expect(getRunStatusLabel(status)).toBe(label);
  });

  it('should omit an unavailable status', () => {
    expect(getRunStatusLabel(undefined)).toBe('');
  });
});

describe('getExecutionStateLabel', () => {
  it.each([
    [ExecutionStateKF.CACHED, 'Cached'],
    [ExecutionStateKF.CANCELING, 'Canceling'],
    [ExecutionStateKF.CANCELED, 'Canceled'],
    [ExecutionStateKF.SKIPPED, 'Skipped'],
    [ExecutionStateKF.PENDING, 'Pending'],
    [ExecutionStateKF.RUNNING, 'Running'],
    [ExecutionStateKF.COMPLETE, 'Complete'],
    [ExecutionStateKF.FAILED, 'Failed'],
    [ExecutionStateKF.NEW, undefined],
  ])('should announce %s as %s', (state, label) => {
    expect(getExecutionStateLabel(state)).toBe(label);
  });
});

describe('getPipelineTaskStatusLabel', () => {
  it('should announce cached tasks as cached even when their run status is skipped', () => {
    expect(getPipelineTaskStatusLabel(ExecutionStateKF.CACHED, RunStatus.Skipped)).toBe('Cached');
  });

  it('should use run status when no execution state is available', () => {
    expect(getPipelineTaskStatusLabel(undefined, RunStatus.Failed)).toBe('Failed');
  });

  it('should use run status when an execution state has no spoken label', () => {
    expect(getPipelineTaskStatusLabel(ExecutionStateKF.NEW, RunStatus.Pending)).toBe('Pending');
  });
});
