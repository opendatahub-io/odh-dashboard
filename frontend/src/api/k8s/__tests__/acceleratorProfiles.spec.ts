import { k8sGetResource, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { mockAcceleratorProfile } from '~/__mocks__/mockAcceleratorProfile';
import { AcceleratorProfileModel } from '~/api/models';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { getAcceleratorProfile, listAcceleratorProfiles } from '~/api/k8s/acceleratorProfiles';
import { AcceleratorProfileKind } from '~/k8sTypes';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
  k8sGetResource: jest.fn(),
}));

const mockListResource = jest.mocked(k8sListResource<AcceleratorProfileKind>);
const mockGetResource = jest.mocked(k8sGetResource<AcceleratorProfileKind>);

describe('listAcceleratorProfile', () => {
  it('should fetch and return list of accelerator profile', async () => {
    const namespace = 'test-project';
    mockListResource.mockResolvedValue(
      mockK8sResourceList([mockAcceleratorProfile({ uid: 'test-project-12' })]),
    );

    const result = await listAcceleratorProfiles(namespace);
    expect(mockListResource).toHaveBeenCalledWith({
      model: AcceleratorProfileModel,
      queryOptions: {
        ns: namespace,
      },
    });
    expect(mockListResource).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([mockAcceleratorProfile({ uid: 'test-project-12' })]);
  });

  it('should handle errors when fetching list of accelerator profile', async () => {
    const namespace = 'test-project';
    mockListResource.mockRejectedValue(new Error('error1'));

    await expect(listAcceleratorProfiles(namespace)).rejects.toThrow('error1');
    expect(mockListResource).toHaveBeenCalledTimes(1);
    expect(mockListResource).toHaveBeenCalledWith({
      model: AcceleratorProfileModel,
      queryOptions: {
        ns: namespace,
      },
    });
  });
});

describe('getAcceleratorProfile', () => {
  it('should fetch and return  specific accelerator profile', async () => {
    const namespace = 'test-project';
    const projectName = 'test';
    mockGetResource.mockResolvedValue(mockAcceleratorProfile({ uid: 'test-project-12' }));

    const result = await getAcceleratorProfile(projectName, namespace);
    expect(mockGetResource).toHaveBeenCalledWith({
      model: AcceleratorProfileModel,
      queryOptions: {
        name: projectName,
        ns: namespace,
      },
    });
    expect(mockGetResource).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockAcceleratorProfile({ uid: 'test-project-12' }));
  });

  it('should handle errors when fetching a specific accelerator profile', async () => {
    const namespace = 'test-project';
    const projectName = 'test';
    mockGetResource.mockRejectedValue(new Error('error1'));

    await expect(getAcceleratorProfile(projectName, namespace)).rejects.toThrow('error1');
    expect(mockGetResource).toHaveBeenCalledTimes(1);
    expect(mockGetResource).toHaveBeenCalledWith({
      model: AcceleratorProfileModel,
      queryOptions: {
        name: projectName,
        ns: namespace,
      },
    });
  });
});
