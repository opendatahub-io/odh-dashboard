import { mockInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockInferenceServiceK8sResource';
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
