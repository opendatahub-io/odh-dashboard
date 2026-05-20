import { mockInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockInferenceServiceK8sResource';
import type { Deployment } from '@odh-dashboard/model-serving/extension-points';
import { isNIMDeployment, isNIMOwned } from './utils';

const mockModel = {
  apiVersion: 'apps.nvidia.com/v1alpha1',
  kind: 'NIMService',
  metadata: { name: 'test', namespace: 'ns' },
};

describe('isNIMDeployment', () => {
  it('should return true for a NIM deployment', () => {
    const deployment: Deployment = {
      modelServingPlatformId: 'nvidia-nim',
      model: mockModel,
    };
    expect(isNIMDeployment(deployment)).toBe(true);
  });

  it('should return false for a KServe deployment', () => {
    const deployment: Deployment = {
      modelServingPlatformId: 'kserve',
      model: mockModel,
    };
    expect(isNIMDeployment(deployment)).toBe(false);
  });

  it('should return false for an LLMd deployment', () => {
    const deployment: Deployment = {
      modelServingPlatformId: 'llmd-serving',
      model: mockModel,
    };
    expect(isNIMDeployment(deployment)).toBe(false);
  });
});

describe('isNIMOwned', () => {
  it('should return true when InferenceService has a NIMService ownerReference', () => {
    const is = mockInferenceServiceK8sResource({ name: 'test-is' });
    is.metadata.ownerReferences = [
      { apiVersion: 'apps.nvidia.com/v1alpha1', kind: 'NIMService', name: 'my-nim', uid: 'abc' },
    ];
    expect(isNIMOwned(is)).toBe(true);
  });

  it('should return false when InferenceService has no ownerReferences', () => {
    const is = mockInferenceServiceK8sResource({ name: 'test-is' });
    expect(isNIMOwned(is)).toBe(false);
  });

  it('should return false when ownerReferences exist but none are NIMService', () => {
    const is = mockInferenceServiceK8sResource({ name: 'test-is' });
    is.metadata.ownerReferences = [
      { apiVersion: 'serving.kserve.io/v1beta1', kind: 'ServingRuntime', name: 'rt', uid: 'xyz' },
    ];
    expect(isNIMOwned(is)).toBe(false);
  });

  it('should return false when kind is NIMService but apiVersion is wrong', () => {
    const is = mockInferenceServiceK8sResource({ name: 'test-is' });
    is.metadata.ownerReferences = [
      { apiVersion: 'other.group/v1', kind: 'NIMService', name: 'my-nim', uid: 'abc' },
    ];
    expect(isNIMOwned(is)).toBe(false);
  });

  it('should handle multiple ownerReferences and find the NIMService one', () => {
    const is = mockInferenceServiceK8sResource({ name: 'test-is' });
    is.metadata.ownerReferences = [
      { apiVersion: 'serving.kserve.io/v1beta1', kind: 'ServingRuntime', name: 'rt', uid: 'xyz' },
      { apiVersion: 'apps.nvidia.com/v1alpha1', kind: 'NIMService', name: 'my-nim', uid: 'abc' },
    ];
    expect(isNIMOwned(is)).toBe(true);
  });
});
