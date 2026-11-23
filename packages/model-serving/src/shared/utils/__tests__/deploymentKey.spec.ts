import { buildModelDeploymentKey } from '../deploymentKey';

describe('buildModelDeploymentKey', () => {
  it('should build kind/name keys so IS and LLMIS names do not collide', () => {
    expect(buildModelDeploymentKey('InferenceService', 'foo')).toBe('InferenceService/foo');
    expect(buildModelDeploymentKey('LLMInferenceService', 'foo')).toBe('LLMInferenceService/foo');
  });
});
