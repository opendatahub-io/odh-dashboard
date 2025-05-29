import { ServingRuntimeKind } from '#~/k8sTypes';
import { fetchInferenceServiceCount } from '#~/pages/modelServing/screens/projects/utils';
import { deletePvc, deleteSecret, listNIMAccounts } from '#~/api';
import {
  fetchNIMAccountTemplateName,
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
  listNIMAccounts: jest.fn(),
}));
describe('getNIMResourcesToDelete', () => {
  const projectName = 'test-project';
  const mockServingRuntime = mockServingRuntimeK8sResource({});

  mockServingRuntime.spec.volumes = [
    {
      name: 'nim-pvc-volume',
      persistentVolumeClaim: { claimName: 'nim-pvc-123' },
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

    const result = await getNIMResourcesToDelete(projectName, mockServingRuntime);

    expect(fetchInferenceServiceCount).toHaveBeenCalledWith(projectName);
    expect(deletePvc).toHaveBeenCalledWith('nim-pvc-123', projectName);
    expect(result.length).toBe(1); // Only deletePvc in resources
  });

  it('should add deleteSecret for both secrets if count is 1', async () => {
    const resultMock = jest.mocked(fetchInferenceServiceCount);
    resultMock.mockResolvedValue(1);
    (deletePvc as jest.Mock).mockResolvedValue(undefined);
    (deleteSecret as jest.Mock).mockResolvedValue(undefined);

    const result = await getNIMResourcesToDelete(projectName, mockServingRuntime);

    expect(fetchInferenceServiceCount).toHaveBeenCalledWith(projectName);
    expect(deletePvc).toHaveBeenCalledWith('nim-pvc-123', projectName);
    expect(deleteSecret).toHaveBeenCalledWith(projectName, 'nvidia-nim-secrets');
    expect(deleteSecret).toHaveBeenCalledWith(projectName, 'ngc-secret');
    expect(result.length).toBe(3); // deletePvc + 2 deleteSecret
  });

  it('should not add deleteSecret if count is not 1', async () => {
    const resultMock = jest.mocked(fetchInferenceServiceCount);
    resultMock.mockResolvedValue(2);
    (deletePvc as jest.Mock).mockResolvedValue(undefined);

    const result = await getNIMResourcesToDelete(projectName, mockServingRuntime);

    expect(fetchInferenceServiceCount).toHaveBeenCalledWith(projectName);
    expect(deletePvc).toHaveBeenCalledWith('nim-pvc-123', projectName);
    expect(deleteSecret).not.toHaveBeenCalled();
    expect(result.length).toBe(1); // Only deletePvc
  });

  it('should handle errors from fetchInferenceServiceCount and still add deletePvc if pvcName exists', async () => {
    const resultMock = jest.mocked(fetchInferenceServiceCount);
    resultMock.mockRejectedValue(new Error('Fetch error'));
    (deletePvc as jest.Mock).mockResolvedValue(undefined);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await getNIMResourcesToDelete(projectName, mockServingRuntime);

    expect(consoleSpy).toHaveBeenCalledWith(
      `Failed to fetch inference service count for project "${projectName}": Fetch error`,
    );
    expect(deletePvc).toHaveBeenCalledWith('nim-pvc-123', projectName);
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
