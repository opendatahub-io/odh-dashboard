import { k8sDeleteResource, k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { mockLLMInferenceServiceConfigK8sResource } from '@odh-dashboard/llmd-serving/__mocks__/mockLLMInferenceServiceConfigK8sResource';
import {
  ConfigInUseError,
  deleteLlmInferenceServiceConfigIfUnreferenced,
} from '../LLMInferenceServiceConfigs';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sDeleteResource: jest.fn(),
  k8sGetResource: jest.fn(),
}));

const mockK8sDeleteResource = jest.mocked(k8sDeleteResource);
const mockK8sGetResource = jest.mocked(k8sGetResource);

const defaultConfig = mockLLMInferenceServiceConfigK8sResource({ name: 'router-config' });

describe('deleteLlmInferenceServiceConfigIfUnreferenced', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockK8sGetResource.mockResolvedValue(defaultConfig);
  });

  it('should throw ConfigInUseError when status.referencedBy is populated', async () => {
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

  it('should return blocked-pending when delete returns Status but config is terminating and referenced', async () => {
    mockK8sDeleteResource.mockResolvedValue({
      kind: 'Status',
      status: 'Success',
      code: 200,
      message: '',
      reason: '',
    });
    mockK8sGetResource.mockResolvedValueOnce(defaultConfig).mockResolvedValueOnce({
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

    await expect(
      deleteLlmInferenceServiceConfigIfUnreferenced('router-config', 'opendatahub', 'routing'),
    ).resolves.toBe('blocked-pending');

    expect(mockK8sGetResource).toHaveBeenCalledTimes(2);
  });

  it('should propagate non-404 errors from the post-delete re-fetch', async () => {
    mockK8sDeleteResource.mockResolvedValue({
      kind: 'Status',
      status: 'Success',
      code: 200,
      message: '',
      reason: '',
    });
    const networkError = Object.assign(new Error('Internal Server Error'), { code: 500 });
    mockK8sGetResource.mockResolvedValueOnce(defaultConfig).mockRejectedValueOnce(networkError);

    await expect(
      deleteLlmInferenceServiceConfigIfUnreferenced('router-config', 'opendatahub', 'routing'),
    ).rejects.toBe(networkError);
  });

  it('should return blocked-pending when delete response shows terminating and referenced', async () => {
    mockK8sDeleteResource.mockResolvedValue({
      kind: 'LLMInferenceServiceConfig',
      apiVersion: 'serving.kserve.io/v1alpha2',
      metadata: {
        name: 'router-config',
        namespace: 'opendatahub',
        deletionTimestamp: '2026-08-05T12:00:00Z',
        finalizers: ['serving.kserve.io/llmisvcconfig-finalizer'],
      },
      status: {
        referencedBy: [{ name: 'my-deployment', namespace: 'test-project' }],
      },
      spec: {},
    });

    await expect(
      deleteLlmInferenceServiceConfigIfUnreferenced('router-config', 'opendatahub', 'routing'),
    ).resolves.toBe('blocked-pending');

    expect(mockK8sGetResource).toHaveBeenCalledTimes(1);
  });
});
