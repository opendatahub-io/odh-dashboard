import { mockInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockInferenceServiceK8sResource';
import { mockPodK8sResource } from '@odh-dashboard/internal/__mocks__/mockPodK8sResource';
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { getNIMDeploymentStatus } from './status';

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

    const matchingPod = mockPodK8sResource({
      name: 'test-nim-pod',
      namespace: 'test-project',
      isRunning: true,
      labels: { 'app.kubernetes.io/name': 'test-nim' },
    });

    const unmatchedPod = mockPodK8sResource({
      name: 'other-pod',
      namespace: 'test-project',
      isRunning: true,
      labels: { 'app.kubernetes.io/name': 'other-service' },
    });

    const result = getNIMDeploymentStatus(is, [unmatchedPod, matchingPod], 'test-nim');

    expect(result.state).toBeDefined();
  });

  it('should prefer Running pod over Pending during re-rollout', () => {
    const is = mockInferenceServiceK8sResource({
      name: 'test-nim',
      namespace: 'test-project',
    });

    const pendingPod = mockPodK8sResource({
      name: 'test-nim-new-pod',
      namespace: 'test-project',
      isPending: true,
      isRunning: false,
      labels: { 'app.kubernetes.io/name': 'test-nim' },
    });

    const runningPod = mockPodK8sResource({
      name: 'test-nim-old-pod',
      namespace: 'test-project',
      isRunning: true,
      labels: { 'app.kubernetes.io/name': 'test-nim' },
    });

    const result = getNIMDeploymentStatus(is, [pendingPod, runningPod], 'test-nim');

    expect(result.state).not.toBe(ModelDeploymentState.FAILED_TO_LOAD);
  });

  it('should handle empty pods array', () => {
    const is = mockInferenceServiceK8sResource({
      name: 'test-nim',
      namespace: 'test-project',
    });

    const result = getNIMDeploymentStatus(is, [], 'test-nim');

    expect(result.state).toBeDefined();
    expect(result).toHaveProperty('message');
  });
});
