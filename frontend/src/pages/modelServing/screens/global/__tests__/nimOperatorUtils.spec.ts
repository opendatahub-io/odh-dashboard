import { InferenceServiceKind } from '#~/k8sTypes';
import { mockInferenceServiceK8sResource } from '#~/__mocks__/mockInferenceServiceK8sResource';
import {
  getNIMServiceOwner,
  isNIMOperatorManaged,
} from '#~/pages/modelServing/screens/global/nimOperatorUtils';

describe('nimOperatorUtils', () => {
  describe('getNIMServiceOwner', () => {
    it('should return undefined when no ownerReferences exist', () => {
      const inferenceService = mockInferenceServiceK8sResource({
        name: 'test-isvc',
      });
      delete inferenceService.metadata.ownerReferences;

      expect(getNIMServiceOwner(inferenceService)).toBeUndefined();
    });

    it('should return undefined when ownerReferences is empty', () => {
      const inferenceService = mockInferenceServiceK8sResource({
        name: 'test-isvc',
      });
      inferenceService.metadata.ownerReferences = [];

      expect(getNIMServiceOwner(inferenceService)).toBeUndefined();
    });

    it('should return undefined when no NIMService owner exists', () => {
      const inferenceService = mockInferenceServiceK8sResource({
        name: 'test-isvc',
      });
      inferenceService.metadata.ownerReferences = [
        {
          apiVersion: 'serving.kserve.io/v1beta1',
          kind: 'ServingRuntime',
          name: 'test-runtime',
          uid: 'runtime-uid-123',
          controller: true,
          blockOwnerDeletion: true,
        },
      ];

      expect(getNIMServiceOwner(inferenceService)).toBeUndefined();
    });

    it('should detect NIMService owner with v1alpha1 apiVersion', () => {
      const inferenceService = mockInferenceServiceK8sResource({
        name: 'test-isvc',
      });
      inferenceService.metadata.ownerReferences = [
        {
          apiVersion: 'apps.nvidia.com/v1alpha1',
          kind: 'NIMService',
          name: 'my-nim-service',
          uid: 'nim-service-uid-456',
          controller: true,
          blockOwnerDeletion: true,
        },
      ];

      const owner = getNIMServiceOwner(inferenceService);
      expect(owner).toBeDefined();
      expect(owner?.name).toBe('my-nim-service');
      expect(owner?.uid).toBe('nim-service-uid-456');
    });

    it('should detect NIMService owner with any apps.nvidia.com apiVersion', () => {
      const inferenceService = mockInferenceServiceK8sResource({
        name: 'test-isvc',
      });
      inferenceService.metadata.ownerReferences = [
        {
          apiVersion: 'apps.nvidia.com/v1beta1',
          kind: 'NIMService',
          name: 'my-nim-service-v2',
          uid: 'nim-service-uid-789',
          controller: true,
          blockOwnerDeletion: true,
        },
      ];

      const owner = getNIMServiceOwner(inferenceService);
      expect(owner).toBeDefined();
      expect(owner?.name).toBe('my-nim-service-v2');
      expect(owner?.uid).toBe('nim-service-uid-789');
    });

    it('should find NIMService owner among multiple owners', () => {
      const inferenceService = mockInferenceServiceK8sResource({
        name: 'test-isvc',
      });
      inferenceService.metadata.ownerReferences = [
        {
          apiVersion: 'v1',
          kind: 'ConfigMap',
          name: 'some-config',
          uid: 'config-uid-000',
        },
        {
          apiVersion: 'apps.nvidia.com/v1alpha1',
          kind: 'NIMService',
          name: 'correct-nim-service',
          uid: 'nim-service-uid-999',
          controller: true,
          blockOwnerDeletion: true,
        },
        {
          apiVersion: 'serving.kserve.io/v1beta1',
          kind: 'ServingRuntime',
          name: 'test-runtime',
          uid: 'runtime-uid-888',
        },
      ];

      const owner = getNIMServiceOwner(inferenceService);
      expect(owner).toBeDefined();
      expect(owner?.name).toBe('correct-nim-service');
      expect(owner?.uid).toBe('nim-service-uid-999');
    });

    it('should handle missing uid in ownerReference', () => {
      const inferenceService = mockInferenceServiceK8sResource({
        name: 'test-isvc',
      });
      inferenceService.metadata.ownerReferences = [
        {
          apiVersion: 'apps.nvidia.com/v1alpha1',
          kind: 'NIMService',
          name: 'my-nim-service',
          // uid is missing
        } as InferenceServiceKind['metadata']['ownerReferences'][0],
      ];

      const owner = getNIMServiceOwner(inferenceService);
      expect(owner).toBeDefined();
      expect(owner?.name).toBe('my-nim-service');
      expect(owner?.uid).toBe('');
    });
  });

  describe('isNIMOperatorManaged', () => {
    it('should return false when no NIMService owner exists', () => {
      const inferenceService = mockInferenceServiceK8sResource({
        name: 'test-isvc',
      });
      delete inferenceService.metadata.ownerReferences;

      expect(isNIMOperatorManaged(inferenceService)).toBe(false);
    });

    it('should return true when NIMService owner exists', () => {
      const inferenceService = mockInferenceServiceK8sResource({
        name: 'test-isvc',
      });
      inferenceService.metadata.ownerReferences = [
        {
          apiVersion: 'apps.nvidia.com/v1alpha1',
          kind: 'NIMService',
          name: 'my-nim-service',
          uid: 'nim-service-uid-123',
          controller: true,
          blockOwnerDeletion: true,
        },
      ];

      expect(isNIMOperatorManaged(inferenceService)).toBe(true);
    });
  });
});
