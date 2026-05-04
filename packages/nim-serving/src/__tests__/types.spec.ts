import type { InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';
import { mockInferenceServiceK8sResource } from '@odh-dashboard/internal/__mocks__/mockInferenceServiceK8sResource';
import type { Deployment } from '@odh-dashboard/model-serving/extension-points';
import { isNIMDeployment, isNIMOwned } from '../types';

describe('isNIMDeployment', () => {
  it('should return true for a NIM deployment', () => {
    const deployment: Deployment = {
      modelServingPlatformId: 'nvidia-nim',
      model: { metadata: { name: 'test', namespace: 'ns' } },
    };
    expect(isNIMDeployment(deployment)).toBe(true);
  });

  it('should return false for a KServe deployment', () => {
    const deployment: Deployment = {
      modelServingPlatformId: 'kserve',
      model: { metadata: { name: 'test', namespace: 'ns' } },
    };
    expect(isNIMDeployment(deployment)).toBe(false);
  });

  it('should return false for an LLMd deployment', () => {
    const deployment: Deployment = {
      modelServingPlatformId: 'llmd-serving',
      model: { metadata: { name: 'test', namespace: 'ns' } },
    };
    expect(isNIMDeployment(deployment)).toBe(false);
  });
});

describe('isNIMOwned', () => {
  it('should return true when InferenceService has a NIMService ownerReference', () => {
    const is = {
      ...mockInferenceServiceK8sResource({ name: 'test-is' }),
      metadata: {
        name: 'test-is',
        namespace: 'test-project',
        ownerReferences: [
          {
            apiVersion: 'apps.nvidia.com/v1alpha1',
            kind: 'NIMService',
            name: 'my-nim',
            uid: 'abc-123',
          },
        ],
      },
    } as InferenceServiceKind;

    expect(isNIMOwned(is)).toBe(true);
  });

  it('should return false when InferenceService has no ownerReferences', () => {
    const is = mockInferenceServiceK8sResource({ name: 'test-is' });
    expect(isNIMOwned(is)).toBe(false);
  });

  it('should return false when ownerReferences exist but none are NIMService', () => {
    const is = {
      ...mockInferenceServiceK8sResource({ name: 'test-is' }),
      metadata: {
        name: 'test-is',
        namespace: 'test-project',
        ownerReferences: [
          {
            apiVersion: 'serving.kserve.io/v1beta1',
            kind: 'ServingRuntime',
            name: 'some-runtime',
            uid: 'xyz-789',
          },
        ],
      },
    } as InferenceServiceKind;

    expect(isNIMOwned(is)).toBe(false);
  });

  it('should return false when kind is NIMService but apiVersion is wrong', () => {
    const is = {
      ...mockInferenceServiceK8sResource({ name: 'test-is' }),
      metadata: {
        name: 'test-is',
        namespace: 'test-project',
        ownerReferences: [
          {
            apiVersion: 'other.group/v1',
            kind: 'NIMService',
            name: 'my-nim',
            uid: 'abc-123',
          },
        ],
      },
    } as InferenceServiceKind;

    expect(isNIMOwned(is)).toBe(false);
  });

  it('should handle multiple ownerReferences and find the NIMService one', () => {
    const is = {
      ...mockInferenceServiceK8sResource({ name: 'test-is' }),
      metadata: {
        name: 'test-is',
        namespace: 'test-project',
        ownerReferences: [
          {
            apiVersion: 'serving.kserve.io/v1beta1',
            kind: 'ServingRuntime',
            name: 'some-runtime',
            uid: 'xyz-789',
          },
          {
            apiVersion: 'apps.nvidia.com/v1alpha1',
            kind: 'NIMService',
            name: 'my-nim',
            uid: 'abc-123',
          },
        ],
      },
    } as InferenceServiceKind;

    expect(isNIMOwned(is)).toBe(true);
  });
});
