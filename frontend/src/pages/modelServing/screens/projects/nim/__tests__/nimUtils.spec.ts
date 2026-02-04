import { NIMServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import { fetchInferenceServiceCount } from '#~/pages/modelServing/screens/projects/utils';
import {
  deletePvc,
  deleteSecret,
  getPvc,
  listNIMAccounts,
  listNIMServices,
  listServingRuntimes,
} from '#~/api';
import {
  fetchNIMAccountTemplateName,
  getNIMOperatorResourcesToDelete,
  getNIMResourcesToDelete,
} from '#~/pages/modelServing/screens/projects/nimUtils';
import { mockNimAccount } from '#~/__mocks__/mockNimAccount';
import { mockServingRuntimeK8sResource } from '#~/__mocks__';

jest.mock('#~/pages/modelServing/screens/projects/utils', () => ({
  fetchInferenceServiceCount: jest.fn(),
}));
jest.mock('#~/api', () => ({
  deletePvc: jest.fn(),
  deleteSecret: jest.fn(),
  getPvc: jest.fn(),
  listNIMAccounts: jest.fn(),
  listNIMServices: jest.fn(),
  listServingRuntimes: jest.fn(),
}));
describe('getNIMResourcesToDelete', () => {
  const projectName = 'test-project';
  const mockServingRuntime = mockServingRuntimeK8sResource({});

  mockServingRuntime.spec.volumes = [
    {
      name: 'nim-pvc-volume',
      persistentVolumeClaim: { claimName: 'nim-pvc-abc12' },
    },
  ];
  mockServingRuntime.spec.imagePullSecrets = [{ name: 'ngc-secret' }];
  mockServingRuntime.spec.containers = [
    {
      name: 'test-container',
      env: [
        {
          name: 'some-key',
          valueFrom: {
            secretKeyRef: {
              name: 'nvidia-nim-secrets',
              key: 'some-key',
            },
          },
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add deletePvc to resources if pvcName exists', async () => {
    const resultMock = jest.mocked(fetchInferenceServiceCount);
    resultMock.mockResolvedValue(0);
    (deletePvc as jest.Mock).mockResolvedValue(undefined);
    // Mock listServingRuntimes to return only the current serving runtime (count = 1)
    (listServingRuntimes as jest.Mock).mockResolvedValue([mockServingRuntime]);
    (listNIMServices as jest.Mock).mockResolvedValue([]);
    // Mock getPvc to return a Dashboard-managed PVC (matches naming pattern)
    (getPvc as jest.Mock).mockResolvedValue({
      metadata: { name: 'nim-pvc-abc12', labels: {} },
    });

    const result = await getNIMResourcesToDelete(projectName, mockServingRuntime);

    expect(fetchInferenceServiceCount).toHaveBeenCalledWith(projectName);
    expect(listServingRuntimes).toHaveBeenCalledWith(projectName);
    expect(getPvc).toHaveBeenCalledWith(projectName, 'nim-pvc-abc12');
    expect(deletePvc).toHaveBeenCalledWith('nim-pvc-abc12', projectName);
    expect(result.length).toBe(1); // Only deletePvc in resources
  });

  it('should add deleteSecret for both secrets if count is 1', async () => {
    const resultMock = jest.mocked(fetchInferenceServiceCount);
    resultMock.mockResolvedValue(1);
    (deletePvc as jest.Mock).mockResolvedValue(undefined);
    (deleteSecret as jest.Mock).mockResolvedValue(undefined);
    // Mock listServingRuntimes to return only the current serving runtime (count = 1)
    (listServingRuntimes as jest.Mock).mockResolvedValue([mockServingRuntime]);
    (listNIMServices as jest.Mock).mockResolvedValue([]);
    // Mock getPvc to return a Dashboard-managed PVC (matches naming pattern)
    (getPvc as jest.Mock).mockResolvedValue({
      metadata: { name: 'nim-pvc-abc12', labels: {} },
    });

    const result = await getNIMResourcesToDelete(projectName, mockServingRuntime);

    expect(fetchInferenceServiceCount).toHaveBeenCalledWith(projectName);
    expect(listServingRuntimes).toHaveBeenCalledWith(projectName);
    expect(getPvc).toHaveBeenCalledWith(projectName, 'nim-pvc-abc12');
    expect(deletePvc).toHaveBeenCalledWith('nim-pvc-abc12', projectName);
    expect(deleteSecret).toHaveBeenCalledWith(projectName, 'nvidia-nim-secrets');
    expect(deleteSecret).toHaveBeenCalledWith(projectName, 'ngc-secret');
    expect(result.length).toBe(3); // deletePvc + 2 deleteSecret
  });

  it('should not add deleteSecret if count is not 1', async () => {
    const resultMock = jest.mocked(fetchInferenceServiceCount);
    resultMock.mockResolvedValue(2);
    (deletePvc as jest.Mock).mockResolvedValue(undefined);
    // Mock listServingRuntimes to return only the current serving runtime (count = 1)
    (listServingRuntimes as jest.Mock).mockResolvedValue([mockServingRuntime]);
    (listNIMServices as jest.Mock).mockResolvedValue([]);
    // Mock getPvc to return a Dashboard-managed PVC (matches naming pattern)
    (getPvc as jest.Mock).mockResolvedValue({
      metadata: { name: 'nim-pvc-abc12', labels: {} },
    });

    const result = await getNIMResourcesToDelete(projectName, mockServingRuntime);

    expect(fetchInferenceServiceCount).toHaveBeenCalledWith(projectName);
    expect(listServingRuntimes).toHaveBeenCalledWith(projectName);
    expect(getPvc).toHaveBeenCalledWith(projectName, 'nim-pvc-abc12');
    expect(deletePvc).toHaveBeenCalledWith('nim-pvc-abc12', projectName);
    expect(deleteSecret).not.toHaveBeenCalled();
    expect(result.length).toBe(1); // Only deletePvc
  });

  it('should handle errors from fetchInferenceServiceCount and still add deletePvc if pvcName exists', async () => {
    const resultMock = jest.mocked(fetchInferenceServiceCount);
    resultMock.mockRejectedValue(new Error('Fetch error'));
    (deletePvc as jest.Mock).mockResolvedValue(undefined);
    // Mock listServingRuntimes to return only the current serving runtime (count = 1)
    (listServingRuntimes as jest.Mock).mockResolvedValue([mockServingRuntime]);
    (listNIMServices as jest.Mock).mockResolvedValue([]);
    // Mock getPvc to return a Dashboard-managed PVC (matches naming pattern)
    (getPvc as jest.Mock).mockResolvedValue({
      metadata: { name: 'nim-pvc-abc12', labels: {} },
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await getNIMResourcesToDelete(projectName, mockServingRuntime);

    expect(consoleSpy).toHaveBeenCalledWith(
      `Failed to fetch inference service count for project "${projectName}": Fetch error`,
    );
    expect(listServingRuntimes).toHaveBeenCalledWith(projectName);
    expect(getPvc).toHaveBeenCalledWith(projectName, 'nim-pvc-abc12');
    expect(deletePvc).toHaveBeenCalledWith('nim-pvc-abc12', projectName);
    expect(deleteSecret).not.toHaveBeenCalled();
    expect(result.length).toBe(1); // Only deletePvc
    consoleSpy.mockRestore();
  });

  it('should return an empty array if pvcName does not exist and fetchInferenceServiceCount is 0', async () => {
    const servingRuntimeNoPvc: ServingRuntimeKind = {
      ...mockServingRuntime,
      spec: {
        ...mockServingRuntime.spec,
        volumes: [{ name: 'other-volume', persistentVolumeClaim: { claimName: 'not-nim-pvc' } }],
      },
    };
    const resultMock = jest.mocked(fetchInferenceServiceCount);
    resultMock.mockResolvedValue(0);

    const result = await getNIMResourcesToDelete(projectName, servingRuntimeNoPvc);

    expect(fetchInferenceServiceCount).toHaveBeenCalledWith(projectName);
    expect(deletePvc).not.toHaveBeenCalled();
    expect(result).toEqual([]); // No PVC or secrets to delete
  });
});

describe('fetchNIMAccountTemplateName', () => {
  const dashboardNamespace = 'test-namespace';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the template name when available', async () => {
    const mockAccount = mockNimAccount({ runtimeTemplateName: 'test-template' });
    (listNIMAccounts as jest.Mock).mockResolvedValueOnce([mockAccount]);

    const result = await fetchNIMAccountTemplateName(dashboardNamespace);

    expect(result).toBe('test-template');
    expect(listNIMAccounts).toHaveBeenCalledWith(dashboardNamespace);
  });

  it('should return undefined when no accounts exist', async () => {
    (listNIMAccounts as jest.Mock).mockResolvedValueOnce([]);

    const result = await fetchNIMAccountTemplateName(dashboardNamespace);

    expect(result).toBeUndefined();
    expect(listNIMAccounts).toHaveBeenCalledWith(dashboardNamespace);
  });

  it('should handle errors from listNIMAccounts', async () => {
    const mockError = new Error('Server Error');
    (listNIMAccounts as jest.Mock).mockRejectedValue(mockError);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await fetchNIMAccountTemplateName(dashboardNamespace);

    expect(result).toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `Error fetching NIM account template name: ${mockError.message}`,
    );

    consoleErrorSpy.mockRestore();
  });
});

describe('getNIMOperatorResourcesToDelete', () => {
  const projectName = 'test-project';

  // Mock NIMService with all required fields
  const createMockNIMService = (overrides?: Partial<NIMServiceKind>): NIMServiceKind => ({
    apiVersion: 'apps.nvidia.com/v1alpha1',
    kind: 'NIMService',
    metadata: {
      name: 'test-nim-service',
      namespace: projectName,
    },
    spec: {
      image: {
        repository: 'nvcr.io/nim/meta/llama-3.1-8b-instruct',
        tag: '1.8.5',
        pullSecrets: ['ngc-secret'],
      },
      authSecret: 'nvidia-nim-secrets',
      storage: {
        pvc: {
          name: 'nim-pvc-xyz89',
        },
      },
      replicas: 1,
      ...overrides?.spec,
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add deletePvc to resources if pvcName exists and is Dashboard-managed', async () => {
    const mockNIMService = createMockNIMService();
    const resultMock = jest.mocked(fetchInferenceServiceCount);
    resultMock.mockResolvedValue(0);
    (deletePvc as jest.Mock).mockResolvedValue(undefined);
    (listServingRuntimes as jest.Mock).mockResolvedValue([]);
    (listNIMServices as jest.Mock).mockResolvedValue([]);
    // Mock getPvc to return a Dashboard-managed PVC (has opendatahub.io/managed label)
    (getPvc as jest.Mock).mockResolvedValue({
      metadata: {
        name: 'nim-pvc-xyz89',
        labels: { 'opendatahub.io/managed': 'true' },
      },
    });

    const result = await getNIMOperatorResourcesToDelete(projectName, mockNIMService);

    expect(fetchInferenceServiceCount).toHaveBeenCalledWith(projectName);
    expect(listServingRuntimes).toHaveBeenCalledWith(projectName);
    expect(getPvc).toHaveBeenCalledWith(projectName, 'nim-pvc-xyz89');
    expect(deletePvc).toHaveBeenCalledWith('nim-pvc-xyz89', projectName);
    expect(result.length).toBe(1); // Only deletePvc in resources
  });

  it('should add deleteSecret for both secrets if this is the last InferenceService', async () => {
    const mockNIMService = createMockNIMService();
    const resultMock = jest.mocked(fetchInferenceServiceCount);
    resultMock.mockResolvedValue(1); // This is the last one
    (deletePvc as jest.Mock).mockResolvedValue(undefined);
    (deleteSecret as jest.Mock).mockResolvedValue(undefined);
    (listServingRuntimes as jest.Mock).mockResolvedValue([]);
    (listNIMServices as jest.Mock).mockResolvedValue([]);
    // Mock getPvc to return a Dashboard-managed PVC
    (getPvc as jest.Mock).mockResolvedValue({
      metadata: {
        name: 'nim-pvc-xyz89',
        labels: { 'opendatahub.io/managed': 'true' },
      },
    });

    const result = await getNIMOperatorResourcesToDelete(projectName, mockNIMService);

    expect(fetchInferenceServiceCount).toHaveBeenCalledWith(projectName);
    expect(deletePvc).toHaveBeenCalledWith('nim-pvc-xyz89', projectName);
    expect(deleteSecret).toHaveBeenCalledWith(projectName, 'nvidia-nim-secrets');
    expect(deleteSecret).toHaveBeenCalledWith(projectName, 'ngc-secret');
    expect(result.length).toBe(3); // deletePvc + 2 deleteSecret
  });

  it('should not add deleteSecret if this is not the last InferenceService', async () => {
    const mockNIMService = createMockNIMService();
    const resultMock = jest.mocked(fetchInferenceServiceCount);
    resultMock.mockResolvedValue(2); // Other deployments still exist
    (deletePvc as jest.Mock).mockResolvedValue(undefined);
    (listServingRuntimes as jest.Mock).mockResolvedValue([]);
    (listNIMServices as jest.Mock).mockResolvedValue([]);
    // Mock getPvc to return a Dashboard-managed PVC
    (getPvc as jest.Mock).mockResolvedValue({
      metadata: {
        name: 'nim-pvc-xyz89',
        labels: { 'opendatahub.io/managed': 'true' },
      },
    });

    const result = await getNIMOperatorResourcesToDelete(projectName, mockNIMService);

    expect(fetchInferenceServiceCount).toHaveBeenCalledWith(projectName);
    expect(deletePvc).toHaveBeenCalledWith('nim-pvc-xyz89', projectName);
    expect(deleteSecret).not.toHaveBeenCalled();
    expect(result.length).toBe(1); // Only deletePvc
  });

  it('should not delete PVC if it is user-provided (BYO-PVC)', async () => {
    const mockNIMService = createMockNIMService();
    const resultMock = jest.mocked(fetchInferenceServiceCount);
    resultMock.mockResolvedValue(0);
    (listServingRuntimes as jest.Mock).mockResolvedValue([]);
    (listNIMServices as jest.Mock).mockResolvedValue([]);
    // Mock getPvc to return a user-provided PVC (no managed label, doesn't match naming pattern)
    (getPvc as jest.Mock).mockResolvedValue({
      metadata: {
        name: 'user-provided-pvc',
        labels: {},
      },
    });
    // Override the PVC name to user-provided one
    mockNIMService.spec.storage = {
      pvc: { name: 'user-provided-pvc' },
    };

    const result = await getNIMOperatorResourcesToDelete(projectName, mockNIMService);

    expect(fetchInferenceServiceCount).toHaveBeenCalledWith(projectName);
    expect(getPvc).toHaveBeenCalledWith(projectName, 'user-provided-pvc');
    expect(deletePvc).not.toHaveBeenCalled(); // Should not delete user PVC
    expect(result.length).toBe(0);
  });

  it('should preserve PVC if it is still in use by other deployments', async () => {
    const mockNIMService = createMockNIMService();
    const resultMock = jest.mocked(fetchInferenceServiceCount);
    resultMock.mockResolvedValue(0);
    // Mock listServingRuntimes to return 2 serving runtimes using the same PVC
    const mockServingRuntime1 = mockServingRuntimeK8sResource({});
    mockServingRuntime1.spec.volumes = [
      {
        name: 'nim-pvc-volume',
        persistentVolumeClaim: { claimName: 'nim-pvc-xyz89' },
      },
    ];
    const mockServingRuntime2 = mockServingRuntimeK8sResource({});
    mockServingRuntime2.spec.volumes = [
      {
        name: 'nim-pvc-volume',
        persistentVolumeClaim: { claimName: 'nim-pvc-xyz89' },
      },
    ];
    (listServingRuntimes as jest.Mock).mockResolvedValue([
      mockServingRuntime1,
      mockServingRuntime2,
    ]);
    (listNIMServices as jest.Mock).mockResolvedValue([]); // No NIMServices using it

    const result = await getNIMOperatorResourcesToDelete(projectName, mockNIMService);

    expect(fetchInferenceServiceCount).toHaveBeenCalledWith(projectName);
    expect(listServingRuntimes).toHaveBeenCalledWith(projectName);
    expect(listNIMServices).toHaveBeenCalledWith(projectName);
    expect(deletePvc).not.toHaveBeenCalled(); // PVC still in use
    expect(result.length).toBe(0);
  });

  it('should preserve PVC if it is still in use by other NIMService deployments', async () => {
    const mockNIMService = createMockNIMService();
    mockNIMService.metadata.name = 'nim-service-1';
    mockNIMService.spec.storage = {
      pvc: { name: 'nim-pvc-shared' },
    };
    const resultMock = jest.mocked(fetchInferenceServiceCount);
    resultMock.mockResolvedValue(0);

    // Mock another NIMService using the same PVC
    const anotherNIMService: NIMServiceKind = {
      apiVersion: 'apps.kubeflow.org/v1',
      kind: 'NIMService',
      metadata: {
        name: 'nim-service-2',
        namespace: projectName,
        creationTimestamp: '2024-01-01T00:00:00Z',
      },
      spec: {
        image: {
          repository: 'nvcr.io/nim/meta/llama-3.1-8b-instruct',
          tag: '1.0.0',
        },
        authSecret: 'nvidia-nim-secrets',
        storage: {
          pvc: { name: 'nim-pvc-shared' }, // Same PVC!
        },
      },
    };

    (listServingRuntimes as jest.Mock).mockResolvedValue([]);
    // Return BOTH NIMServices - the one being deleted and another one
    (listNIMServices as jest.Mock).mockResolvedValue([mockNIMService, anotherNIMService]);

    const result = await getNIMOperatorResourcesToDelete(projectName, mockNIMService);

    expect(fetchInferenceServiceCount).toHaveBeenCalledWith(projectName);
    expect(listServingRuntimes).toHaveBeenCalledWith(projectName);
    expect(listNIMServices).toHaveBeenCalledWith(projectName);
    expect(deletePvc).not.toHaveBeenCalled(); // PVC still in use by another NIMService (count = 2)
    expect(result.length).toBe(0);
  });

  it('should preserve PVC if it is in use by deployments from BOTH modes (cross-mode)', async () => {
    const mockNIMService = createMockNIMService();
    mockNIMService.metadata.name = 'nim-operator-deployment';
    mockNIMService.spec.storage = {
      pvc: { name: 'nim-pvc-cross-mode' },
    };
    const resultMock = jest.mocked(fetchInferenceServiceCount);
    resultMock.mockResolvedValue(0);

    // Mock a legacy deployment (ServingRuntime) using the PVC
    const mockServingRuntime = mockServingRuntimeK8sResource({});
    mockServingRuntime.spec.volumes = [
      {
        name: 'nim-pvc-volume',
        persistentVolumeClaim: { claimName: 'nim-pvc-cross-mode' },
      },
    ];

    // Return legacy deployment AND the NIMService being deleted
    (listServingRuntimes as jest.Mock).mockResolvedValue([mockServingRuntime]);
    (listNIMServices as jest.Mock).mockResolvedValue([mockNIMService]);

    const result = await getNIMOperatorResourcesToDelete(projectName, mockNIMService);

    expect(fetchInferenceServiceCount).toHaveBeenCalledWith(projectName);
    expect(listServingRuntimes).toHaveBeenCalledWith(projectName);
    expect(listNIMServices).toHaveBeenCalledWith(projectName);
    expect(deletePvc).not.toHaveBeenCalled(); // PVC still in use by legacy deployment (count = 2)
    expect(result.length).toBe(0);
  });

  it('should handle errors from fetchInferenceServiceCount and still delete PVC', async () => {
    const mockNIMService = createMockNIMService();
    const resultMock = jest.mocked(fetchInferenceServiceCount);
    resultMock.mockRejectedValue(new Error('Fetch error'));
    (deletePvc as jest.Mock).mockResolvedValue(undefined);
    (listServingRuntimes as jest.Mock).mockResolvedValue([]);
    (listNIMServices as jest.Mock).mockResolvedValue([]);
    (getPvc as jest.Mock).mockResolvedValue({
      metadata: {
        name: 'nim-pvc-xyz89',
        labels: { 'opendatahub.io/managed': 'true' },
      },
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await getNIMOperatorResourcesToDelete(projectName, mockNIMService);

    expect(consoleSpy).toHaveBeenCalledWith(
      `Failed to fetch inference service count for project "${projectName}": Fetch error`,
    );
    expect(deletePvc).toHaveBeenCalledWith('nim-pvc-xyz89', projectName);
    expect(deleteSecret).not.toHaveBeenCalled(); // Secrets not deleted due to error
    expect(result.length).toBe(1); // Only deletePvc
    consoleSpy.mockRestore();
  });

  it('should return an empty array if NIMService has no PVC', async () => {
    const mockNIMService = createMockNIMService();
    mockNIMService.spec.storage = {}; // No PVC
    const resultMock = jest.mocked(fetchInferenceServiceCount);
    resultMock.mockResolvedValue(0);

    const result = await getNIMOperatorResourcesToDelete(projectName, mockNIMService);

    expect(fetchInferenceServiceCount).toHaveBeenCalledWith(projectName);
    expect(deletePvc).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('should not delete secrets if they are custom (not Dashboard-created)', async () => {
    const mockNIMService = createMockNIMService();
    // Use custom secret names instead of Dashboard defaults
    mockNIMService.spec.authSecret = 'my-custom-secret';
    mockNIMService.spec.image.pullSecrets = ['my-custom-pull-secret'];

    const resultMock = jest.mocked(fetchInferenceServiceCount);
    resultMock.mockResolvedValue(1); // Last deployment
    (deletePvc as jest.Mock).mockResolvedValue(undefined);
    (listServingRuntimes as jest.Mock).mockResolvedValue([]);
    (listNIMServices as jest.Mock).mockResolvedValue([]);
    (getPvc as jest.Mock).mockResolvedValue({
      metadata: {
        name: 'nim-pvc-xyz89',
        labels: { 'opendatahub.io/managed': 'true' },
      },
    });

    const result = await getNIMOperatorResourcesToDelete(projectName, mockNIMService);

    expect(fetchInferenceServiceCount).toHaveBeenCalledWith(projectName);
    expect(deletePvc).toHaveBeenCalledWith('nim-pvc-xyz89', projectName);
    expect(deleteSecret).not.toHaveBeenCalled(); // Custom secrets should not be deleted
    expect(result.length).toBe(1); // Only deletePvc
  });
});
