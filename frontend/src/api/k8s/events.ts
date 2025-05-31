import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { EventKind } from '#~/k8sTypes';
import { EventModel } from '#~/api/models';
import useK8sWatchResourceList from '#~/utilities/useK8sWatchResourceList';
import { CustomWatchK8sResult } from '#~/types';
import { groupVersionKind } from '..';

export const getNotebookEvents = async (
  namespace: string,
  notebookName: string,
  podUid: string | undefined,
): Promise<EventKind[]> =>
  k8sListResourceItems<EventKind>({
    model: EventModel,
    queryOptions: {
      ns: namespace,
      queryParams: {
        fieldSelector: podUid
          ? `involvedObject.kind=Pod,involvedObject.uid=${podUid}`
          : `involvedObject.kind=StatefulSet,involvedObject.name=${notebookName}`,
      },
    },
  });

export const useWatchNotebookEvents = (
  namespace: string,
  name: string,
  podUid?: string,
): CustomWatchK8sResult<EventKind[]> =>
  useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(EventModel),
      namespace,
      fieldSelector: podUid
        ? `involvedObject.kind=Pod,involvedObject.uid=${podUid}`
        : `involvedObject.kind=StatefulSet,involvedObject.name=${name}`,
    },
    EventModel,
  );
