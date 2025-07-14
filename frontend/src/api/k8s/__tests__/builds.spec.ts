import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { BuildConfigModel, BuildModel } from '#~/api/models';
import { getBuildsForBuildConfig, getNotebookBuildConfigs } from '#~/api/k8s/builds';
import { BuildConfigKind, BuildKind } from '#~/k8sTypes';
import { mockK8sResourceList } from '#~/__mocks__/mockK8sResourceList';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));

const mockListResource = jest.mocked(k8sListResource<BuildConfigKind | BuildKind>);

describe('getNotebookBuildConfigs', () => {
  it('should fetch and return list of notebook build config', async () => {
    const namespace = 'test-project';
    const notebookBuildConfigMock = mockK8sResourceList([
      { metadata: { name: 'item 1' } } as BuildConfigKind,
      { metadata: { name: 'item 2' } } as BuildConfigKind,
    ]);
    mockListResource.mockResolvedValue(notebookBuildConfigMock);

    const result = await getNotebookBuildConfigs(namespace);
    expect(mockListResource).toHaveBeenCalledWith({
      model: BuildConfigModel,
      queryOptions: {
        ns: namespace,
        queryParams: { labelSelector: 'opendatahub.io/build_type=notebook_image' },
      },
    });
    expect(mockListResource).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(notebookBuildConfigMock.items);
  });

  it('should handle errors', async () => {
    const namespace = 'test-project';
    mockListResource.mockRejectedValue(new Error('error1'));

    await expect(getNotebookBuildConfigs(namespace)).rejects.toThrow('error1');
    expect(mockListResource).toHaveBeenCalledTimes(1);
    expect(mockListResource).toHaveBeenCalledWith({
      model: BuildConfigModel,
      queryOptions: {
        ns: namespace,
        queryParams: { labelSelector: 'opendatahub.io/build_type=notebook_image' },
      },
    });
  });
});

describe('getBuildsForBuildConfig', () => {
  it('should fetch and return list of builds for build config', async () => {
    const namespace = 'test-project';
    const buildName = 'test';

    const buildConfigMock = mockK8sResourceList([
      { metadata: { name: 'item 1' } } as BuildKind,
      { metadata: { name: 'item 2' } } as BuildKind,
    ]);
    mockListResource.mockResolvedValue(buildConfigMock);

    const result = await getBuildsForBuildConfig(namespace, buildName);
    expect(mockListResource).toHaveBeenCalledWith({
      model: BuildModel,
      queryOptions: {
        ns: namespace,
        queryParams: { labelSelector: `buildconfig=${buildName}` },
      },
    });
    expect(mockListResource).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(buildConfigMock.items);
  });

  it('should handle errors ', async () => {
    const namespace = 'test-project';
    const buildName = 'test';
    mockListResource.mockRejectedValue(new Error('error1'));

    await expect(getBuildsForBuildConfig(namespace, buildName)).rejects.toThrow('error1');
    expect(mockListResource).toHaveBeenCalledTimes(1);
    expect(mockListResource).toHaveBeenCalledWith({
      model: BuildModel,
      queryOptions: {
        ns: namespace,
        queryParams: { labelSelector: `buildconfig=${buildName}` },
      },
    });
  });
});
