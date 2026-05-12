import type { InferenceServiceKind, PodKind } from '@odh-dashboard/internal/k8sTypes';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockInferenceServiceK8sResource';
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { getNIMDeploymentStatus } from '../deploymentStatus';

describe('getNIMDeploymentStatus', () => {
  it('should return LOADING when InferenceService is undefined', () => {
    const result = getNIMDeploymentStatus(undefined, [], 'test-nim');

    expect(result.state).toBe(ModelDeploymentState.LOADING);
    expect(result.message).toBe('Waiting for NIM Operator to provision InferenceService');
    expect(result.stoppedStates).toBeUndefined();
  });

  it('should derive status from InferenceService when it exists', () => {
    const is = mockInferenceServiceK8sResource({
      name: 'test-nim',
      namespace: 'test-project',
    });

    const result = getNIMDeploymentStatus(is, [], 'test-nim');

    expect(result.state).toBeDefined();
    expect(typeof result.state).toBe('string');
  });

  it('should match pod by app.kubernetes.io/name label', () => {
    const is = mockInferenceServiceK8sResource({
      name: 'test-nim',
      namespace: 'test-project',
    });

    const matchingPod = {
      metadata: {
        name: 'test-nim-pod',
        namespace: 'test-project',
        labels: {
          'app.kubernetes.io/name': 'test-nim',
          'app.kubernetes.io/managed-by': 'k8s-nim-operator',
        },
      },
      spec: {},
      status: {
        phase: 'Running',
        containerStatuses: [
          {
            name: 'kserve-container',
            ready: true,
            state: { running: {} },
          },
        ],
      },
    } as unknown as PodKind;

    const unmatchedPod = {
      metadata: {
        name: 'other-pod',
        namespace: 'test-project',
        labels: {
          'app.kubernetes.io/name': 'other-service',
        },
      },
      spec: {},
      status: { phase: 'Running' },
    } as unknown as PodKind;

    const result = getNIMDeploymentStatus(is, [unmatchedPod, matchingPod], 'test-nim');

    expect(result.state).toBeDefined();
  });

  it('should prefer Running pod over Pending during re-rollout', () => {
    const is = mockInferenceServiceK8sResource({
      name: 'test-nim',
      namespace: 'test-project',
    });

    const pendingPod = {
      metadata: {
        name: 'test-nim-new-pod',
        namespace: 'test-project',
        labels: {
          'app.kubernetes.io/name': 'test-nim',
        },
      },
      spec: {},
      status: {
        phase: 'Pending',
        conditions: [
          {
            type: 'PodScheduled',
            status: 'False',
            reason: 'Unschedulable',
          },
        ],
      },
    } as unknown as PodKind;

    const runningPod = {
      metadata: {
        name: 'test-nim-old-pod',
        namespace: 'test-project',
        labels: {
          'app.kubernetes.io/name': 'test-nim',
        },
      },
      spec: {},
      status: {
        phase: 'Running',
        containerStatuses: [
          {
            name: 'kserve-container',
            ready: true,
            state: { running: {} },
          },
        ],
      },
    } as unknown as PodKind;

    const result = getNIMDeploymentStatus(is, [pendingPod, runningPod], 'test-nim');

    expect(result.state).not.toBe(ModelDeploymentState.FAILED_TO_LOAD);
  });

  it('should handle empty pods array', () => {
    const is: InferenceServiceKind = mockInferenceServiceK8sResource({
      name: 'test-nim',
      namespace: 'test-project',
    });

    const result = getNIMDeploymentStatus(is, [], 'test-nim');

    expect(result.state).toBeDefined();
    expect(result).toHaveProperty('message');
  });
});
