import { renderHook, waitFor } from '@testing-library/react';
import * as api from '#~/api';
import { mockServingRuntimeK8sResource } from '#~/__mocks__/mockServingRuntimeK8sResource';
import { mockNimService } from '#~/__mocks__/mockNimService';
import { useNIMCompatiblePVCs } from '#~/pages/modelServing/screens/projects/nim/NIMServiceModal/useNIMCompatiblePVCs';

// Mock the API functions
jest.mock('#~/api', () => ({
  listServingRuntimes: jest.fn(),
  listNIMServices: jest.fn(),
}));

const mockListServingRuntimes = api.listServingRuntimes as jest.MockedFunction<
  typeof api.listServingRuntimes
>;
const mockListNIMServices = api.listNIMServices as jest.MockedFunction<typeof api.listNIMServices>;

describe('useNIMCompatiblePVCs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Legacy Mode (nimServicesEnabled: false)', () => {
    it('should return empty array when namespace or model is undefined', async () => {
      const { result } = renderHook(() => useNIMCompatiblePVCs(undefined, 'test-model', false));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.compatiblePVCs).toEqual([]);
      expect(mockListServingRuntimes).not.toHaveBeenCalled();
    });

    it('should fetch PVCs from ServingRuntimes in legacy mode', async () => {
      const mockServingRuntime = mockServingRuntimeK8sResource({
        name: 'test-runtime',
        namespace: 'test-project',
      });

      // Add NIM-specific annotations and PVC volume
      mockServingRuntime.metadata.annotations = {
        'opendatahub.io/template-name': 'nvidia-nim-runtime',
      };
      mockServingRuntime.spec.volumes = [
        {
          name: 'model-storage',
          persistentVolumeClaim: {
            claimName: 'nim-pvc-llama-3.2-1b-instruct',
          },
        },
      ];
      mockServingRuntime.spec.supportedModelFormats = [
        {
          name: 'llama-3.2-1b-instruct',
          version: '1',
        },
      ];

      mockListServingRuntimes.mockResolvedValue([mockServingRuntime]);

      const { result } = renderHook(() =>
        useNIMCompatiblePVCs('test-project', 'llama-3.2-1b-instruct', false),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockListServingRuntimes).toHaveBeenCalledWith('test-project');
      expect(mockListNIMServices).not.toHaveBeenCalled();
      expect(result.current.compatiblePVCs).toHaveLength(1);
      expect(result.current.compatiblePVCs[0]).toMatchObject({
        pvcName: 'nim-pvc-llama-3.2-1b-instruct',
        modelName: 'llama-3.2-1b-instruct',
        servingRuntimeName: 'test-runtime',
        deploymentType: 'legacy',
      });
    });

    it('should filter by selected model in legacy mode', async () => {
      const mockServingRuntime1 = mockServingRuntimeK8sResource({
        name: 'runtime-llama',
        namespace: 'test-project',
      });
      mockServingRuntime1.metadata.annotations = {
        'opendatahub.io/template-name': 'nvidia-nim-runtime',
      };
      mockServingRuntime1.spec.volumes = [
        {
          name: 'model-storage',
          persistentVolumeClaim: {
            claimName: 'nim-pvc-llama',
          },
        },
      ];
      mockServingRuntime1.spec.supportedModelFormats = [
        {
          name: 'llama-3.2-1b-instruct',
          version: '1',
        },
      ];

      const mockServingRuntime2 = mockServingRuntimeK8sResource({
        name: 'runtime-mistral',
        namespace: 'test-project',
      });
      mockServingRuntime2.metadata.annotations = {
        'opendatahub.io/template-name': 'nvidia-nim-runtime',
      };
      mockServingRuntime2.spec.volumes = [
        {
          name: 'model-storage',
          persistentVolumeClaim: {
            claimName: 'nim-pvc-mistral',
          },
        },
      ];
      mockServingRuntime2.spec.supportedModelFormats = [
        {
          name: 'mistral-7b-instruct',
          version: '1',
        },
      ];

      mockListServingRuntimes.mockResolvedValue([mockServingRuntime1, mockServingRuntime2]);

      const { result } = renderHook(() =>
        useNIMCompatiblePVCs('test-project', 'llama-3.2-1b-instruct', false),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.compatiblePVCs).toHaveLength(1);
      expect(result.current.compatiblePVCs[0].modelName).toBe('llama-3.2-1b-instruct');
    });

    it('should ignore non-NIM ServingRuntimes', async () => {
      const mockNonNIMRuntime = mockServingRuntimeK8sResource({
        name: 'regular-runtime',
        namespace: 'test-project',
      });
      // No NIM annotations or image

      mockListServingRuntimes.mockResolvedValue([mockNonNIMRuntime]);

      const { result } = renderHook(() =>
        useNIMCompatiblePVCs('test-project', 'llama-3.2-1b-instruct', false),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.compatiblePVCs).toHaveLength(0);
    });
  });

  describe('NIM Operator Mode (nimServicesEnabled: true)', () => {
    it('should fetch PVCs from NIMServices in operator mode', async () => {
      const mockNIMService = mockNimService({
        name: 'test-nim-service',
        namespace: 'test-project',
        imageRepository: 'nvcr.io/nim/meta/llama-3.2-1b-instruct',
        imageTag: '1.12.0',
        pvcName: 'nim-pvc-llama-3.2-1b-instruct',
        creationTimestamp: '2024-01-01T00:00:00Z',
      });

      mockListNIMServices.mockResolvedValue([mockNIMService]);

      // Model name matches ConfigMap format (without namespace prefix)
      const { result } = renderHook(() =>
        useNIMCompatiblePVCs('test-project', 'llama-3.2-1b-instruct', true),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockListNIMServices).toHaveBeenCalledWith('test-project');
      expect(mockListServingRuntimes).not.toHaveBeenCalled();
      expect(result.current.compatiblePVCs).toHaveLength(1);
      expect(result.current.compatiblePVCs[0]).toMatchObject({
        pvcName: 'nim-pvc-llama-3.2-1b-instruct',
        modelName: 'llama-3.2-1b-instruct', // Without namespace prefix
        servingRuntimeName: 'test-nim-service',
        deploymentType: 'operator',
      });
    });

    it('should filter by selected model in operator mode', async () => {
      const mockNIMService1 = mockNimService({
        name: 'nim-llama',
        namespace: 'test-project',
        imageRepository: 'nvcr.io/nim/meta/llama-3.2-1b-instruct',
        pvcName: 'nim-pvc-llama',
      });

      const mockNIMService2 = mockNimService({
        name: 'nim-mistral',
        namespace: 'test-project',
        imageRepository: 'nvcr.io/nim/mistralai/mistral-7b-instruct',
        pvcName: 'nim-pvc-mistral',
      });

      mockListNIMServices.mockResolvedValue([mockNIMService1, mockNIMService2]);

      const { result } = renderHook(() =>
        useNIMCompatiblePVCs('test-project', 'llama-3.2-1b-instruct', true),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.compatiblePVCs).toHaveLength(1);
      expect(result.current.compatiblePVCs[0].modelName).toBe('llama-3.2-1b-instruct');
    });

    it('should handle NIMServices without PVC storage', async () => {
      const mockNIMServiceNoPVC = mockNimService({
        name: 'nim-no-pvc',
        namespace: 'test-project',
        imageRepository: 'nvcr.io/nim/meta/llama-3.2-1b-instruct',
        pvcName: undefined,
      });

      // Remove PVC from storage
      mockNIMServiceNoPVC.spec.storage = {};

      mockListNIMServices.mockResolvedValue([mockNIMServiceNoPVC]);

      const { result } = renderHook(() =>
        useNIMCompatiblePVCs('test-project', 'llama-3.2-1b-instruct', true),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.compatiblePVCs).toHaveLength(0);
    });

    it('should extract model name correctly with namespace prefix', async () => {
      const mockNIMService = mockNimService({
        name: 'test-nim',
        namespace: 'test-project',
        imageRepository: 'nvcr.io/nim/meta/llama-3.1-8b-instruct',
        pvcName: 'nim-pvc-test',
      });

      mockListNIMServices.mockResolvedValue([mockNIMService]);

      const { result } = renderHook(() =>
        useNIMCompatiblePVCs('test-project', 'llama-3.1-8b-instruct', true),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.compatiblePVCs).toHaveLength(1);
      expect(result.current.compatiblePVCs[0].modelName).toBe('llama-3.1-8b-instruct');
    });

    it('should handle models without namespace prefix', async () => {
      const mockNIMService = mockNimService({
        name: 'test-nim',
        namespace: 'test-project',
        imageRepository: 'nvcr.io/nim/simple-model', // No namespace prefix
        pvcName: 'nim-pvc-test',
      });

      mockListNIMServices.mockResolvedValue([mockNIMService]);

      const { result } = renderHook(() =>
        useNIMCompatiblePVCs('test-project', 'simple-model', true),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.compatiblePVCs).toHaveLength(1);
      expect(result.current.compatiblePVCs[0].modelName).toBe('simple-model');
    });
  });

  describe('Mode Separation', () => {
    it('should only return legacy PVCs in legacy mode even if operator deployments exist', async () => {
      // In a real scenario, these would be in different API calls
      const mockServingRuntime = mockServingRuntimeK8sResource({
        name: 'legacy-runtime',
        namespace: 'test-project',
      });
      mockServingRuntime.metadata.annotations = {
        'opendatahub.io/template-name': 'nvidia-nim-runtime',
      };
      mockServingRuntime.spec.volumes = [
        {
          name: 'model-storage',
          persistentVolumeClaim: {
            claimName: 'nim-pvc-legacy',
          },
        },
      ];
      mockServingRuntime.spec.supportedModelFormats = [
        {
          name: 'llama-3.2-1b-instruct',
          version: '1',
        },
      ];

      mockListServingRuntimes.mockResolvedValue([mockServingRuntime]);

      const { result } = renderHook(() =>
        useNIMCompatiblePVCs('test-project', 'llama-3.2-1b-instruct', false),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockListServingRuntimes).toHaveBeenCalled();
      expect(mockListNIMServices).not.toHaveBeenCalled();
      expect(result.current.compatiblePVCs).toHaveLength(1);
      expect(result.current.compatiblePVCs[0].deploymentType).toBe('legacy');
    });

    it('should only return operator PVCs in operator mode even if legacy deployments exist', async () => {
      const mockNIMService = mockNimService({
        name: 'operator-nim',
        namespace: 'test-project',
        imageRepository: 'nvcr.io/nim/meta/llama-3.2-1b-instruct',
        pvcName: 'nim-pvc-operator',
      });

      mockListNIMServices.mockResolvedValue([mockNIMService]);

      const { result } = renderHook(() =>
        useNIMCompatiblePVCs('test-project', 'llama-3.2-1b-instruct', true),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockListNIMServices).toHaveBeenCalled();
      expect(mockListServingRuntimes).not.toHaveBeenCalled();
      expect(result.current.compatiblePVCs).toHaveLength(1);
      expect(result.current.compatiblePVCs[0].deploymentType).toBe('operator');
    });
  });

  describe('Sorting and Deduplication', () => {
    it('should sort PVCs by creation date (newest first)', async () => {
      const oldRuntime = mockServingRuntimeK8sResource({
        name: 'old-runtime',
        namespace: 'test-project',
      });
      oldRuntime.metadata.creationTimestamp = '2024-01-01T00:00:00Z';
      oldRuntime.metadata.annotations = {
        'opendatahub.io/template-name': 'nvidia-nim-runtime',
      };
      oldRuntime.spec.volumes = [
        {
          name: 'model-storage',
          persistentVolumeClaim: {
            claimName: 'nim-pvc-old',
          },
        },
      ];
      oldRuntime.spec.supportedModelFormats = [
        {
          name: 'llama-3.2-1b-instruct',
          version: '1',
        },
      ];

      const newRuntime = mockServingRuntimeK8sResource({
        name: 'new-runtime',
        namespace: 'test-project',
      });
      newRuntime.metadata.creationTimestamp = '2024-12-01T00:00:00Z';
      newRuntime.metadata.annotations = {
        'opendatahub.io/template-name': 'nvidia-nim-runtime',
      };
      newRuntime.spec.volumes = [
        {
          name: 'model-storage',
          persistentVolumeClaim: {
            claimName: 'nim-pvc-new',
          },
        },
      ];
      newRuntime.spec.supportedModelFormats = [
        {
          name: 'llama-3.2-1b-instruct',
          version: '1',
        },
      ];

      mockListServingRuntimes.mockResolvedValue([oldRuntime, newRuntime]);

      const { result } = renderHook(() =>
        useNIMCompatiblePVCs('test-project', 'llama-3.2-1b-instruct', false),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.compatiblePVCs).toHaveLength(2);
      expect(result.current.compatiblePVCs[0].pvcName).toBe('nim-pvc-new');
      expect(result.current.compatiblePVCs[1].pvcName).toBe('nim-pvc-old');
    });

    it('should deduplicate PVCs by name, keeping the newest', async () => {
      const oldRuntime = mockServingRuntimeK8sResource({
        name: 'old-runtime',
        namespace: 'test-project',
      });
      oldRuntime.metadata.creationTimestamp = '2024-01-01T00:00:00Z';
      oldRuntime.metadata.annotations = {
        'opendatahub.io/template-name': 'nvidia-nim-runtime',
      };
      oldRuntime.spec.volumes = [
        {
          name: 'model-storage',
          persistentVolumeClaim: {
            claimName: 'nim-pvc-shared',
          },
        },
      ];
      oldRuntime.spec.supportedModelFormats = [
        {
          name: 'llama-3.2-1b-instruct',
          version: '1',
        },
      ];

      const newRuntime = mockServingRuntimeK8sResource({
        name: 'new-runtime',
        namespace: 'test-project',
      });
      newRuntime.metadata.creationTimestamp = '2024-12-01T00:00:00Z';
      newRuntime.metadata.annotations = {
        'opendatahub.io/template-name': 'nvidia-nim-runtime',
      };
      newRuntime.spec.volumes = [
        {
          name: 'model-storage',
          persistentVolumeClaim: {
            claimName: 'nim-pvc-shared', // Same PVC name
          },
        },
      ];
      newRuntime.spec.supportedModelFormats = [
        {
          name: 'llama-3.2-1b-instruct',
          version: '1',
        },
      ];

      mockListServingRuntimes.mockResolvedValue([oldRuntime, newRuntime]);

      const { result } = renderHook(() =>
        useNIMCompatiblePVCs('test-project', 'llama-3.2-1b-instruct', false),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should only have one entry (deduplicated)
      expect(result.current.compatiblePVCs).toHaveLength(1);
      expect(result.current.compatiblePVCs[0].pvcName).toBe('nim-pvc-shared');
      expect(result.current.compatiblePVCs[0].servingRuntimeName).toBe('new-runtime');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockListServingRuntimes.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() =>
        useNIMCompatiblePVCs('test-project', 'llama-3.2-1b-instruct', false),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('API Error');
      expect(result.current.compatiblePVCs).toEqual([]);
    });

    it('should handle API errors in operator mode', async () => {
      mockListNIMServices.mockRejectedValue(new Error('Operator API Error'));

      const { result } = renderHook(() =>
        useNIMCompatiblePVCs('test-project', 'llama-3.2-1b-instruct', true),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Operator API Error');
      expect(result.current.compatiblePVCs).toEqual([]);
    });
  });
});
