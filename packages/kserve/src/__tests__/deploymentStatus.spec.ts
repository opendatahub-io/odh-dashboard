import { mockInferenceServiceK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockInferenceServiceK8sResource';
import { ModelDeploymentState } from '@odh-dashboard/model-serving/shared';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import { KueueWorkloadStatus } from '@odh-dashboard/internal/concepts/kueue/types';
import { getKServeDeploymentConditions, getKServeDeploymentStatus } from '../deploymentStatus';

describe('getKServeDeploymentConditions', () => {
  it('should include deployment requested from creationTimestamp', () => {
    const isvc = mockInferenceServiceK8sResource({
      creationTimestamp: '2026-04-22T15:44:32Z',
    });
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.LOADED);

    expect(conditions[0]).toEqual({
      type: 'DeploymentRequested',
      label: 'Deployment requested',
      status: 'True',
      lastTransitionTime: '2026-04-22T15:44:32Z',
    });
  });

  it('should map PredictorReady condition', () => {
    const isvc = mockInferenceServiceK8sResource({
      lastTransitionTime: '2026-05-26T13:49:27Z',
    });
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.LOADED);

    const predictorCondition = conditions.find((c) => c.type === 'PredictorReady');
    expect(predictorCondition).toBeDefined();
    expect(predictorCondition?.label).toBe('Predictor ready');
    expect(predictorCondition?.lastTransitionTime).toBe('2026-05-26T13:49:27Z');
  });

  it('should show error message when condition status is False', () => {
    const isvc: InferenceServiceKind = {
      ...mockInferenceServiceK8sResource({}),
      status: {
        url: '',
        conditions: [
          {
            type: 'PredictorReady',
            status: 'False',
            lastTransitionTime: '2026-05-25T02:23:56Z',
            reason: 'ProgressDeadlineExceeded',
            message: 'ReplicaSet "meta-2-predictor-85b5bbd49b" has timed out progressing.',
          },
        ],
      },
    };
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.FAILED_TO_LOAD);

    const predictorCondition = conditions.find((c) => c.type === 'PredictorReady');
    expect(predictorCondition?.status).toBe('False');
    expect(predictorCondition?.message).toBe(
      'ReplicaSet "meta-2-predictor-85b5bbd49b" has timed out progressing.',
    );
  });

  it('should not show message when condition status is True', () => {
    const isvc: InferenceServiceKind = {
      ...mockInferenceServiceK8sResource({}),
      status: {
        url: '',
        conditions: [
          {
            type: 'PredictorReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:49:27Z',
            reason: 'Ready',
            message: 'Some internal message',
          },
        ],
      },
    };
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.LOADED);

    const predictorCondition = conditions.find((c) => c.type === 'PredictorReady');
    expect(predictorCondition?.message).toBeUndefined();
  });

  it('should filter out conditions with reason Stopped except type Stopped', () => {
    const isvc: InferenceServiceKind = {
      ...mockInferenceServiceK8sResource({}),
      status: {
        url: '',
        conditions: [
          {
            type: 'PredictorReady',
            status: 'False',
            reason: 'Stopped',
            lastTransitionTime: '2026-05-26T13:49:27Z',
          },
          {
            type: 'IngressReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:49:01Z',
          },
          {
            type: 'Stopped',
            status: 'True',
            reason: 'Stopped',
            lastTransitionTime: '2026-05-26T13:50:00Z',
          },
        ],
      },
    };
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.PENDING);

    expect(conditions.find((c) => c.type === 'PredictorReady')).toBeUndefined();
    expect(conditions.find((c) => c.type === 'IngressReady')).toBeDefined();
    expect(conditions.find((c) => c.type === 'Stopped')).toEqual(
      expect.objectContaining({
        label: 'Deployment stopped',
        status: 'True',
      }),
    );
  });

  it('should not include conditions that are absent from the resource', () => {
    const isvc: InferenceServiceKind = {
      ...mockInferenceServiceK8sResource({}),
      status: {
        url: '',
        conditions: [
          {
            type: 'PredictorReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:49:27Z',
          },
        ],
      },
    };
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.LOADED);

    expect(conditions.find((c) => c.type === 'IngressReady')).toBeUndefined();
    expect(conditions.find((c) => c.type === 'LatestDeploymentReady')).toBeUndefined();
  });

  it('should handle resource with no status', () => {
    const isvc: InferenceServiceKind = {
      ...mockInferenceServiceK8sResource({ missingStatus: true }),
    };
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.UNKNOWN);

    expect(conditions).toHaveLength(1);
    expect(conditions.map((c) => c.type)).toEqual(['DeploymentRequested']);
  });

  it('should omit CreatePod entirely for non-Kueue deployments (no kueueStatus)', () => {
    const isvc: InferenceServiceKind = {
      ...mockInferenceServiceK8sResource({}),
      status: {
        url: '',
        conditions: [
          {
            type: 'PredictorReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:49:27Z',
          },
        ],
      },
    };
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.LOADED, null);

    expect(conditions.find((c) => c.type === 'CreatePod')).toBeUndefined();
  });

  it('should mark CreatePod as True once Kueue reports Admitted (quota reserved, scheduling gate lifted)', () => {
    const isvc: InferenceServiceKind = {
      ...mockInferenceServiceK8sResource({ missingStatus: true }),
    };
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.UNKNOWN, {
      status: KueueWorkloadStatus.Admitted,
      queueName: 'test-queue',
      timestamp: '2026-05-26T13:49:00Z',
    });

    const createPod = conditions.find((c) => c.type === 'CreatePod');
    expect(createPod?.status).toBe('True');
    expect(createPod?.inProgress).toBe(false);
    expect(createPod?.message).toBeUndefined();
    expect(createPod?.lastTransitionTime).toBe('2026-05-26T13:49:00Z');
  });

  it('should mark CreatePod as True once Kueue confirms the workload is Running (PodsReady)', () => {
    const isvc: InferenceServiceKind = {
      ...mockInferenceServiceK8sResource({ missingStatus: true }),
    };
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.UNKNOWN, {
      status: KueueWorkloadStatus.Running,
      queueName: 'test-queue',
      timestamp: '2026-05-26T13:50:00Z',
    });

    const createPod = conditions.find((c) => c.type === 'CreatePod');
    expect(createPod?.status).toBe('True');
    expect(createPod?.lastTransitionTime).toBe('2026-05-26T13:50:00Z');
  });

  it('should include all conditions in correct order for a ready deployment', () => {
    const isvc: InferenceServiceKind = {
      ...mockInferenceServiceK8sResource({}),
      status: {
        url: '',
        conditions: [
          {
            type: 'LatestDeploymentReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:49:27Z',
          },
          {
            type: 'PredictorReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:49:27Z',
          },
          {
            type: 'IngressReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:49:01Z',
          },
        ],
      },
    };
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.LOADED, {
      status: KueueWorkloadStatus.Admitted,
      queueName: 'test-queue',
      timestamp: '2026-05-26T13:49:01Z',
    });

    expect(conditions.map((c) => c.type)).toEqual([
      'DeploymentRequested',
      'CreatePod',
      'PredictorReady',
      'IngressReady',
      'LatestDeploymentReady',
    ]);
    const createPod = conditions.find((c) => c.type === 'CreatePod');
    expect(createPod?.status).toBe('True');
    expect(createPod?.lastTransitionTime).toBe('2026-05-26T13:49:01Z');
  });

  it('should show LatestDeploymentReady as warning when model is serving but condition is False', () => {
    const isvc: InferenceServiceKind = {
      ...mockInferenceServiceK8sResource({}),
      status: {
        url: '',
        conditions: [
          {
            type: 'PredictorReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:49:27Z',
          },
          {
            type: 'IngressReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:49:01Z',
          },
          {
            type: 'LatestDeploymentReady',
            status: 'False',
            reason: 'AuthProxyMigrationPending',
            message: 'Preserving existing auth proxy container to avoid pod restart.',
            lastTransitionTime: '2026-06-23T20:30:24Z',
          },
        ],
      },
    };
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.LOADED);

    const deploymentReady = conditions.find((c) => c.type === 'LatestDeploymentReady');
    expect(deploymentReady?.status).toBe('Warning');
    expect(deploymentReady?.label).toBe('Deployment ready (update available)');
    expect(deploymentReady?.message).toBe(
      'Preserving existing auth proxy container to avoid pod restart.',
    );
  });

  it('should show LatestDeploymentReady as error when model is NOT serving and condition is False', () => {
    const isvc: InferenceServiceKind = {
      ...mockInferenceServiceK8sResource({}),
      status: {
        url: '',
        conditions: [
          {
            type: 'LatestDeploymentReady',
            status: 'False',
            reason: 'ProgressDeadlineExceeded',
            message: 'Deployment has timed out.',
            lastTransitionTime: '2026-06-23T20:30:24Z',
          },
        ],
      },
    };
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.FAILED_TO_LOAD);

    const deploymentReady = conditions.find((c) => c.type === 'LatestDeploymentReady');
    expect(deploymentReady?.status).toBe('False');
    expect(deploymentReady?.label).toBe('Deployment ready');
    expect(deploymentReady?.message).toBe('Deployment has timed out.');
  });

  it('should mirror workbench severity: a missing queue shows Warning, not False, on CreatePod', () => {
    const isvc = mockInferenceServiceK8sResource({ missingStatus: true });
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.PENDING, {
      status: KueueWorkloadStatus.Inadmissible,
      message: 'LocalQueue no-lq does not exist',
      queueName: 'no-lq',
    });

    const createPod = conditions.find((c) => c.type === 'CreatePod');
    expect(createPod?.status).toBe('Warning');
    expect(createPod?.messageStatus).toBe('Warning');
    expect(createPod?.inProgress).toBe(false);
  });

  it('should show CreatePod as Unknown with an in-progress spinner while merely Queued', () => {
    const isvc = mockInferenceServiceK8sResource({ missingStatus: true });
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.PENDING, {
      status: KueueWorkloadStatus.Queued,
      queueName: 'test-queue',
    });

    const createPod = conditions.find((c) => c.type === 'CreatePod');
    expect(createPod?.status).toBe('Unknown');
    expect(createPod?.inProgress).toBe(true);
  });

  it('should show CreatePod as False when the Kueue workload has Failed', () => {
    const isvc = mockInferenceServiceK8sResource({ missingStatus: true });
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.PENDING, {
      status: KueueWorkloadStatus.Failed,
      queueName: 'test-queue',
    });

    const createPod = conditions.find((c) => c.type === 'CreatePod');
    expect(createPod?.status).toBe('False');
    expect(createPod?.inProgress).toBe(false);
  });

  it('should still show the Kueue sub-step while BlockedOnPreemptionGates (quota reserved but pod creation still held)', () => {
    const isvc = mockInferenceServiceK8sResource({ missingStatus: true });
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.PENDING, {
      status: KueueWorkloadStatus.BlockedOnPreemptionGates,
      queueName: 'test-queue',
    });

    const createPod = conditions.find((c) => c.type === 'CreatePod');
    expect(createPod?.status).not.toBe('True');
  });

  it('should NOT mark CreatePod as True while AdmissionCheck is pending (Kueue only admits once all checks are ready)', () => {
    const isvc = mockInferenceServiceK8sResource({ missingStatus: true });
    const conditions = getKServeDeploymentConditions(isvc, ModelDeploymentState.PENDING, {
      status: KueueWorkloadStatus.AdmissionCheck,
      queueName: 'test-queue',
    });

    const createPod = conditions.find((c) => c.type === 'CreatePod');
    expect(createPod?.status).not.toBe('True');
  });

  it('should set isStarting true and isRunning false when LOADED with Queued Kueue status', () => {
    const isvc = mockInferenceServiceK8sResource({});
    const status = getKServeDeploymentStatus(isvc, [], {
      status: KueueWorkloadStatus.Queued,
      queueName: 'test-queue',
    });

    expect(status.stoppedStates?.isStarting).toBe(true);
    expect(status.stoppedStates?.isRunning).toBe(false);
  });
});
