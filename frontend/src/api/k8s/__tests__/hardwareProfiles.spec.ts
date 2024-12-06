import { k8sGetResource, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { HardwareProfileKind } from '~/k8sTypes';
import { HardwareProfileModel } from '~/api/models';
import { getHardwareProfile, listHardwareProfiles } from '~/api/k8s/hardwareProfiles';
import { mockHardwareProfile } from '~/__mocks__/mockHardwareProfile';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
  k8sGetResource: jest.fn(),
}));

const mockListResource = jest.mocked(k8sListResource<HardwareProfileKind>);
const mockGetResource = jest.mocked(k8sGetResource<HardwareProfileKind>);

describe('listHardwareProfile', () => {
  it('should fetch and return list of hardware profile', async () => {
    const namespace = 'test-project';
    mockListResource.mockResolvedValue(
      mockK8sResourceList([mockHardwareProfile({ uid: 'test-project-12' })]),
    );

    const result = await listHardwareProfiles(namespace);
    expect(mockListResource).toHaveBeenCalledWith({
      model: HardwareProfileModel,
      queryOptions: {
        ns: namespace,
      },
    });
    expect(mockListResource).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([mockHardwareProfile({ uid: 'test-project-12' })]);
  });

  it('should handle errors when fetching list of hardware profile', async () => {
    const namespace = 'test-project';
    mockListResource.mockRejectedValue(new Error('error1'));

    await expect(listHardwareProfiles(namespace)).rejects.toThrow('error1');
    expect(mockListResource).toHaveBeenCalledTimes(1);
    expect(mockListResource).toHaveBeenCalledWith({
      model: HardwareProfileModel,
      queryOptions: {
        ns: namespace,
      },
    });
  });
});

describe('getHardwareProfile', () => {
  it('should fetch and return  specific hardware profile', async () => {
    const namespace = 'test-project';
    const projectName = 'test';
    mockGetResource.mockResolvedValue(mockHardwareProfile({ uid: 'test-project-12' }));

    const result = await getHardwareProfile(projectName, namespace);
    expect(mockGetResource).toHaveBeenCalledWith({
      model: HardwareProfileModel,
      queryOptions: {
        name: projectName,
        ns: namespace,
      },
    });
    expect(mockGetResource).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual(mockHardwareProfile({ uid: 'test-project-12' }));
  });

  it('should handle errors when fetching a specific hardware profile', async () => {
    const namespace = 'test-project';
    const projectName = 'test';
    mockGetResource.mockRejectedValue(new Error('error1'));

    await expect(getHardwareProfile(projectName, namespace)).rejects.toThrow('error1');
    expect(mockGetResource).toHaveBeenCalledTimes(1);
    expect(mockGetResource).toHaveBeenCalledWith({
      model: HardwareProfileModel,
      queryOptions: {
        name: projectName,
        ns: namespace,
      },
    });
  });
});
