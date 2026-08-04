import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockLLMInferenceServiceK8sResource';
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
    expect(conditions[0].type).toBe('DeploymentRequested');
  });
});
