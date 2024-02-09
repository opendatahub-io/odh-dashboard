import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { mockK8sResourceList } from '~/__mocks__/mockK8sResourceList';
import { listUsers } from '~/api';
import { UserKind } from '~/k8sTypes';
import { UserModel } from '~/api/models';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResource: jest.fn(),
}));
const k8sListResourceMock = jest.mocked(k8sListResource<UserKind>);
const userMock: UserKind = {
  apiVersion: 'v1',
  kind: 'userkind',
  metadata: {
    name: 'name',
    namespace: 'namespace',
  },
  groups: [],
};
describe('listUsers', () => {
  it('should list users when label selector is not present', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([userMock]));
    const result = await listUsers();
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: UserModel,
      queryOptions: {},
    });
    expect(result).toStrictEqual([userMock]);
  });
  it('should list users when label selector is present', async () => {
    k8sListResourceMock.mockResolvedValue(mockK8sResourceList([userMock]));
    const result = await listUsers('labelSelector');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: UserModel,
      queryOptions: { queryParams: { labelSelector: 'labelSelector' } },
    });
    expect(result).toStrictEqual([userMock]);
  });
  it('should handle errors and rethrow', async () => {
    k8sListResourceMock.mockRejectedValue(new Error('error'));
    await expect(listUsers()).rejects.toThrow('error');
    expect(k8sListResourceMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceMock).toHaveBeenCalledWith({
      model: UserModel,
      queryOptions: {},
    });
  });
});
