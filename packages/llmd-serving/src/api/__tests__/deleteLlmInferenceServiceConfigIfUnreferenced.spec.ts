import { k8sDeleteResource, k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import { mockLLMInferenceServiceK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceK8sResource';
import { ROUTING_CONFIG_REF_ANNOTATION } from '../../const';
import { listAllLLMInferenceServices } from '../LLMInferenceService';
import {
  ConfigInUseError,
  deleteLlmInferenceServiceConfigIfUnreferenced,
} from '../LLMInferenceServiceConfigs';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sDeleteResource: jest.fn(),
  k8sGetResource: jest.fn(),
}));

jest.mock('../LLMInferenceService', () => ({
  listAllLLMInferenceServices: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/api/errorUtils', () => ({
  getGenericErrorCode: jest.fn(),
}));

const mockListAllLLMInferenceServices = jest.mocked(listAllLLMInferenceServices);
const mockK8sDeleteResource = jest.mocked(k8sDeleteResource);
const mockK8sGetResource = jest.mocked(k8sGetResource);
const { getGenericErrorCode } = jest.requireMock('@odh-dashboard/internal/api/errorUtils');

const defaultConfig = mockLLMInferenceServiceConfigK8sResource({ name: 'router-config' });

describe('deleteLlmInferenceServiceConfigIfUnreferenced', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListAllLLMInferenceServices.mockResolvedValue([]);
    mockK8sGetResource.mockResolvedValue(defaultConfig);
    getGenericErrorCode.mockReturnValue(undefined);
  });

  it('should throw ConfigInUseError when status.referencedBy is populated and deployment list is unavailable', async () => {
    mockListAllLLMInferenceServices.mockRejectedValue(new Error('Forbidden'));
    getGenericErrorCode.mockReturnValue(403);
    mockK8sGetResource.mockResolvedValue({
      ...defaultConfig,
      status: {
        referencedBy: [{ name: 'my-deployment', namespace: 'test-project' }],
      },
    });

    await expect(
      deleteLlmInferenceServiceConfigIfUnreferenced('router-config', 'opendatahub', 'routing'),
    ).rejects.toBeInstanceOf(ConfigInUseError);

    expect(mockK8sDeleteResource).not.toHaveBeenCalled();
  });

  it('should allow delete when status.referencedBy is stale but no deployments reference the config', async () => {
    mockK8sGetResource.mockResolvedValue({
      ...defaultConfig,
      status: {
        referencedBy: [{ name: 'my-deployment', namespace: 'test-project' }],
      },
    });
    mockK8sDeleteResource.mockResolvedValue({
      kind: 'Status',
      status: 'Success',
      code: 200,
      message: '',
      reason: '',
    });

    await expect(
      deleteLlmInferenceServiceConfigIfUnreferenced('router-config', 'opendatahub', 'routing'),
    ).resolves.toBe('deleted');
  });

  it('should throw ConfigInUseError when a deployment references the config', async () => {
    mockListAllLLMInferenceServices.mockResolvedValue([
      mockLLMInferenceServiceK8sResource({
        name: 'deployment-a',
        additionalAnnotations: { [ROUTING_CONFIG_REF_ANNOTATION]: 'router-config' },
      }),
    ]);

    await expect(
      deleteLlmInferenceServiceConfigIfUnreferenced('router-config', 'opendatahub', 'routing'),
    ).rejects.toBeInstanceOf(ConfigInUseError);

    expect(mockK8sDeleteResource).not.toHaveBeenCalled();
  });

  it('should delete the config when it is not referenced', async () => {
    mockK8sDeleteResource.mockResolvedValue({
      kind: 'Status',
      status: 'Success',
      code: 200,
      message: '',
      reason: '',
    });

    await expect(
      deleteLlmInferenceServiceConfigIfUnreferenced('router-config', 'opendatahub', 'routing'),
    ).resolves.toBe('deleted');
  });

  it('should still attempt delete when deployment list is forbidden and status is unreferenced', async () => {
    mockListAllLLMInferenceServices.mockRejectedValue(new Error('Forbidden'));
    getGenericErrorCode.mockReturnValue(403);
    mockK8sDeleteResource.mockResolvedValue({
      kind: 'Status',
      status: 'Success',
      code: 200,
      message: '',
      reason: '',
    });

    await expect(
      deleteLlmInferenceServiceConfigIfUnreferenced('router-config', 'opendatahub', 'routing'),
    ).resolves.toBe('deleted');
  });

  it('should throw ConfigInUseError before delete when a deployment still references the config', async () => {
    mockListAllLLMInferenceServices.mockResolvedValue([
      mockLLMInferenceServiceK8sResource({
        name: 'my-deployment',
        additionalAnnotations: { [ROUTING_CONFIG_REF_ANNOTATION]: 'router-config' },
      }),
    ]);
    mockK8sGetResource.mockResolvedValue({
      ...defaultConfig,
      status: {
        referencedBy: [{ name: 'my-deployment', namespace: 'test-project' }],
      },
    });

    await expect(
      deleteLlmInferenceServiceConfigIfUnreferenced('router-config', 'opendatahub', 'routing'),
    ).rejects.toBeInstanceOf(ConfigInUseError);

    expect(mockK8sDeleteResource).not.toHaveBeenCalled();
  });

  it('should treat terminating delete responses as success when the config is not referenced', async () => {
    mockK8sDeleteResource.mockResolvedValue({
      kind: 'LLMInferenceServiceConfig',
      apiVersion: 'serving.kserve.io/v1alpha2',
      metadata: {
        name: 'router-config',
        namespace: 'opendatahub',
        deletionTimestamp: '2026-08-05T12:00:00Z',
        finalizers: ['serving.kserve.io/llmisvcconfig-finalizer'],
      },
      spec: {},
    });

    await expect(
      deleteLlmInferenceServiceConfigIfUnreferenced('router-config', 'opendatahub', 'routing'),
    ).resolves.toBe('deleted');
  });

  it('should allow delete when config is terminating with stale referencedBy after deployment removal', async () => {
    mockK8sGetResource.mockResolvedValue({
      ...defaultConfig,
      metadata: {
        ...defaultConfig.metadata,
        deletionTimestamp: '2026-08-05T12:00:00Z',
        finalizers: ['serving.kserve.io/llmisvcconfig-finalizer'],
      },
      status: {
        referencedBy: [{ name: 'my-deployment', namespace: 'test-project' }],
      },
    });
    mockK8sDeleteResource.mockResolvedValue({
      kind: 'Status',
      status: 'Success',
      code: 200,
      message: '',
      reason: '',
    });

    await expect(
      deleteLlmInferenceServiceConfigIfUnreferenced('router-config', 'opendatahub', 'routing'),
    ).resolves.toBe('deleted');
  });

  it('should return blocked-pending when deployment list is unavailable and config remains referenced after delete', async () => {
    mockListAllLLMInferenceServices.mockRejectedValue(new Error('Forbidden'));
    getGenericErrorCode.mockReturnValue(403);
    mockK8sGetResource
      .mockResolvedValueOnce({
        ...defaultConfig,
        status: {
          referencedBy: [],
        },
      })
      .mockResolvedValueOnce({
        ...defaultConfig,
        metadata: {
          ...defaultConfig.metadata,
          deletionTimestamp: '2026-08-05T12:00:00Z',
          finalizers: ['serving.kserve.io/llmisvcconfig-finalizer'],
        },
        status: {
          referencedBy: [{ name: 'my-deployment', namespace: 'test-project' }],
        },
      });
    mockK8sDeleteResource.mockResolvedValue({
      kind: 'Status',
      status: 'Success',
      code: 200,
      message: '',
      reason: '',
    });

    await expect(
      deleteLlmInferenceServiceConfigIfUnreferenced('router-config', 'opendatahub', 'routing'),
    ).resolves.toBe('blocked-pending');
  });

  it('should throw ConfigInUseError before delete when deployment list is unavailable and status shows references', async () => {
    mockListAllLLMInferenceServices.mockRejectedValue(new Error('Forbidden'));
    getGenericErrorCode.mockReturnValue(403);
    mockK8sGetResource.mockResolvedValue({
      ...defaultConfig,
      status: {
        referencedBy: [{ name: 'my-deployment', namespace: 'test-project' }],
      },
    });

    await expect(
      deleteLlmInferenceServiceConfigIfUnreferenced('router-config', 'opendatahub', 'routing'),
    ).rejects.toBeInstanceOf(ConfigInUseError);

    expect(mockK8sDeleteResource).not.toHaveBeenCalled();
  });
});
