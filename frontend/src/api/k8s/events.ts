import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { EventKind } from '~/k8sTypes';
import { EventModel } from '~/api/models';

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
