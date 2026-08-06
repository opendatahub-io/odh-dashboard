import { k8sDeleteResource } from '@openshift/dynamic-plugin-sdk-utils';
import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';
import { deleteDeployment } from '../LLMdDeployment';
import { LLMInferenceServiceConfigModel, LLMInferenceServiceModel } from '../../types';
import type { LLMdDeployment } from '../../types';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sDeleteResource: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/api/errorUtils', () => ({
  getGenericErrorCode: jest.fn(),
}));

const k8sDeleteResourceMock = jest.mocked(k8sDeleteResource);
const getGenericErrorCodeMock = jest.mocked(getGenericErrorCode);

const mockDeployment = (
  overrides: { name?: string; namespace?: string; baseRefs?: { name?: string }[] } = {},
): LLMdDeployment =>
  ({
    modelServingPlatformId: 'llmd',
    model: {
      kind: 'LLMInferenceService',
      metadata: {
        name: overrides.name ?? 'test-deployment',
        namespace: overrides.namespace ?? 'test-ns',
      },
      spec: {
        baseRefs: overrides.baseRefs,
        model: { uri: 'pvc://model' },
      },
    },
  } as unknown as LLMdDeployment);

describe('deleteDeployment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete only the service when there is no matching config', async () => {
    k8sDeleteResourceMock.mockResolvedValue({});
    const deployment = mockDeployment({ baseRefs: [{ name: 'other-name' }] });

    await deleteDeployment(deployment);

    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      model: LLMInferenceServiceModel,
      queryOptions: { name: 'test-deployment', ns: 'test-ns' },
    });
  });

  it('should delete only the service when baseRefs is undefined', async () => {
    k8sDeleteResourceMock.mockResolvedValue({});
    const deployment = mockDeployment();

    await deleteDeployment(deployment);

    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      model: LLMInferenceServiceModel,
      queryOptions: { name: 'test-deployment', ns: 'test-ns' },
    });
  });

  it('should delete both service and config when a matching config exists', async () => {
    k8sDeleteResourceMock.mockResolvedValue({});
    const deployment = mockDeployment({
      baseRefs: [{ name: 'test-deployment' }],
    });

    await deleteDeployment(deployment);

    expect(k8sDeleteResourceMock).toHaveBeenCalledTimes(2);
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      model: LLMInferenceServiceModel,
      queryOptions: { name: 'test-deployment', ns: 'test-ns' },
    });
    expect(k8sDeleteResourceMock).toHaveBeenCalledWith({
      model: LLMInferenceServiceConfigModel,
      queryOptions: { name: 'test-deployment', ns: 'test-ns' },
    });
  });

  it('should succeed when the config is already gone (404)', async () => {
    const notFoundError = new Error('404 Not Found');
    getGenericErrorCodeMock.mockReturnValue(404);

    k8sDeleteResourceMock.mockImplementation((opts) => {
      if ('model' in opts && opts.model === LLMInferenceServiceConfigModel) {
        return Promise.reject(notFoundError);
      }
      return Promise.resolve({});
    });

    const deployment = mockDeployment({
      baseRefs: [{ name: 'test-deployment' }],
    });

    await expect(deleteDeployment(deployment)).resolves.toBeUndefined();
    expect(getGenericErrorCodeMock).toHaveBeenCalledWith(notFoundError);
  });

  it('should propagate non-404 errors from config deletion', async () => {
    const serverError = new Error('500 Internal Server Error');
    getGenericErrorCodeMock.mockReturnValue(500);

    k8sDeleteResourceMock.mockImplementation((opts) => {
      if ('model' in opts && opts.model === LLMInferenceServiceConfigModel) {
        return Promise.reject(serverError);
      }
      return Promise.resolve({});
    });

    const deployment = mockDeployment({
      baseRefs: [{ name: 'test-deployment' }],
    });

    await expect(deleteDeployment(deployment)).rejects.toThrow(serverError);
  });

  it('should propagate service deletion errors even when config succeeds', async () => {
    const serverError = new Error('500 Internal Server Error');

    k8sDeleteResourceMock.mockImplementation((opts) => {
      if ('model' in opts && opts.model === LLMInferenceServiceModel) {
        return Promise.reject(serverError);
      }
      return Promise.resolve({});
    });

    const deployment = mockDeployment({
      baseRefs: [{ name: 'test-deployment' }],
    });

    await expect(deleteDeployment(deployment)).rejects.toThrow(serverError);
  });
});
