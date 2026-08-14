import {
  KueueWorkloadStatus,
  type KueueWorkloadStatusWithMessage,
} from '@odh-dashboard/internal/concepts/kueue/types';
import { ModelDeploymentState } from '@odh-dashboard/model-serving/shared';
import { getModelDeploymentStoppedStates } from '../utils';

const kueueStatus = (
  status: KueueWorkloadStatus,
  overrides: Partial<KueueWorkloadStatusWithMessage> = {},
): KueueWorkloadStatusWithMessage => ({
  status,
  queueName: 'test-queue',
  ...overrides,
});

describe('getModelDeploymentStoppedStates', () => {
  it('returns isStarting true when Workload is Queued during restart', () => {
    const stoppedStates = getModelDeploymentStoppedStates(
      ModelDeploymentState.UNKNOWN,
      {},
      undefined,
      kueueStatus(KueueWorkloadStatus.Queued),
    );
    expect(stoppedStates.isStarting).toBe(true);
    expect(stoppedStates.isRunning).toBe(false);
  });

  it('returns isStarting true when Workload is Inadmissible (quota pending UI)', () => {
    const stoppedStates = getModelDeploymentStoppedStates(
      ModelDeploymentState.PENDING,
      {},
      undefined,
      kueueStatus(KueueWorkloadStatus.Inadmissible),
    );
    expect(stoppedStates.isStarting).toBe(true);
    expect(stoppedStates.isRunning).toBe(false);
  });

  it('returns isStarting false and isRunning true when Workload is Admitted and IS is LOADED', () => {
    const stoppedStates = getModelDeploymentStoppedStates(
      ModelDeploymentState.LOADED,
      {},
      undefined,
      kueueStatus(KueueWorkloadStatus.Admitted),
    );
    expect(stoppedStates.isStarting).toBe(false);
    expect(stoppedStates.isRunning).toBe(true);
  });

  it('returns isStopped true and not isStarting when stop annotation is set with no pod', () => {
    const stoppedStates = getModelDeploymentStoppedStates(
      ModelDeploymentState.UNKNOWN,
      { 'serving.kserve.io/stop': 'true' },
      undefined,
      kueueStatus(KueueWorkloadStatus.Queued),
    );
    expect(stoppedStates.isStopped).toBe(true);
    expect(stoppedStates.isStarting).toBe(false);
  });

  it('returns isStarting true for UNKNOWN state with no Workload (existing logic)', () => {
    const stoppedStates = getModelDeploymentStoppedStates(
      ModelDeploymentState.UNKNOWN,
      {},
      undefined,
      null,
    );
    expect(stoppedStates.isStarting).toBe(true);
    expect(stoppedStates.isRunning).toBe(false);
  });

  it('slow admission: LOADED KServe state with Queued Workload keeps isStarting true and isRunning false', () => {
    const stoppedStates = getModelDeploymentStoppedStates(
      ModelDeploymentState.LOADED,
      {},
      undefined,
      kueueStatus(KueueWorkloadStatus.Queued),
    );
    expect(stoppedStates.isStarting).toBe(true);
    expect(stoppedStates.isRunning).toBe(false);
  });

  it('fast admission: transitions from Queued pre-admission to running when Admitted', () => {
    const queued = getModelDeploymentStoppedStates(
      ModelDeploymentState.LOADED,
      {},
      undefined,
      kueueStatus(KueueWorkloadStatus.Queued),
    );
    expect(queued.isStarting).toBe(true);
    expect(queued.isRunning).toBe(false);

    const admitted = getModelDeploymentStoppedStates(
      ModelDeploymentState.LOADED,
      {},
      undefined,
      kueueStatus(KueueWorkloadStatus.Admitted),
    );
    expect(admitted.isStarting).toBe(false);
    expect(admitted.isRunning).toBe(true);
  });
});
