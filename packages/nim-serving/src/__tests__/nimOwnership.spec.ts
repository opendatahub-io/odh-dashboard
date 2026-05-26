import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { isNIMOwned } from '../nimOwnership';

describe('isNIMOwned', () => {
  it('should return true when resource has NIMService ownerReference', () => {
    const resource: K8sResourceCommon = {
      apiVersion: 'serving.kserve.io/v1beta1',
      kind: 'InferenceService',
      metadata: {
        name: 'test-is',
        ownerReferences: [
          {
            apiVersion: 'apps.nvidia.com/v1alpha1',
            kind: 'NIMService',
            name: 'my-nim',
            uid: 'abc-123',
          },
        ],
      },
    };
    expect(isNIMOwned(resource)).toBe(true);
  });

  it('should return false when resource has no ownerReferences', () => {
    const resource: K8sResourceCommon = {
      apiVersion: 'serving.kserve.io/v1beta1',
      kind: 'InferenceService',
      metadata: {
        name: 'test-is',
      },
    };
    expect(isNIMOwned(resource)).toBe(false);
  });

  it('should return false when ownerReferences exist but none are NIMService', () => {
    const resource: K8sResourceCommon = {
      apiVersion: 'serving.kserve.io/v1beta1',
      kind: 'InferenceService',
      metadata: {
        name: 'test-is',
        ownerReferences: [
          {
            apiVersion: 'serving.kserve.io/v1alpha1',
            kind: 'ServingRuntime',
            name: 'some-runtime',
            uid: 'xyz-789',
          },
        ],
      },
    };
    expect(isNIMOwned(resource)).toBe(false);
  });

  it('should return false when kind is NIMService but apiVersion is wrong', () => {
    const resource: K8sResourceCommon = {
      apiVersion: 'serving.kserve.io/v1beta1',
      kind: 'InferenceService',
      metadata: {
        name: 'test-is',
        ownerReferences: [
          {
            apiVersion: 'other.group/v1',
            kind: 'NIMService',
            name: 'my-nim',
            uid: 'abc-123',
          },
        ],
      },
    };
    expect(isNIMOwned(resource)).toBe(false);
  });

  it('should handle multiple ownerReferences and find the NIMService one', () => {
    const resource: K8sResourceCommon = {
      apiVersion: 'serving.kserve.io/v1beta1',
      kind: 'InferenceService',
      metadata: {
        name: 'test-is',
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
    };
    expect(isNIMOwned(resource)).toBe(true);
  });

  it('should return false when metadata is undefined', () => {
    const resource = {
      apiVersion: 'v1',
      kind: 'InferenceService',
    } as K8sResourceCommon;
    expect(isNIMOwned(resource)).toBe(false);
  });
});
