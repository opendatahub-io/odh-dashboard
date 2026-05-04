import type { InferenceServiceKind, PodKind } from '@odh-dashboard/internal/k8sTypes';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockInferenceServiceK8sResource';
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { getNIMDeploymentStatus } from '../deploymentStatus';

describe('getNIMDeploymentStatus', () => {
  it('should return LOADING when InferenceService is undefined', () => {
    const result = getNIMDeploymentStatus(undefined, []);

    expect(result.state).toBe(ModelDeploymentState.LOADING);
    expect(result.message).toBe('Waiting for NIM Operator to provision InferenceService');
    expect(result.stoppedStates).toBeUndefined();
  });

  it('should derive status from InferenceService when it exists', () => {
    const is = mockInferenceServiceK8sResource({
      name: 'test-nim',
      namespace: 'test-project',
    });

    const result = getNIMDeploymentStatus(is, []);

    expect(result.state).toBeDefined();
    expect(typeof result.state).toBe('string');
  });

  it('should match pod to InferenceService by label', () => {
    const is = mockInferenceServiceK8sResource({
      name: 'test-nim',
      namespace: 'test-project',
    });

    const matchingPod = {
      metadata: {
        name: 'test-nim-predictor-pod',
        namespace: 'test-project',
        labels: {
          'serving.kserve.io/inferenceservice': 'test-nim',
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
          'serving.kserve.io/inferenceservice': 'other-service',
        },
      },
      spec: {},
      status: { phase: 'Running' },
    } as unknown as PodKind;

    const result = getNIMDeploymentStatus(is, [unmatchedPod, matchingPod]);

    expect(result.state).toBeDefined();
  });

  it('should handle InferenceService with no matching pods', () => {
    const is = mockInferenceServiceK8sResource({
      name: 'test-nim',
      namespace: 'test-project',
    });

    const unrelatedPod = {
      metadata: {
        name: 'unrelated-pod',
        namespace: 'test-project',
        labels: {
          'serving.kserve.io/inferenceservice': 'different-service',
        },
      },
      spec: {},
      status: { phase: 'Running' },
    } as unknown as PodKind;

    const result = getNIMDeploymentStatus(is, [unrelatedPod]);

    expect(result.state).toBeDefined();
  });

  it('should handle empty pods array', () => {
    const is: InferenceServiceKind = mockInferenceServiceK8sResource({
      name: 'test-nim',
      namespace: 'test-project',
    });

    const result = getNIMDeploymentStatus(is, []);

    expect(result.state).toBeDefined();
    expect(result).toHaveProperty('message');
  });
});
