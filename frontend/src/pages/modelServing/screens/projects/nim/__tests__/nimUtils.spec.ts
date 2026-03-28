import { ServingRuntimeKind } from '#~/k8sTypes';
import { fetchInferenceServiceCount } from '#~/pages/modelServing/screens/projects/utils';
import { deletePvc, deleteSecret, listNIMAccounts, listServingRuntimes, getPvc } from '#~/api';
import {
  checkPVCUsage,
  fetchNIMAccountTemplateName,
  getNIMResourcesToDelete,
  updateServingRuntimeTemplate,
} from '#~/pages/modelServing/screens/projects/nim/nimUtils';
import { mockNimAccount } from '#~/__mocks__/mockNimAccount';
import { mockServingRuntimeK8sResource } from '#~/__mocks__';

jest.mock('#~/pages/modelServing/screens/projects/utils', () => ({
  fetchInferenceServiceCount: jest.fn(),
}));
jest.mock('#~/api', () => ({
  deletePvc: jest.fn(),
  deleteSecret: jest.fn(),
  listNIMAccounts: jest.fn(),
  listServingRuntimes: jest.fn(),
  getPvc: jest.fn(),
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

describe('spec-less ServingRuntime handling', () => {
  const speclessRuntime = {
    apiVersion: 'serving.kserve.io/v1alpha1',
    kind: 'ServingRuntime',
    metadata: { name: 'no-spec', namespace: 'test-project' },
  } as unknown as ServingRuntimeKind;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getNIMResourcesToDelete', () => {
    it('should return empty array for a spec-less serving runtime', async () => {
      jest.mocked(fetchInferenceServiceCount).mockResolvedValue(0);

      const result = await getNIMResourcesToDelete('test-project', speclessRuntime);

      expect(result).toEqual([]);
      expect(deletePvc).not.toHaveBeenCalled();
      expect(deleteSecret).not.toHaveBeenCalled();
    });
  });

  describe('checkPVCUsage', () => {
    it('should not crash when serving runtimes have no spec', async () => {
      (listServingRuntimes as jest.Mock).mockResolvedValue([speclessRuntime]);

      const result = await checkPVCUsage('nim-pvc-abc12', 'test-project');

      expect(result).toEqual({ count: 0, servingRuntimes: [] });
    });
  });

  describe('updateServingRuntimeTemplate', () => {
    it('should not crash for a spec-less serving runtime', () => {
      expect(() => updateServingRuntimeTemplate(speclessRuntime, 'new-pvc')).not.toThrow();
    });

    it('should return the runtime unchanged for a spec-less runtime', () => {
      const result = updateServingRuntimeTemplate(speclessRuntime, 'new-pvc');
      expect(result.metadata.name).toBe('no-spec');
      expect((result as unknown as Record<string, unknown>).spec).toBeUndefined();
    });
  });
});
