import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceK8sResource';
import type { LLMInferenceServiceKind } from '../../types';
import { getLLMdDeploymentConditions } from '../status';

describe('getLLMdDeploymentConditions', () => {
  it('should include deployment requested from creationTimestamp', () => {
    const isvc = mockLLMInferenceServiceK8sResource({
      creationTimestamp: '2026-05-19T16:40:38Z',
    });
    const conditions = getLLMdDeploymentConditions(isvc);

    expect(conditions[0]).toEqual({
      type: 'DeploymentRequested',
      label: 'Deployment requested',
      status: 'True',
      lastTransitionTime: '2026-05-19T16:40:38Z',
    });
  });

  it('should map Ready condition to Deployment ready', () => {
    const isvc = mockLLMInferenceServiceK8sResource({ isReady: true });
    const conditions = getLLMdDeploymentConditions(isvc);

    const readyCondition = conditions.find((c) => c.type === 'Ready');
    expect(readyCondition).toBeDefined();
    expect(readyCondition?.label).toBe('Deployment ready');
    expect(readyCondition?.status).toBe('True');
  });

  it('should show Deployment stopped when Ready has reason Stopped', () => {
    const isvc: LLMInferenceServiceKind = {
      ...mockLLMInferenceServiceK8sResource({}),
      status: {
        conditions: [
          {
            type: 'Ready',
            status: 'False',
            reason: 'Stopped',
            message: 'Deployment has been stopped',
            lastTransitionTime: '2026-05-26T13:50:00Z',
          },
        ],
      },
    };
    const conditions = getLLMdDeploymentConditions(isvc);

    const stoppedCondition = conditions.find((c) => c.type === 'Stopped');
    expect(stoppedCondition).toBeDefined();
    expect(stoppedCondition?.label).toBe('Deployment stopped');
    expect(stoppedCondition?.status).toBe('True');
    expect(conditions.find((c) => c.type === 'Ready')).toBeUndefined();
  });

  it('should show error message for failed conditions', () => {
    const isvc: LLMInferenceServiceKind = {
      ...mockLLMInferenceServiceK8sResource({}),
      status: {
        conditions: [
          {
            type: 'WorkloadsReady',
            status: 'False',
            reason: 'MinimumReplicasUnavailable',
            message: 'Deployment does not have minimum availability.',
            lastTransitionTime: '2026-05-26T13:50:48Z',
          },
          {
            type: 'MainWorkloadReady',
            status: 'False',
            reason: 'MinimumReplicasUnavailable',
            message: 'Deployment does not have minimum availability.',
            lastTransitionTime: '2026-05-26T13:50:48Z',
          },
          {
            type: 'Ready',
            status: 'False',
            reason: 'MinimumReplicasUnavailable',
            lastTransitionTime: '2026-05-26T13:50:48Z',
          },
        ],
      },
    };
    const conditions = getLLMdDeploymentConditions(isvc);

    const workload = conditions.find((c) => c.type === 'WorkloadsReady');
    expect(workload).toBeDefined();
    const mainWorkload = workload?.children?.find((c) => c.type === 'MainWorkloadReady');
    expect(mainWorkload).toBeDefined();
    expect(mainWorkload?.status).toBe('False');
    expect(mainWorkload?.message).toBe('Deployment does not have minimum availability.');
  });

  it('should nest InferencePoolReady under Router / scheduler', () => {
    const isvc: LLMInferenceServiceKind = {
      ...mockLLMInferenceServiceK8sResource({}),
      status: {
        conditions: [
          {
            type: 'RouterReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:51:21Z',
          },
          {
            type: 'InferencePoolReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:50:40Z',
          },
          {
            type: 'HTTPRoutesReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:50:48Z',
          },
          {
            type: 'SchedulerWorkloadReady',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:51:21Z',
          },
          {
            type: 'Ready',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:51:21Z',
          },
        ],
      },
    };
    const conditions = getLLMdDeploymentConditions(isvc);

    const router = conditions.find((c) => c.type === 'RouterReady');
    expect(router).toBeDefined();
    expect(router?.label).toBe('Router / scheduler');
    expect(router?.children).toHaveLength(3);
    expect(router?.children?.map((c) => c.type)).toEqual([
      'HTTPRoutesReady',
      'InferencePoolReady',
      'SchedulerWorkloadReady',
    ]);
  });

  it('should nest MainWorkloadReady under Model workload', () => {
    const isvc: LLMInferenceServiceKind = {
      ...mockLLMInferenceServiceK8sResource({}),
      status: {
        conditions: [
          {
            type: 'WorkloadsReady',
            status: 'False',
            reason: 'MinimumReplicasUnavailable',
            message: 'Deployment does not have minimum availability.',
            lastTransitionTime: '2026-05-26T13:50:48Z',
          },
          {
            type: 'MainWorkloadReady',
            status: 'False',
            reason: 'MinimumReplicasUnavailable',
            message: 'Deployment does not have minimum availability.',
            lastTransitionTime: '2026-05-26T13:50:48Z',
          },
          {
            type: 'Ready',
            status: 'False',
            reason: 'MinimumReplicasUnavailable',
            lastTransitionTime: '2026-05-26T13:50:48Z',
          },
        ],
      },
    };
    const conditions = getLLMdDeploymentConditions(isvc);

    const workload = conditions.find((c) => c.type === 'WorkloadsReady');
    expect(workload).toBeDefined();
    expect(workload?.label).toBe('Model workload');
    expect(workload?.children).toHaveLength(1);
    expect(workload?.children?.[0].type).toBe('MainWorkloadReady');
    expect(workload?.children?.[0].label).toBe('Main workload ready');
  });

  it('should filter out conditions with reason Stopped', () => {
    const isvc: LLMInferenceServiceKind = {
      ...mockLLMInferenceServiceK8sResource({}),
      status: {
        conditions: [
          {
            type: 'WorkloadsReady',
            status: 'False',
            reason: 'Stopped',
            lastTransitionTime: '2026-05-26T13:50:48Z',
          },
          {
            type: 'MainWorkloadReady',
            status: 'False',
            reason: 'Stopped',
            lastTransitionTime: '2026-05-26T13:50:48Z',
          },
          {
            type: 'Ready',
            status: 'False',
            reason: 'Stopped',
            lastTransitionTime: '2026-05-26T13:50:00Z',
          },
        ],
      },
    };
    const conditions = getLLMdDeploymentConditions(isvc);

    expect(conditions.find((c) => c.type === 'WorkloadsReady')).toBeUndefined();
    expect(conditions.find((c) => c.type === 'Stopped')).toBeDefined();
    expect(conditions.find((c) => c.type === 'Stopped')?.label).toBe('Deployment stopped');
  });

  it('should skip conditions not present on the resource', () => {
    const isvc: LLMInferenceServiceKind = {
      ...mockLLMInferenceServiceK8sResource({}),
      status: {
        conditions: [
          {
            type: 'Ready',
            status: 'True',
            lastTransitionTime: '2026-05-26T13:51:21Z',
          },
        ],
      },
    };
    const conditions = getLLMdDeploymentConditions(isvc);

    expect(conditions).toHaveLength(2);
    expect(conditions.map((c) => c.type)).toEqual(['DeploymentRequested', 'Ready']);
  });

  it('should handle resource with no status', () => {
    const isvc: LLMInferenceServiceKind = {
      ...mockLLMInferenceServiceK8sResource({}),
      status: undefined,
    };
    const conditions = getLLMdDeploymentConditions(isvc);

    expect(conditions).toHaveLength(1);
    expect(conditions.map((c) => c.type)).toEqual(['DeploymentRequested']);
  });

  it('should omit CreatePod entirely for non-Kueue deployments (no kueueStatus)', () => {
    const isvc: LLMInferenceServiceKind = {
      ...mockLLMInferenceServiceK8sResource({}),
      status: {
        conditions: [
          {
            type: 'PresetsCombined',
            status: 'Unknown',
            lastTransitionTime: '2026-05-26T13:49:27Z',
          },
        ],
      },
    };
    const conditions = getLLMdDeploymentConditions(isvc, null);

    expect(conditions.find((c) => c.type === 'CreatePod')).toBeUndefined();
  });

  it('should show CreatePod as Unknown with an in-progress spinner while merely Queued', () => {
    const isvc: LLMInferenceServiceKind = {
      ...mockLLMInferenceServiceK8sResource({}),
      status: undefined,
    };
    const conditions = getLLMdDeploymentConditions(isvc, {
      status: KueueWorkloadStatus.Queued,
      queueName: 'test-queue',
    });

    const createPod = conditions.find((c) => c.type === 'CreatePod');
    expect(createPod?.status).toBe('Unknown');
    expect(createPod?.inProgress).toBe(true);
  });

  it('should mark CreatePod as True once Kueue reports Admitted (quota reserved, scheduling gate lifted)', () => {
    const isvc: LLMInferenceServiceKind = {
      ...mockLLMInferenceServiceK8sResource({}),
      status: undefined,
    };
    const conditions = getLLMdDeploymentConditions(isvc, {
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
    const isvc: LLMInferenceServiceKind = {
      ...mockLLMInferenceServiceK8sResource({}),
      status: undefined,
    };
    const conditions = getLLMdDeploymentConditions(isvc, {
      status: KueueWorkloadStatus.Running,
      queueName: 'test-queue',
      timestamp: '2026-05-26T13:50:00Z',
    });

    const createPod = conditions.find((c) => c.type === 'CreatePod');
    expect(createPod?.status).toBe('True');
    expect(createPod?.inProgress).toBe(false);
    expect(createPod?.message).toBeUndefined();
    expect(createPod?.lastTransitionTime).toBe('2026-05-26T13:50:00Z');
  });

  it('should still show the Kueue sub-step while BlockedOnPreemptionGates (quota reserved but pod creation still held)', () => {
    const isvc: LLMInferenceServiceKind = {
      ...mockLLMInferenceServiceK8sResource({}),
      status: undefined,
    };
    const conditions = getLLMdDeploymentConditions(isvc, {
      status: KueueWorkloadStatus.BlockedOnPreemptionGates,
      queueName: 'test-queue',
    });

    const createPod = conditions.find((c) => c.type === 'CreatePod');
    expect(createPod?.status).not.toBe('True');
  });

  it('should NOT mark CreatePod as True while AdmissionCheck is pending (Kueue only admits once all checks are ready)', () => {
    const isvc: LLMInferenceServiceKind = {
      ...mockLLMInferenceServiceK8sResource({}),
      status: undefined,
    };
    const conditions = getLLMdDeploymentConditions(isvc, {
      status: KueueWorkloadStatus.AdmissionCheck,
      queueName: 'test-queue',
    });

    const createPod = conditions.find((c) => c.type === 'CreatePod');
    expect(createPod?.status).not.toBe('True');
  });
});
