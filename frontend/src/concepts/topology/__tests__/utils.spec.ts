import { RunStatus } from '@patternfly/react-topology';
import { ExecutionStateKF } from '#~/concepts/pipelines/kfTypes';
import { getPipelineTaskStatusLabel } from '#~/concepts/topology/utils';

describe('getPipelineTaskStatusLabel', () => {
  it('announces cached tasks as cached even when their run status is skipped', () => {
    expect(getPipelineTaskStatusLabel(ExecutionStateKF.CACHED, RunStatus.Skipped)).toBe('Cached');
  });

  it('uses run status when no execution state is available', () => {
    expect(getPipelineTaskStatusLabel(undefined, RunStatus.Failed)).toBe('Failed');
  });
});
