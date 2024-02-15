import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { listGroups } from '~/api';
import { GroupKind } from '~/k8sTypes';
import { GroupModel } from '~/api/models';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));
const k8sListResourceMock = jest.mocked(k8sListResource<GroupKind>);
const groupMock: GroupKind = {
  apiVersion: 'v1',
  kind: 'Groupkind',
  metadata: {
    name: 'name',
    namespace: 'namespace',
  },
  users: [],
};
describe('listGroups', () => {
  it('should list groups when label selector is not present', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([groupMock]));
    const result = await listGroups();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: GroupModel,
      queryOptions: {},
    });
    expect(result).toStrictEqual([groupMock]);
  });
  it('should list groups when label selector is present', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([groupMock]));
    const result = await listGroups('labelSelector');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: GroupModel,
      queryOptions: { queryParams: { labelSelector: 'labelSelector' } },
    });
    expect(result).toStrictEqual([groupMock]);
  });
  it('should handle errors and rethrow', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('error'));
    await expect(listGroups()).rejects.toThrow('error');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: GroupModel,
      queryOptions: {},
    });
  });
});
