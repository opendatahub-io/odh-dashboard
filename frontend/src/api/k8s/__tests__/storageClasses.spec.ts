import {
  k8sGetResource,
  k8sListResource,
  k8sPatchResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';
import { MetadataAnnotation, StorageClassKind } from '#~/k8sTypes';
import { StorageClassModel } from '#~/api/models';
import { mockStorageClasses } from '#~/__mocks__';
import {
  getStorageClass,
  getStorageClasses,
  updateStorageClassConfig,
} from '#~/api/k8s/storageClasses';
import { getDefaultStorageClassConfig } from '#~/pages/storageClasses/utils.ts';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
  k8sGetResource: jest.fn(),
  k8sPatchResource: jest.fn(),
}));

const mockListResource = jest.mocked(k8sListResource<StorageClassKind>);
const mockGetResource = jest.mocked(k8sGetResource<StorageClassKind>);
const mockPatchResource = jest.mocked(k8sPatchResource<StorageClassKind>);

describe('getStorageClasses', () => {
  it('should fetch and return a list of storage classes', async () => {
    mockListResource.mockResolvedValue(mockK8sResourceList(mockStorageClasses));

    const result = await getStorageClasses();
    expect(mockListResource).toHaveBeenCalledWith({
      model: StorageClassModel,
      queryOptions: {},
    });
    expect(mockListResource).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockStorageClasses);
  });

  it('should handle errors when fetching a list of storage classes', async () => {
    mockListResource.mockRejectedValue(new Error('error1'));

    await expect(getStorageClasses()).rejects.toThrow('error1');
    expect(mockListResource).toHaveBeenCalledTimes(1);
    expect(mockListResource).toHaveBeenCalledWith({
      model: StorageClassModel,
      queryOptions: {},
    });
  });
});

describe('getStorageClass', () => {
  it('should fetch and return a specific storage class', async () => {
    mockGetResource.mockResolvedValue(mockStorageClasses[0]);
    const result = await getStorageClass('openshift-default-sc');
    expect(mockGetResource).toHaveBeenCalledWith({
      model: StorageClassModel,
      queryOptions: { name: 'openshift-default-sc' },
    });
    expect(result).toStrictEqual(mockStorageClasses[0]);
  });

  it('should handle errors when fetching a specific storage class', async () => {
    mockGetResource.mockRejectedValue(new Error('error1'));

    await expect(getStorageClass('openshift-default-sc')).rejects.toThrow('error1');
    expect(mockGetResource).toHaveBeenCalledTimes(1);
    expect(mockGetResource).toHaveBeenCalledWith({
      model: StorageClassModel,
      queryOptions: { name: 'openshift-default-sc' },
    });
  });
});

