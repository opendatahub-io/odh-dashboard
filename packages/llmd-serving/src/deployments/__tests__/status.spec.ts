import { KueueWorkloadStatus } from '@odh-dashboard/k8s-core/kueue/types';
import { ModelDeploymentState } from '@odh-dashboard/model-serving/shared';
import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceK8sResource';
import type { LLMInferenceServiceKind } from '../../types';
import {
  getLLMdDeploymentConditions,
  getLLMInferenceServiceModelState,
  getLLMInferenceServiceStatusMessage,
} from '../status';

describe('LLM inference service lifecycle state', () => {
  it('should keep a resource in deleting state until Kubernetes removes it', () => {
    const service = mockLLMInferenceServiceK8sResource({ deleted: true, isReady: true });
    service.metadata.finalizers = ['serving.kserve.io/finalizer'];
    expect(getLLMInferenceServiceModelState(service)).toBe(ModelDeploymentState.DELETING);
    expect(getLLMInferenceServiceStatusMessage(service)).toContain('delet');
  });

  it('should expose an explicit controller failure and its actionable message', () => {
    const service = mockLLMInferenceServiceK8sResource({});
    service.status = {
      conditions: [
        {
          type: 'Ready',
          status: 'False',
          severity: 'Error',
          reason: 'InvalidModelConfig',
          message: 'The referenced model configuration does not exist.',
        },
      ],
    };
    expect(getLLMInferenceServiceModelState(service)).toBe(ModelDeploymentState.FAILED_TO_LOAD);
    expect(getLLMInferenceServiceStatusMessage(service)).toBe(
      'The referenced model configuration does not exist.',
    );
  });

  it.each([
    'Progressing',
    'MinimumReplicasUnavailable',
    'Stopped',
    'GatewaysNotReady',
    'HTTPRouteNotObserved',
    'HTTPRoutesNotReady',
    'WaitingForGateway',
    'InferencePoolNotReady',
  ])('should preserve ordinary startup and stopped transitions: %s', (reason) => {
    const service = mockLLMInferenceServiceK8sResource({});
    service.status = {
      conditions: [{ type: 'Ready', status: 'False', severity: 'Error', reason }],
    };
    expect(getLLMInferenceServiceModelState(service)).toBe(ModelDeploymentState.PENDING);
  });

  it('should use the failing child condition when Ready has no actionable message', () => {
    const service = mockLLMInferenceServiceK8sResource({});
    service.status = {
      conditions: [
        { type: 'Ready', status: 'False', reason: 'Progressing' },
        {
          type: 'RouterReady',
          status: 'False',
          severity: 'Error',
          reason: 'InvalidGateway',
          message: 'The selected gateway is not available.',
        },
      ],
    };
    expect(getLLMInferenceServiceModelState(service)).toBe(ModelDeploymentState.FAILED_TO_LOAD);
    expect(getLLMInferenceServiceStatusMessage(service)).toBe(
      'The selected gateway is not available.',
    );
  });

  it.each(['True', 'Unknown'])('should not treat a %s condition as a failure', (status) => {
    const service = mockLLMInferenceServiceK8sResource({});
    service.status = {
      conditions: [{ type: 'Ready', status, severity: 'Error', reason: 'InvalidModelConfig' }],
    };
    expect(getLLMInferenceServiceModelState(service)).toBe(
      status === 'True' ? ModelDeploymentState.LOADED : ModelDeploymentState.UNKNOWN,
    );
  });

  it.each(['True', 'False'])(
    'should ignore stale child errors when Ready is %s or stopped',
    (status) => {
      const service = mockLLMInferenceServiceK8sResource({});
      service.status = {
        conditions: [
          { type: 'Ready', status, reason: status === 'False' ? 'Stopped' : undefined },
          { type: 'PresetsCombined', status: 'False', severity: 'Error', reason: 'ConfigNotFound' },
        ],
      };
      expect(getLLMInferenceServiceModelState(service)).toBe(
        status === 'True' ? ModelDeploymentState.LOADED : ModelDeploymentState.PENDING,
      );
    },
  );

  it('should ignore informational conditions that do not gate readiness', () => {
    const service = mockLLMInferenceServiceK8sResource({});
    service.status = {
      conditions: [
        { type: 'Ready', status: 'False', reason: 'Progressing' },
        { type: 'GroupDegraded', status: 'False', severity: 'Error' },
      ],
    };
    expect(getLLMInferenceServiceModelState(service)).toBe(ModelDeploymentState.PENDING);
  });

  it('should preserve deadline failures without an explicit severity', () => {
    const service = mockLLMInferenceServiceK8sResource({});
    service.status = {
      conditions: [{ type: 'Ready', status: 'False', reason: 'ProgressDeadlineExceeded' }],
    };
    expect(getLLMInferenceServiceModelState(service)).toBe(ModelDeploymentState.FAILED_TO_LOAD);
    expect(getLLMInferenceServiceStatusMessage(service)).toBe('ProgressDeadlineExceeded');
  });

  it.each([undefined, 'Warning', 'Info'])(
    'should keep an unrecognized reason pending when severity is %s',
    (severity) => {
      const service = mockLLMInferenceServiceK8sResource({});
      service.status = {
        conditions: [{ type: 'Ready', status: 'False', reason: 'WaitingForDependency', severity }],
      };
      expect(getLLMInferenceServiceModelState(service)).toBe(ModelDeploymentState.PENDING);
    },
  );
});

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
