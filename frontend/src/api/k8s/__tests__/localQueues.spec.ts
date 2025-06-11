import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { mockLocalQueueK8sResource } from '#~/__mocks__/mockLocalQueueK8sResource';
import { LocalQueueKind } from '#~/k8sTypes';
import { listLocalQueues } from '#~/api/k8s/localQueues';
import { LocalQueueModel } from '#~/api/models/kueue';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResourceItems: jest.fn(),
}));

const k8sListResourceItemsMock = jest.mocked(k8sListResourceItems<LocalQueueKind>);

const mockedLocalQueue = mockLocalQueueK8sResource({
  name: 'test-local-queue',
  namespace: 'test-project',
});

describe('listLocalQueues', () => {
  it('should fetch and return localqueues', async () => {
    k8sListResourceItemsMock.mockResolvedValue([mockedLocalQueue]);
    const result = await listLocalQueues('test-project');
    expect(k8sListResourceItemsMock).toHaveBeenCalledWith({
      model: LocalQueueModel,
      queryOptions: { ns: 'test-project' },
    });
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(result).toStrictEqual([mockedLocalQueue]);
  });

  it('should handle errors and rethrow', async () => {
    k8sListResourceItemsMock.mockRejectedValue(new Error('error1'));
    await expect(listLocalQueues('test-project')).rejects.toThrow('error1');
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceItemsMock).toHaveBeenCalledWith({
      model: LocalQueueModel,
      queryOptions: { ns: 'test-project' },
    });
  });
});