describe('updateStorageClassConfig', () => {
  it('should add a storage class config if it does not exist', async () => {
    const patchedConfig = {
      isDefault: true,
      isEnabled: true,
      displayName: 'openshift-default-sc',
    };
    const defaultConfig = getDefaultStorageClassConfig(mockStorageClasses[0]);
    const mockedNoConfigStorageClass: StorageClassKind = {
      ...mockStorageClasses[0],
      metadata: {
        ...mockStorageClasses[0].metadata,
        annotations: undefined,
      },
    };
    const returnedValue = {
      ...mockStorageClasses[0],
      metadata: {
        ...mockStorageClasses[0].metadata,
        annotations: {
          ...mockStorageClasses[0].metadata.annotations,
          [MetadataAnnotation.OdhStorageClassConfig]: JSON.stringify({
            ...defaultConfig,
            ...patchedConfig,
          }),
        },
      },
    };
    mockGetResource.mockResolvedValue(mockedNoConfigStorageClass);
    mockPatchResource.mockResolvedValue(returnedValue);
    await updateStorageClassConfig('openshift-default-sc', patchedConfig);
    expect(mockGetResource).toHaveBeenCalledWith({
      model: StorageClassModel,
      queryOptions: {
        name: 'openshift-default-sc',
      },
    });
    expect(mockPatchResource).toHaveBeenCalledWith({
      fetchOptions: {
        requestInit: {},
      },
      model: StorageClassModel,
      queryOptions: {
        name: 'openshift-default-sc',
        queryParams: {},
      },
      patches: [
        {
          op: 'add',
          path: '/metadata/annotations',
          value: {},
        },
        {
          op: 'add',
          path: '/metadata/annotations/opendatahub.io~1sc-config',
          value: expect.anything(),
        },
      ],
    });
    const actualCall = mockPatchResource.mock.calls[0][0];
    const actualValue = actualCall.patches[1].value;
    // Done to prevent type assertions
    if (typeof actualValue === 'string') {
      const actualValueJson = JSON.parse(actualValue);
      expect({ ...actualValueJson, lastModified: expect.anything() }).toStrictEqual({
        ...defaultConfig,
        ...patchedConfig,
        lastModified: expect.anything(),
      });
    } else {
      throw new Error('Actual value is not a string');
    }
    expect(mockGetResource).toHaveBeenCalledTimes(1);
    expect(mockPatchResource).toHaveBeenCalledTimes(1);
  });

  it('should patch a storage class config', async () => {
    const patchedConfig = { isEnabled: false };
    const currentConfig = JSON.parse(
      mockStorageClasses[0].metadata.annotations?.[MetadataAnnotation.OdhStorageClassConfig] || '',
    );
    const returnedValue = {
      ...mockStorageClasses[0],
      metadata: {
        ...mockStorageClasses[0].metadata,
        annotations: {
          ...mockStorageClasses[0].metadata.annotations,
          [MetadataAnnotation.OdhStorageClassConfig]: JSON.stringify({
            ...currentConfig,
            ...patchedConfig,
          }),
        },
      },
    };
    mockGetResource.mockResolvedValue(mockStorageClasses[0]);
    mockPatchResource.mockResolvedValue(returnedValue);
    await updateStorageClassConfig('openshift-default-sc', patchedConfig);
    expect(mockGetResource).toHaveBeenCalledWith({
      model: StorageClassModel,
      queryOptions: {
        name: 'openshift-default-sc',
      },
    });
    expect(mockPatchResource).toHaveBeenCalledWith({
      fetchOptions: {
        requestInit: {},
      },
      model: StorageClassModel,
      queryOptions: {
        name: 'openshift-default-sc',
        queryParams: {},
      },
      patches: [
        {
          op: 'replace',
          path: '/metadata/annotations/opendatahub.io~1sc-config',
          value: expect.anything(),
        },
      ],
    });
    const actualCall = mockPatchResource.mock.calls[0][0];
    const actualValue = actualCall.patches[0].value;
    // Done to prevent type assertions
    if (typeof actualValue === 'string') {
      const actualValueJson = JSON.parse(actualValue);
      expect({ ...actualValueJson, lastModified: expect.anything() }).toStrictEqual({
        ...currentConfig,
        ...patchedConfig,
        lastModified: expect.anything(),
      });
    } else {
      throw new Error('Actual value is not a string');
    }
    expect(mockGetResource).toHaveBeenCalledTimes(1);
    expect(mockPatchResource).toHaveBeenCalledTimes(1);
  });

  it('should patch an invalid storage class config when choosing to repair it', async () => {
    const patchedConfig = {
      isEnabled: true,
    };
    const currentConfig = {
      displayName: 'openshift-default-sc',
      isDefault: true,
      lastModified: new Date().toISOString(),
    };
    const mockedInvalidConfigStorageClass: StorageClassKind = {
      ...mockStorageClasses[0],
      metadata: {
        ...mockStorageClasses[0].metadata,
        annotations: {
          [MetadataAnnotation.OdhStorageClassConfig]: JSON.stringify(currentConfig),
        },
      },
    };
    const returnedValue = {
      ...mockStorageClasses[0],
      metadata: {
        ...mockStorageClasses[0].metadata,
        annotations: {
          ...mockStorageClasses[0].metadata.annotations,
          [MetadataAnnotation.OdhStorageClassConfig]: JSON.stringify({
            ...currentConfig,
            ...patchedConfig,
          }),
        },
      },
    };
    mockGetResource.mockResolvedValue(mockedInvalidConfigStorageClass);
    mockPatchResource.mockResolvedValue(returnedValue);
    await updateStorageClassConfig('openshift-default-sc', patchedConfig);
    expect(mockGetResource).toHaveBeenCalledWith({
      model: StorageClassModel,
      queryOptions: {
        name: 'openshift-default-sc',
      },
    });
    expect(mockPatchResource).toHaveBeenCalledWith({
      fetchOptions: {
        requestInit: {},
      },
      model: StorageClassModel,
      queryOptions: {
        name: 'openshift-default-sc',
        queryParams: {},
      },
      patches: [
        {
          op: 'replace',
          path: '/metadata/annotations/opendatahub.io~1sc-config',
          value: expect.anything(),
        },
      ],
    });
    const actualCall = mockPatchResource.mock.calls[0][0];
    const actualValue = actualCall.patches[0].value;
    // Done to prevent type assertions
    if (typeof actualValue === 'string') {
      const actualValueJson = JSON.parse(actualValue);
      expect({ ...actualValueJson, lastModified: expect.anything() }).toStrictEqual({
        ...currentConfig,
        ...patchedConfig,
        lastModified: expect.anything(),
      });
    } else {
      throw new Error('Actual value is not a string');
    }
    expect(mockGetResource).toHaveBeenCalledTimes(1);
    expect(mockPatchResource).toHaveBeenCalledTimes(1);
  });

  it('should handle errors when patching a storage class config', async () => {
    mockPatchResource.mockRejectedValue(new Error('error1'));
    const config = { isEnabled: false };
    await expect(updateStorageClassConfig('openshift-default-sc', config)).rejects.toThrow(
      'error1',
    );
    expect(mockPatchResource).toHaveBeenCalledWith({
      fetchOptions: {
        requestInit: {},
      },
      model: StorageClassModel,
      queryOptions: {
        name: 'openshift-default-sc',
        queryParams: {},
      },
      patches: [
        {
          op: 'replace',
          path: '/metadata/annotations/opendatahub.io~1sc-config',
          value: expect.anything(),
        },
      ],
    });
    expect(mockGetResource).toHaveBeenCalledTimes(1);
    expect(mockPatchResource).toHaveBeenCalledTimes(1);
  });
});
