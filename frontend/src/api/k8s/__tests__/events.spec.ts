import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { getNotebookEvents } from '#~/api';
import { EventKind } from '#~/k8sTypes';
import { EventModel } from '#~/api/models';

jest.mock('@openshift/dynamic-plugin-sdk-utils', () => ({
  k8sListResourceItems: jest.fn(),
}));
const k8sListResourceItemsMock = jest.mocked(k8sListResourceItems<EventKind>);
const eventMock: EventKind = {
  apiVersion: 'v1',
  kind: 'Eventkind',
  metadata: {
    uid: 'uid',
  },
  involvedObject: {
    name: 'name',
  },
  lastTimestamp: '',
  eventTime: 'eventTime',
  type: 'Normal',
  reason: 'reason',
  message: 'message',
};

describe('getNotebookEvents', () => {
  it('should list events when podUid is present', async () => {
    k8sListResourceItemsMock.mockResolvedValue([eventMock]);
    const result = await getNotebookEvents('namespace', 'name', 'podUid');
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceItemsMock).toHaveBeenCalledWith({
      model: EventModel,
      queryOptions: {
        ns: 'namespace',
        queryParams: {
          fieldSelector: 'involvedObject.kind=Pod,involvedObject.uid=podUid',
        },
      },
    });
    expect(result).toStrictEqual([eventMock]);
  });
  it('should list events when podUid is not present', async () => {
    k8sListResourceItemsMock.mockResolvedValue([eventMock]);
    const result = await getNotebookEvents('namespace', 'name', undefined);
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceItemsMock).toHaveBeenCalledWith({
      model: EventModel,
      queryOptions: {
        ns: 'namespace',
        queryParams: {
          fieldSelector: 'involvedObject.kind=StatefulSet,involvedObject.name=name',
        },
      },
    });
    expect(result).toStrictEqual([eventMock]);
  });
  it('should handle errors and rethrow', async () => {
    k8sListResourceItemsMock.mockRejectedValue(new Error('error'));
    await expect(getNotebookEvents('namespace', 'name', 'podUid')).rejects.toThrow('error');
    expect(k8sListResourceItemsMock).toHaveBeenCalledTimes(1);
    expect(k8sListResourceItemsMock).toHaveBeenCalledWith({
      model: EventModel,
      queryOptions: {
        ns: 'namespace',
        queryParams: {
          fieldSelector: 'involvedObject.kind=Pod,involvedObject.uid=podUid',
        },
      },
    });
  });
});
