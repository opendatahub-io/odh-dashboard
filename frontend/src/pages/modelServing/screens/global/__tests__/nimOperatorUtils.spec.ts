import { mockInferenceServiceK8sResource } from '#~/__mocks__/mockInferenceServiceK8sResource';
import {
  getNIMServiceOwner,
  isNIMOperatorManaged,
  extractModelNameFromNIMImage,
  getModelNameFromNIMInferenceService,
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
          controller: true,
          blockOwnerDeletion: true,
        } as {
          apiVersion: string;
          kind: string;
          name: string;
          controller: boolean;
          blockOwnerDeletion: boolean;
        },
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

  describe('extractModelNameFromNIMImage', () => {
    it('should extract model name from standard NIM image path', () => {
      expect(extractModelNameFromNIMImage('nvcr.io/nim/meta/llama-3.1-8b-instruct:1.8.5')).toBe(
        'llama-3.1-8b-instruct',
      );
    });

    it('should extract model name from nvidia vendor', () => {
      expect(
        extractModelNameFromNIMImage('nvcr.io/nim/nvidia/mistral-7b-instruct-v0.3:24.08'),
      ).toBe('mistral-7b-instruct-v0.3');
    });

    it('should extract model name from deepseek-ai vendor', () => {
      expect(extractModelNameFromNIMImage('nvcr.io/nim/deepseek-ai/deepseek-r1:1.0.0')).toBe(
        'deepseek-r1',
      );
    });

    it('should extract model name without version tag', () => {
      expect(extractModelNameFromNIMImage('nvcr.io/nim/meta/llama-3.1-8b-instruct')).toBe(
        'llama-3.1-8b-instruct',
      );
    });

    it('should return undefined for non-NIM image', () => {
      expect(extractModelNameFromNIMImage('docker.io/library/nginx:latest')).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(extractModelNameFromNIMImage('')).toBeUndefined();
    });

    it('should return undefined for malformed NIM path (missing model)', () => {
      expect(extractModelNameFromNIMImage('nvcr.io/nim/')).toBeUndefined();
    });

    it('should return undefined for malformed NIM path (only vendor)', () => {
      expect(extractModelNameFromNIMImage('nvcr.io/nim/meta')).toBeUndefined();
    });

    it('should handle complex model names with multiple hyphens', () => {
      expect(
        extractModelNameFromNIMImage('nvcr.io/nim/meta/llama-3-1-405b-instruct-fp8:1.0.0'),
      ).toBe('llama-3-1-405b-instruct-fp8');
    });
  });

  describe('getModelNameFromNIMInferenceService', () => {
    it('should extract model name from InferenceService with containers', () => {
      const inferenceService = mockInferenceServiceK8sResource({
        name: 'test-nim',
      });
      // NIM Operator uses containers instead of model spec
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (inferenceService.spec.predictor as any).containers = [
        {
          name: 'kserve-container',
          image: 'nvcr.io/nim/meta/llama-3.1-8b-instruct:1.8.5',
        },
      ];

      expect(getModelNameFromNIMInferenceService(inferenceService)).toBe('llama-3.1-8b-instruct');
    });

    it('should return undefined when no containers exist', () => {
      const inferenceService = mockInferenceServiceK8sResource({
        name: 'test-nim',
      });

      expect(getModelNameFromNIMInferenceService(inferenceService)).toBeUndefined();
    });

    it('should return undefined when containers array is empty', () => {
      const inferenceService = mockInferenceServiceK8sResource({
        name: 'test-nim',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (inferenceService.spec.predictor as any).containers = [];

      expect(getModelNameFromNIMInferenceService(inferenceService)).toBeUndefined();
    });

    it('should return undefined when first container has no image', () => {
      const inferenceService = mockInferenceServiceK8sResource({
        name: 'test-nim',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (inferenceService.spec.predictor as any).containers = [
        {
          name: 'kserve-container',
        },
      ];

      expect(getModelNameFromNIMInferenceService(inferenceService)).toBeUndefined();
    });

    it('should use first container even if multiple exist', () => {
      const inferenceService = mockInferenceServiceK8sResource({
        name: 'test-nim',
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (inferenceService.spec.predictor as any).containers = [
        {
          name: 'kserve-container',
          image: 'nvcr.io/nim/meta/llama-3.1-8b-instruct:1.8.5',
        },
        {
          name: 'sidecar',
          image: 'nvcr.io/nim/nvidia/another-model:2.0.0',
        },
      ];

      expect(getModelNameFromNIMInferenceService(inferenceService)).toBe('llama-3.1-8b-instruct');
    });
  });
});
